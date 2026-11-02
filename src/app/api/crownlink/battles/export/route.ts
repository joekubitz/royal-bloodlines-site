
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

function formatDateTime(dateString: string, timeString: string): string {
  const [year, month, day] = dateString.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));

  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  const [hourText, minuteText = "00"] = timeString.split(":");
  const hour24 = Number(hourText);
  const hour12 = hour24 % 12 || 12;

  return `${formattedDate} ${hour12}:${minuteText} ${hour24 >= 12 ? "PM" : "AM"}`;
}

export async function GET(request: Request) {
  try {
    const eventId = new URL(request.url).searchParams.get("eventId")?.trim();

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const db = createAdminClient();

    const { data: roles, error: roleError } = await db
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id);

    if (roleError) {
      return NextResponse.json(
        { error: "Could not verify admin access." },
        { status: 500 }
      );
    }

    if (
      !(roles ?? []).some(
        (role) => role.role === "admin" && role.status === "active"
      )
    ) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const { data: event, error: eventError } = await db
      .from("crownlink_events")
      .select("id, name")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 }
      );
    }

    const { data: matches, error: matchesError } = await db
      .from("crownlink_matches")
      .select(`
        id,
        event_id,
        event_date_id,
        schedule_slot_id,
        creator_one_id,
        creator_two_id,
        creator_one_score,
        creator_two_score,
        status
      `)
      .eq("event_id", eventId)
      .eq("status", "approved");

    if (matchesError) {
      throw new Error(`Could not load matches: ${matchesError.message}`);
    }

    if (!matches?.length) {
      return NextResponse.json(
        { error: "No approved battles were found for this event." },
        { status: 400 }
      );
    }

    const dateIds = [
      ...new Set(
        matches
          .map((match) => match.event_date_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const slotIds = [
      ...new Set(
        matches
          .map((match) => match.schedule_slot_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const creatorIds = [
      ...new Set(
        matches.flatMap((match) => [
          match.creator_one_id,
          match.creator_two_id,
        ])
      ),
    ];

    const [dateResult, slotResult, profileResult] = await Promise.all([
      db
        .from("crownlink_event_dates")
        .select("id, event_date")
        .in("id", dateIds),

      db
        .from("crownlink_schedule_slots")
        .select("id, event_date_id, slot_time")
        .in("id", slotIds),

      db
        .from("crownlink_profiles")
        .select(
          "user_id, display_name, tiktok_username, agent_user_id"
        )
        .in("user_id", creatorIds),
    ]);

    if (dateResult.error) {
      throw new Error(
        `Could not load battle dates: ${dateResult.error.message}`
      );
    }

    if (slotResult.error) {
      throw new Error(
        `Could not load battle slots: ${slotResult.error.message}`
      );
    }

    if (profileResult.error) {
      throw new Error(
        `Could not load creator profiles: ${profileResult.error.message}`
      );
    }

    const dates = new Map(
      (dateResult.data ?? []).map((date) => [
        date.id,
        date.event_date,
      ])
    );

    const slots = new Map(
      (slotResult.data ?? []).map((slot) => [
        slot.id,
        slot,
      ])
    );

    const profiles = new Map(
      (profileResult.data ?? []).map((profile) => [
        profile.user_id,
        profile,
      ])
    );

    // Stop the export if any approved battle has an invalid
    // scheduled date or time.
    const unresolved = matches.filter((match) => {
      const slot = match.schedule_slot_id
        ? slots.get(match.schedule_slot_id)
        : null;

      return (
        !match.event_date_id ||
        !dates.has(match.event_date_id) ||
        !slot ||
        slot.event_date_id !== match.event_date_id ||
        !slot.slot_time
      );
    });

    if (unresolved.length) {
      return NextResponse.json(
        {
          error: `${unresolved.length} approved battle(s) are missing a valid scheduled date or time. Export stopped to avoid incorrect dates.`,
          matchIds: unresolved.map((match) => match.id),
        },
        { status: 409 }
      );
    }

    const agentIds = [
      ...new Set(
        (profileResult.data ?? [])
          .map((profile) => profile.agent_user_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const { data: agentProfiles, error: agentError } =
      agentIds.length > 0
        ? await db
            .from("crownlink_profiles")
            .select("user_id, display_name, tiktok_username")
            .in("user_id", agentIds)
        : { data: [], error: null };

    if (agentError) {
      throw new Error(
        `Could not load agent profiles: ${agentError.message}`
      );
    }

    const agents = new Map(
      (agentProfiles ?? []).map((agent) => [
        agent.user_id,
        agent,
      ])
    );

    // Use TikTok @usernames for both Creator and Opponent.
    // Fall back to display name only when no username exists.
    const getCreatorName = (id: string): string => {
      const profile = profiles.get(id);

      const username = profile?.tiktok_username
        ?.trim()
        .replace(/^@+/, "");

      if (username) {
        return `@${username}`;
      }

      return profile?.display_name?.trim() || "Creator";
    };

    // Keep agent display names as they were before.
    const getAgentName = (id: string): string => {
      const agentId = profiles.get(id)?.agent_user_id;

      if (!agentId) {
        return "";
      }

      const agent = agents.get(agentId);

      return (
        agent?.display_name?.trim() ||
        agent?.tiktok_username?.trim() ||
        ""
      );
    };

    // Sort by the actual scheduled battle date and time.
    const sorted = [...matches].sort((a, b) => {
      const aDate = dates.get(a.event_date_id!)!;
      const bDate = dates.get(b.event_date_id!)!;

      const aTime = slots.get(a.schedule_slot_id!)!.slot_time;
      const bTime = slots.get(b.schedule_slot_id!)!.slot_time;

      return (
        aDate.localeCompare(bDate) ||
        aTime.localeCompare(bTime) ||
        a.id.localeCompare(b.id)
      );
    });

    const rows = sorted.map((match) => ({
      "Battle ID": match.id,

      "Date / Time": formatDateTime(
        dates.get(match.event_date_id!)!,
        slots.get(match.schedule_slot_id!)!.slot_time
      ),

      Creator: getCreatorName(match.creator_one_id),

      Agent: getAgentName(match.creator_one_id),

      Score:
        match.creator_one_score === null
          ? ""
          : Number(match.creator_one_score),

      VS: "VS",

      Opponent: getCreatorName(match.creator_two_id),

      "Opponent Agent": getAgentName(match.creator_two_id),

      "Opponent Score":
        match.creator_two_score === null
          ? ""
          : Number(match.creator_two_score),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: [
        "Battle ID",
        "Date / Time",
        "Creator",
        "Agent",
        "Score",
        "VS",
        "Opponent",
        "Opponent Agent",
        "Opponent Score",
      ],
    });

    worksheet["!cols"] = [
      { hidden: true, wch: 38 },
      { wch: 24 },
      { wch: 24 },
      { wch: 20 },
      { wch: 14 },
      { wch: 7 },
      { wch: 24 },
      { wch: 20 },
      { wch: 16 },
    ];

    worksheet["!autofilter"] = {
      ref: `A1:I${rows.length + 1}`,
    };

    worksheet["!freeze"] = {
      xSplit: 0,
      ySplit: 1,
      topLeftCell: "A2",
      activePane: "bottomLeft",
      state: "frozen",
    } as any;

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Battle Schedule"
    );

    const workbookBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const today = new Date().toISOString().slice(0, 10);

    const safeEventName =
      (event.name || "Bloodline-Arena-Event")
        .replace(/[^a-zA-Z0-9-_ ]/g, "")
        .trim()
        .replace(/\s+/g, "-") || "Bloodline-Arena-Event";

    return new NextResponse(workbookBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition":
          `attachment; filename="${safeEventName}-Battle-Schedule-${today}.xlsx"`,

        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(
      "BLOODLINE ARENA BATTLE EXPORT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Something went wrong while exporting battles.",
      },
      { status: 500 }
    );
  }
}
