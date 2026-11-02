import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import { rebuildScheduleSlots } from "@/app/lib/crownlink/rebuildScheduleSlots";
import { sendMatchApprovedDiscordNotifications } from "@/app/lib/crownlink/sendMatchApprovedDiscordNotifications";

type Creator = {
  userId: string;
  agencyId: string | null;
  diamonds: number;
};

type Slot = {
  id: string;
  event_date_id: string;
  slot_time: string;
};

type Match = {
  id: string;
  creator_one_id: string;
  creator_two_id: string;
  event_date_id: string | null;
  schedule_slot_id: string | null;
  status: string;
};

type ProposedMatch = {
  event_id: string;
  event_date_id: string;
  schedule_slot_id: string;
  creator_one_id: string;
  creator_two_id: string;
  status: "approved";
  approved_at: string;
};

type Plan = {
  matches: ProposedMatch[];
  unmatchedCreatorIds: string[];
};

const normalizeTime = (value: string) => value.slice(0, 8);
const pairKey = (a: string, b: string) => [a, b].sort().join("|");

function pairPenalty(a: Creator, b: Creator, priorPairs: Set<string>): number {
  const diamondGap = Math.abs(a.diamonds - b.diamonds);
  const repeat = priorPairs.has(pairKey(a.userId, b.userId)) ? 25000 : 0;
  const sameAgency = a.agencyId && b.agencyId && a.agencyId === b.agencyId
    ? 10000
    : 0;
  return diamondGap + repeat + sameAgency;
}

/**
 * Solve all available slots for a single date together rather than greedily.
 * The objective is lexicographic: maximize scheduled creators first, then
 * minimize pairing penalties. Blocked times are hard restrictions.
 *
 * The bitmask solver is intentionally capped to keep API latency bounded.
 */
function planDate(
  eventId: string,
  eventDateId: string,
  creators: Creator[],
  slots: Slot[],
  blocked: Map<string, Set<string>>,
  priorPairs: Set<string>
): Plan {
  if (creators.length > 18 || slots.length > 18) {
    throw new Error(
      "This event exceeds the safe automatic matching limit (18 remaining creators or 18 open slots per date). No new matches were saved."
    );
  }

  const canUse = (creator: Creator, slot: Slot) =>
    !blocked.get(`${eventDateId}|${creator.userId}`)?.has(normalizeTime(slot.slot_time));

  type Choice = { first: number; second: number } | null;
  type State = { matched: number; penalty: number; choice: Choice };
  const memo = new Map<string, State>();

  function solve(slotIndex: number, usedMask: number): State {
    if (slotIndex === slots.length) {
      return { matched: 0, penalty: 0, choice: null };
    }
    const key = `${slotIndex}|${usedMask}`;
    const cached = memo.get(key);
    if (cached) return cached;

    const skip = solve(slotIndex + 1, usedMask);
    let best: State = { matched: skip.matched, penalty: skip.penalty, choice: null };
    const slot = slots[slotIndex];

    for (let i = 0; i < creators.length; i++) {
      if ((usedMask & (1 << i)) || !canUse(creators[i], slot)) continue;
      for (let j = i + 1; j < creators.length; j++) {
        if ((usedMask & (1 << j)) || !canUse(creators[j], slot)) continue;
        const next = solve(slotIndex + 1, usedMask | (1 << i) | (1 << j));
        const matched = next.matched + 2;
        const penalty = next.penalty + pairPenalty(creators[i], creators[j], priorPairs);
        if (matched > best.matched || (matched === best.matched && penalty < best.penalty)) {
          best = { matched, penalty, choice: { first: i, second: j } };
        }
      }
    }
    memo.set(key, best);
    return best;
  }

  solve(0, 0);
  const matches: ProposedMatch[] = [];
  let usedMask = 0;
  for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
    const state = memo.get(`${slotIndex}|${usedMask}`);
    const choice = state?.choice;
    if (!choice) continue;
    const first = creators[choice.first];
    const second = creators[choice.second];
    matches.push({
      event_id: eventId,
      event_date_id: eventDateId,
      schedule_slot_id: slots[slotIndex].id,
      creator_one_id: first.userId,
      creator_two_id: second.userId,
      status: "approved",
      approved_at: new Date().toISOString(),
    });
    usedMask |= (1 << choice.first) | (1 << choice.second);
  }

  return {
    matches,
    unmatchedCreatorIds: creators
      .filter((_, index) => !(usedMask & (1 << index)))
      .map((creator) => creator.userId),
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { data: userRoles, error: roleError } = await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id);
    if (roleError) throw new Error(roleError.message);
    if (!(userRoles ?? []).some((role) => role.role === "admin" && role.status === "active")) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = await request.json();
    const eventId = typeof body.eventId === "string" ? body.eventId.trim() : "";
    const preview = body.preview === true;
    if (!eventId) return NextResponse.json({ error: "Event ID is required." }, { status: 400 });

    const db = createAdminClient();
    const { data: event, error: eventError } = await db
      .from("crownlink_events")
      .select("id, name, status")
      .eq("id", eventId)
      .single();
    if (eventError || !event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    if (event.status !== "active") {
      return NextResponse.json({ error: "Only active events can be matched." }, { status: 400 });
    }

    // Preview must not rebuild slots because that operation can write to the DB.
    if (!preview) await rebuildScheduleSlots(db, eventId);

    const [dateResult, signupResult, slotResult, blockedResult, matchResult] = await Promise.all([
      db.from("crownlink_event_dates").select("id, event_date")
        .eq("event_id", eventId).order("event_date", { ascending: true }),
      db.from("crownlink_event_signups").select("user_id")
        .eq("event_id", eventId).eq("status", "signed_up"),
      db.from("crownlink_schedule_slots").select("id, event_date_id, slot_time")
        .eq("event_id", eventId).order("slot_time", { ascending: true }),
      db.from("crownlink_event_unavailable_times")
        .select("event_date_id, user_id, blocked_time").eq("event_id", eventId),
      db.from("crownlink_matches")
        .select("id, creator_one_id, creator_two_id, event_date_id, schedule_slot_id, status")
        .eq("event_id", eventId).in("status", ["suggested", "approved"]),
    ]);
    for (const result of [dateResult, signupResult, slotResult, blockedResult, matchResult]) {
      if (result.error) throw new Error(result.error.message);
    }

    const dates = dateResult.data ?? [];
    const signups = signupResult.data ?? [];
    const slots: Slot[] = slotResult.data ?? [];
    const existing: Match[] = matchResult.data ?? [];
    if (!dates.length) return NextResponse.json({ error: "No required battle dates." }, { status: 400 });
    if (!signups.length) return NextResponse.json({ error: "No active signups." }, { status: 400 });
    if (!slots.length) return NextResponse.json({ error: "No schedule slots available." }, { status: 400 });
    if (existing.some((match) => !match.event_date_id || !match.schedule_slot_id)) {
      return NextResponse.json({
        error: "Existing legacy matches have no date or slot. Review them before generating matches. Nothing was saved.",
      }, { status: 409 });
    }

    const ids = [...new Set(signups.map((signup) => signup.user_id))];
    const [roleResult, profileResult] = await Promise.all([
      db.from("user_roles").select("user_id, agency_id, role, status").in("user_id", ids),
      db.from("crownlink_profiles").select("user_id, diamond_level").in("user_id", ids),
    ]);
    if (roleResult.error) throw new Error(roleResult.error.message);
    if (profileResult.error) throw new Error(profileResult.error.message);

    // Active creators and agents may participate when signed up.
    // This affects matchmaking eligibility only; account roles are unchanged.
    // Prefer the creator role when a user has both active roles.
    const eligibleRoles = new Map(
      (roleResult.data ?? [])
        .filter((role) =>
          role.status === "active" &&
          (role.role === "creator" || role.role === "agent")
        )
        .sort((a, b) =>
          (a.role === "creator" ? 1 : 0) - (b.role === "creator" ? 1 : 0)
        )
        .map((role) => [role.user_id, role])
    );
    const profiles = new Map((profileResult.data ?? []).map((profile) => [profile.user_id, profile]));
    const excludedCreatorIds = ids.filter((id) => !eligibleRoles.has(id));
    const creators: Creator[] = ids
      .filter((id) => eligibleRoles.has(id))
      .map((id) => ({
        userId: id,
        agencyId: eligibleRoles.get(id)?.agency_id ?? null,
        diamonds: Number(profiles.get(id)?.diamond_level ?? 0),
      }));
    if (creators.length < 2) {
      return NextResponse.json({ error: "Not enough eligible creators.", excludedCreatorIds }, { status: 400 });
    }

    const blocked = new Map<string, Set<string>>();
    for (const row of blockedResult.data ?? []) {
      const key = `${row.event_date_id}|${row.user_id}`;
      if (!blocked.has(key)) blocked.set(key, new Set());
      blocked.get(key)!.add(normalizeTime(row.blocked_time));
    }

    const usedPairs = new Set(existing.map((match) => pairKey(match.creator_one_id, match.creator_two_id)));
    const proposed: ProposedMatch[] = [];
    const incompleteDates: Array<{
      eventDateId: string;
      eventDate: string;
      unmatchedCreatorIds: string[];
    }> = [];

    for (const date of dates) {
      const dateExisting = existing.filter((match) => match.event_date_id === date.id);
      const occupiedCreators = new Set(dateExisting.flatMap((match) => [match.creator_one_id, match.creator_two_id]));
      const occupiedSlots = new Set(dateExisting.map((match) => match.schedule_slot_id));
      const remainingCreators = creators.filter((creator) => !occupiedCreators.has(creator.userId));
      const openSlots = slots.filter((slot) => slot.event_date_id === date.id && !occupiedSlots.has(slot.id));
      const result = planDate(eventId, date.id, remainingCreators, openSlots, blocked, usedPairs);
      proposed.push(...result.matches);
      for (const match of result.matches) {
        usedPairs.add(pairKey(match.creator_one_id, match.creator_two_id));
      }
      if (result.unmatchedCreatorIds.length) {
        incompleteDates.push({
          eventDateId: date.id,
          eventDate: date.event_date,
          unmatchedCreatorIds: result.unmatchedCreatorIds,
        });
      }
    }

    const summary = {
      eventName: event.name,
      preview,
      requiredDates: dates.length,
      signupCount: ids.length,
      creatorCount: creators.length,
      excludedCreatorIds,
      existingMatches: existing.length,
      matchesProposed: proposed.length,
      scheduleComplete: incompleteDates.length === 0 && excludedCreatorIds.length === 0,
      incompleteDates,
      proposedMatches: proposed.map((match) => ({
        eventDateId: match.event_date_id,
        scheduleSlotId: match.schedule_slot_id,
        creatorOneId: match.creator_one_id,
        creatorTwoId: match.creator_two_id,
      })),
    };

    if (preview) {
      return NextResponse.json({ success: true, matchesCreated: 0, ...summary });
    }

    // Prevent concurrent runs from silently assigning a creator twice.
    // This is a best-effort check; a database unique constraint or transaction
    // is needed for strict concurrency protection.
    const { data: latestMatches, error: latestError } = await db
      .from("crownlink_matches").select("id")
      .eq("event_id", eventId).in("status", ["suggested", "approved"]);
    if (latestError) throw new Error(latestError.message);
    const originalIds = new Set(existing.map((match) => match.id));
    if ((latestMatches ?? []).some((match) => !originalIds.has(match.id)) || latestMatches?.length !== existing.length) {
      return NextResponse.json({ error: "Matches changed during generation. Refresh and retry." }, { status: 409 });
    }

    let created: Array<ProposedMatch & { id: string }> = [];
    if (proposed.length) {
      const { data, error } = await db.from("crownlink_matches").insert(proposed).select();
      if (error) throw new Error(error.message);
      created = (data ?? []) as Array<ProposedMatch & { id: string }>;
    }

    // Existing behavior: notify only after the new matches are saved.
    const notificationResults = await Promise.allSettled(
      created.map((match) => sendMatchApprovedDiscordNotifications(match.id))
    );
    const notifications = notificationResults.reduce(
      (acc, result) => {
        if (result.status === "fulfilled") {
          acc.sent += result.value.sent;
          acc.skipped += result.value.skipped;
          acc.failed += result.value.failed;
        } else {
          acc.failed += 1;
        }
        return acc;
      },
      { sent: 0, skipped: 0, failed: 0 }
    );

    return NextResponse.json({
      success: true,
      ...summary,
      matchesCreated: created.length,
      notifications,
      message: summary.scheduleComplete
        ? "Matches generated for all eligible creators on every required date."
        : "Matches generated, but some creators remain unmatched. Review incomplete dates and excluded creators.",
    });
  } catch (error) {
    console.error("GENERATE MATCHES ERROR:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unexpected server error.",
    }, { status: 500 });
  }
}
