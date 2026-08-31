import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

type CreatorPoolItem = {
  userId: string;
  agencyId: string | null;
  diamondLevel: number;
};

export async function POST(request: Request) {
  try {
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

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .single();

    if (
      !userRole ||
      userRole.role !== "admin" ||
      userRole.status !== "active"
    ) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const eventId = String(body.eventId || "").trim();

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: event, error: eventError } =
      await adminSupabase
        .from("crownlink_events")
        .select("id, name, status")
        .eq("id", eventId)
        .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 }
      );
    }

    if (event.status !== "active") {
      return NextResponse.json(
        { error: "Only active events can be matched." },
        { status: 400 }
      );
    }

    /*
     * Find creators who are already involved in an active
     * suggested or approved match for this event.
     *
     * These creators are considered occupied and will NOT
     * be matched again.
     *
     * Cancelled matches do not count.
     */
    const {
      data: existingMatches,
      error: existingMatchesError,
    } = await adminSupabase
      .from("crownlink_matches")
      .select(
        "id, creator_one_id, creator_two_id, status"
      )
      .eq("event_id", eventId)
      .in("status", ["suggested", "approved"]);

    if (existingMatchesError) {
      return NextResponse.json(
        { error: existingMatchesError.message },
        { status: 500 }
      );
    }

    const occupiedCreatorIds = new Set<string>();

    for (const match of existingMatches ?? []) {
      occupiedCreatorIds.add(match.creator_one_id);
      occupiedCreatorIds.add(match.creator_two_id);
    }

    /*
     * Load everyone who is currently signed up.
     */
    const { data: signups, error: signupError } =
      await adminSupabase
        .from("crownlink_event_signups")
        .select("user_id")
        .eq("event_id", eventId)
        .eq("status", "signed_up");

    if (signupError) {
      return NextResponse.json(
        { error: signupError.message },
        { status: 500 }
      );
    }

    if (!signups || signups.length === 0) {
      return NextResponse.json(
        {
          error:
            "There are no creators currently signed up for this event.",
        },
        { status: 400 }
      );
    }

    /*
     * Only creators who are:
     *
     * 1. still signed up
     * 2. not already in an active match
     *
     * are eligible for matching.
     */
    const availableSignups = signups.filter(
      (signup) =>
        !occupiedCreatorIds.has(signup.user_id)
    );

    if (availableSignups.length < 2) {
      return NextResponse.json(
        {
          error:
            "There are not enough unmatched creators to generate another match.",
        },
        { status: 400 }
      );
    }

    const userIds = availableSignups.map(
      (signup) => signup.user_id
    );

    /*
     * Get creator roles and agencies.
     */
    const { data: roles, error: rolesError } =
      await adminSupabase
        .from("user_roles")
        .select("user_id, agency_id, status")
        .in("user_id", userIds)
        .eq("role", "creator");

    if (rolesError) {
      return NextResponse.json(
        { error: rolesError.message },
        { status: 500 }
      );
    }

    /*
     * Get diamond levels.
     */
    const { data: profiles, error: profilesError } =
      await adminSupabase
        .from("crownlink_profiles")
        .select("user_id, diamond_level")
        .in("user_id", userIds);

    if (profilesError) {
      return NextResponse.json(
        { error: profilesError.message },
        { status: 500 }
      );
    }

    const roleMap = new Map(
      (roles ?? []).map((role) => [
        role.user_id,
        role,
      ])
    );

    const profileMap = new Map(
      (profiles ?? []).map((profile) => [
        profile.user_id,
        profile,
      ])
    );

    const pool: CreatorPoolItem[] = [];

    /*
     * Build the final eligible creator pool.
     *
     * Suspended/inactive creators are skipped.
     */
    for (const signup of availableSignups) {
      const role = roleMap.get(signup.user_id);
      const profile = profileMap.get(
        signup.user_id
      );

      if (!role) continue;
      if (role.status !== "active") continue;

      pool.push({
        userId: signup.user_id,
        agencyId: role.agency_id ?? null,
        diamondLevel: Number(
          profile?.diamond_level ?? 0
        ),
      });
    }

    if (pool.length < 2) {
      return NextResponse.json(
        {
          error:
            "There are not enough active unmatched creators to generate another match.",
        },
        { status: 400 }
      );
    }

    /*
     * Sort creators by diamond level so closer creators
     * naturally sit closer together in the pool.
     */
    pool.sort(
      (a, b) => a.diamondLevel - b.diamondLevel
    );

    const unmatched = [...pool];

    const suggestedMatches: {
      event_id: string;
      creator_one_id: string;
      creator_two_id: string;
      status: "suggested";
    }[] = [];

    /*
     * Generate matches.
     *
     * First preference:
     * different agency + closest diamond level.
     *
     * Fallback:
     * same agency if no cross-agency creator exists.
     */
    while (unmatched.length >= 2) {
      const creatorOne = unmatched.shift();

      if (!creatorOne) break;

      let bestIndex = -1;
      let bestDifference = Infinity;

      /*
       * First attempt:
       * closest creator from another agency.
       */
      for (
        let i = 0;
        i < unmatched.length;
        i++
      ) {
        const candidate = unmatched[i];

        if (
          creatorOne.agencyId &&
          candidate.agencyId &&
          creatorOne.agencyId ===
            candidate.agencyId
        ) {
          continue;
        }

        const difference = Math.abs(
          creatorOne.diamondLevel -
            candidate.diamondLevel
        );

        if (difference < bestDifference) {
          bestDifference = difference;
          bestIndex = i;
        }
      }

      /*
       * Fallback:
       * allow same-agency matching if no
       * cross-agency option exists.
       */
      if (bestIndex === -1) {
        let fallbackIndex = -1;
        let fallbackDifference = Infinity;

        for (
          let i = 0;
          i < unmatched.length;
          i++
        ) {
          const candidate = unmatched[i];

          const difference = Math.abs(
            creatorOne.diamondLevel -
              candidate.diamondLevel
          );

          if (
            difference < fallbackDifference
          ) {
            fallbackDifference = difference;
            fallbackIndex = i;
          }
        }

        bestIndex = fallbackIndex;
      }

      if (bestIndex === -1) {
        unmatched.unshift(creatorOne);
        break;
      }

      const [creatorTwo] = unmatched.splice(
        bestIndex,
        1
      );

      suggestedMatches.push({
        event_id: eventId,
        creator_one_id: creatorOne.userId,
        creator_two_id: creatorTwo.userId,
        status: "suggested",
      });
    }

    if (suggestedMatches.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid new matches could be generated.",
        },
        { status: 400 }
      );
    }

    /*
     * Insert only the newly generated matches.
     *
     * Existing suggested/approved matches are untouched.
     */
    const {
      data: createdMatches,
      error: insertError,
    } = await adminSupabase
      .from("crownlink_matches")
      .insert(suggestedMatches)
      .select();

    if (insertError) {
      console.error(
        "GENERATE MATCHES ERROR:",
        insertError
      );

      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      eventName: event.name,
      matchesCreated:
        createdMatches?.length ?? 0,
      existingMatches:
        existingMatches?.length ?? 0,
      occupiedCreators:
        occupiedCreatorIds.size,
      unmatchedCreators: unmatched.map(
        (creator) => creator.userId
      ),
    });
  } catch (error) {
    console.error(
      "GENERATE MATCHES ERROR:",
      error
    );

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}