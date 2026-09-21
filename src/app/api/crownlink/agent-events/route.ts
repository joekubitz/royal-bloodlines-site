import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export const dynamic = "force-dynamic";

type CreatorProfile = {
  user_id: string;
  display_name: string | null;
  tiktok_username: string | null;
  agency_name: string | null;
  diamond_level: number | null;
};

type EventSignup = {
  event_id: string;
  user_id: string;
  status: string | null;
};

type MatchRow = {
  id: string;
  event_id: string;
  creator_one_id: string;
  creator_two_id: string;
  status: string | null;
  approved_at: string | null;
  event_date_id: string | null;
  schedule_slot_id: string | null;
};

function normalizeUsername(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
}

export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient();

    /*
     * AUTHENTICATION
     *
     * Native iOS requests send a Supabase access token.
     * Website requests can continue using the normal session.
     */
    const authorization = request.headers.get("authorization");

    let userId: string | null = null;

    if (authorization?.startsWith("Bearer ")) {
      const accessToken = authorization.slice(7).trim();

      const {
        data: { user },
        error: userError,
      } = await adminSupabase.auth.getUser(accessToken);

      if (userError || !user) {
        return NextResponse.json(
          {
            success: false,
            error: "Unauthorized.",
          },
          { status: 401 }
        );
      }

      userId = user.id;
    } else {
      const supabase = await createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return NextResponse.json(
          {
            success: false,
            error: "Unauthorized.",
          },
          { status: 401 }
        );
      }

      userId = user.id;
    }

    /*
     * VERIFY AGENT ROLE
     */
    const { data: userRole, error: roleError } =
      await adminSupabase
        .from("user_roles")
        .select("role, status, agency_id")
        .eq("user_id", userId)
        .maybeSingle();

    if (
      roleError ||
      !userRole ||
      userRole.role !== "agent" ||
      userRole.status !== "active"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Active agent access is required.",
        },
        { status: 403 }
      );
    }

    /*
     * AGENT PROFILE
     */
    const { data: agentProfile } = await adminSupabase
      .from("crownlink_profiles")
      .select(
        `
          user_id,
          display_name,
          tiktok_username,
          agency_name
        `
      )
      .eq("user_id", userId)
      .maybeSingle();

    /*
     * LOAD THIS AGENT'S CREATORS
     *
     * creator -> agent relationship:
     * crownlink_profiles.agent_user_id
     */
    const { data: creatorRows, error: creatorError } =
      await adminSupabase
        .from("crownlink_profiles")
        .select(
          `
            user_id,
            display_name,
            tiktok_username,
            agency_name,
            diamond_level
          `
        )
        .eq("agent_user_id", userId)
        .eq("profile_status", "active");

    if (creatorError) {
      console.error(
        "AGENT EVENTS CREATOR LOAD ERROR:",
        creatorError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to load your creators.",
        },
        { status: 500 }
      );
    }

    /*
     * De-dupe creator profiles by user ID.
     */
    const creatorMap = new Map<string, CreatorProfile>();

    for (const row of creatorRows ?? []) {
      if (!row.user_id) continue;

      if (!creatorMap.has(row.user_id)) {
        creatorMap.set(row.user_id, row as CreatorProfile);
      }
    }

    const creators = Array.from(creatorMap.values());

    const creatorIds = creators.map(
      (creator) => creator.user_id
    );

    /*
     * ACTIVE / UPCOMING EVENTS
     */
    const { data: eventRows, error: eventError } =
      await adminSupabase
        .from("crownlink_events")
        .select(
          `
            id,
            name,
            description,
            prize_information,
            event_date,
            event_time,
            battle_interval_minutes,
            status
          `
        )
        .eq("status", "active")
        .order("event_date", {
          ascending: true,
        });

    if (eventError) {
      console.error(
        "AGENT EVENTS EVENT LOAD ERROR:",
        eventError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to load events.",
        },
        { status: 500 }
      );
    }

    const events = eventRows ?? [];

    /*
     * EVENT DATES
     */
    const eventIds = events.map((event) => event.id);

    let eventDates: any[] = [];

    if (eventIds.length > 0) {
      const { data, error } = await adminSupabase
        .from("crownlink_event_dates")
        .select(
          `
            id,
            event_id,
            event_date
          `
        )
        .in("event_id", eventIds)
        .order("event_date", {
          ascending: true,
        });

      if (error) {
        console.error(
          "AGENT EVENTS DATE LOAD ERROR:",
          error
        );
      } else {
        eventDates = data ?? [];
      }
    }

    /*
     * TEAM SIGNUPS
     */
    let signups: EventSignup[] = [];

    if (
      creatorIds.length > 0 &&
      eventIds.length > 0
    ) {
      const { data, error } = await adminSupabase
        .from("crownlink_event_signups")
        .select(
          `
            event_id,
            user_id,
            status
          `
        )
        .in("event_id", eventIds)
        .in("user_id", creatorIds);

      if (error) {
        console.error(
          "AGENT EVENTS SIGNUP LOAD ERROR:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to load creator event signups.",
          },
          { status: 500 }
        );
      }

      signups = (data ?? []) as EventSignup[];
    }

    /*
     * TEAM MATCHES
     *
     * We load matches for the events and then keep
     * only matches involving one of this agent's creators.
     */
    let matches: MatchRow[] = [];

    if (
      creatorIds.length > 0 &&
      eventIds.length > 0
    ) {
      const { data, error } = await adminSupabase
        .from("crownlink_matches")
        .select(
          `
            id,
            event_id,
            creator_one_id,
            creator_two_id,
            status,
            approved_at,
            event_date_id,
            schedule_slot_id
          `
        )
        .in("event_id", eventIds);

      if (error) {
        console.error(
          "AGENT EVENTS MATCH LOAD ERROR:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            error: "Unable to load team battles.",
          },
          { status: 500 }
        );
      }

      const creatorIdSet = new Set(creatorIds);

      matches = ((data ?? []) as MatchRow[]).filter(
        (match) =>
          creatorIdSet.has(match.creator_one_id) ||
          creatorIdSet.has(match.creator_two_id)
      );
    }

    /*
     * LOAD OPPONENT PROFILES
     *
     * This allows the agent to see who their creator
     * is battling even when the opponent belongs to
     * another agent or agency.
     */
    const opponentIds = new Set<string>();

    for (const match of matches) {
      if (
        !creatorMap.has(match.creator_one_id)
      ) {
        opponentIds.add(match.creator_one_id);
      }

      if (
        !creatorMap.has(match.creator_two_id)
      ) {
        opponentIds.add(match.creator_two_id);
      }
    }

    const opponentMap = new Map<
      string,
      CreatorProfile
    >();

    if (opponentIds.size > 0) {
      const { data: opponentRows, error } =
        await adminSupabase
          .from("crownlink_profiles")
          .select(
            `
              user_id,
              display_name,
              tiktok_username,
              agency_name,
              diamond_level
            `
          )
          .in(
            "user_id",
            Array.from(opponentIds)
          );

      if (error) {
        console.error(
          "AGENT EVENTS OPPONENT LOAD ERROR:",
          error
        );
      } else {
        for (const row of opponentRows ?? []) {
          if (row.user_id) {
            opponentMap.set(
              row.user_id,
              row as CreatorProfile
            );
          }
        }
      }
    }

    /*
     * SCHEDULE SLOTS
     */
    const scheduleSlotIds = Array.from(
      new Set(
        matches
          .map((match) => match.schedule_slot_id)
          .filter(
            (id): id is string =>
              typeof id === "string" &&
              id.length > 0
          )
      )
    );

    const scheduleSlotMap = new Map<
      string,
      any
    >();

    if (scheduleSlotIds.length > 0) {
      const { data: slots, error } =
        await adminSupabase
          .from("crownlink_schedule_slots")
          .select(
            `
              id,
              event_id,
              event_date_id,
              slot_time
            `
          )
          .in("id", scheduleSlotIds);

      if (error) {
        console.error(
          "AGENT EVENTS SLOT LOAD ERROR:",
          error
        );
      } else {
        for (const slot of slots ?? []) {
          scheduleSlotMap.set(slot.id, slot);
        }
      }
    }

    /*
     * BUILD CREATOR RESPONSE
     */
    const creatorResponse = creators
      .map((creator) => {
        const creatorSignups = signups.filter(
          (signup) =>
            signup.user_id === creator.user_id
        );

        const creatorMatches = matches.filter(
          (match) =>
            match.creator_one_id ===
              creator.user_id ||
            match.creator_two_id ===
              creator.user_id
        );

        return {
          user_id: creator.user_id,
          display_name:
            creator.display_name,
          tiktok_username:
            creator.tiktok_username,
          normalized_username:
            normalizeUsername(
              creator.tiktok_username
            ),
          agency_name:
            creator.agency_name,
          diamond_level:
            creator.diamond_level,
          signups: creatorSignups,
          match_count:
            creatorMatches.length,
        };
      })
      .sort((a, b) =>
        (a.tiktok_username ?? "").localeCompare(
          b.tiktok_username ?? ""
        )
      );

    /*
     * BUILD EVENT RESPONSE
     */
    const eventResponse = events.map(
      (event) => {
        const dates = eventDates.filter(
          (date) =>
            date.event_id === event.id
        );

        const eventSignups = signups.filter(
          (signup) =>
            signup.event_id === event.id &&
            signup.status === "signed_up"
        );

        const eventMatches = matches.filter(
          (match) =>
            match.event_id === event.id
        );

        const matchedCreatorIds =
          new Set<string>();

        for (const match of eventMatches) {
          if (
            creatorMap.has(
              match.creator_one_id
            )
          ) {
            matchedCreatorIds.add(
              match.creator_one_id
            );
          }

          if (
            creatorMap.has(
              match.creator_two_id
            )
          ) {
            matchedCreatorIds.add(
              match.creator_two_id
            );
          }
        }

        const signedUpCreatorIds =
          new Set(
            eventSignups.map(
              (signup) => signup.user_id
            )
          );

        const teamCreators =
          creatorResponse.map((creator) => {
            const signup = signups.find(
              (row) =>
                row.event_id === event.id &&
                row.user_id ===
                  creator.user_id
            );

            const creatorMatch =
              eventMatches.find(
                (match) =>
                  match.creator_one_id ===
                    creator.user_id ||
                  match.creator_two_id ===
                    creator.user_id
              );

            let opponent: CreatorProfile | null =
              null;

            let scheduleSlot: any = null;

            if (creatorMatch) {
              const opponentId =
                creatorMatch.creator_one_id ===
                creator.user_id
                  ? creatorMatch.creator_two_id
                  : creatorMatch.creator_one_id;

              opponent =
                creatorMap.get(opponentId) ??
                opponentMap.get(opponentId) ??
                null;

              if (
                creatorMatch.schedule_slot_id
              ) {
                scheduleSlot =
                  scheduleSlotMap.get(
                    creatorMatch.schedule_slot_id
                  ) ?? null;
              }
            }

            return {
              user_id: creator.user_id,
              display_name:
                creator.display_name,
              tiktok_username:
                creator.tiktok_username,
              diamond_level:
                creator.diamond_level,

              signup_status:
                signup?.status ?? null,

              signed_up:
                signup?.status ===
                "signed_up",

              matched:
                Boolean(creatorMatch),

              match: creatorMatch
                ? {
                    id: creatorMatch.id,
                    status:
                      creatorMatch.status,
                    approved_at:
                      creatorMatch.approved_at,
                    event_date_id:
                      creatorMatch.event_date_id,
                    schedule_slot_id:
                      creatorMatch.schedule_slot_id,
                    slot_time:
                      scheduleSlot?.slot_time ??
                      null,
                    opponent: opponent
                      ? {
                          user_id:
                            opponent.user_id,
                          display_name:
                            opponent.display_name,
                          tiktok_username:
                            opponent.tiktok_username,
                          agency_name:
                            opponent.agency_name,
                          diamond_level:
                            opponent.diamond_level,
                        }
                      : null,
                  }
                : null,
            };
          });

        return {
          id: event.id,
          name: event.name,
          description:
            event.description,
          prize_information:
            event.prize_information,
          event_date:
            event.event_date,
          event_time:
            event.event_time,
          battle_interval_minutes:
            event.battle_interval_minutes,
          status: event.status,
          dates,

          team_summary: {
            total_creators:
              creators.length,
            signed_up:
              signedUpCreatorIds.size,
            matched:
              matchedCreatorIds.size,
            not_signed_up:
              Math.max(
                creators.length -
                  signedUpCreatorIds.size,
                0
              ),
          },

          creators: teamCreators,
        };
      }
    );

    /*
     * BUILD UPCOMING TEAM BATTLES
     */
    const teamBattles = matches
      .filter(
        (match) =>
          match.status === "approved"
      )
      .flatMap((match) => {
        const teamCreatorIds: string[] = [];

        if (
          creatorMap.has(
            match.creator_one_id
          )
        ) {
          teamCreatorIds.push(
            match.creator_one_id
          );
        }

        if (
          creatorMap.has(
            match.creator_two_id
          )
        ) {
          teamCreatorIds.push(
            match.creator_two_id
          );
        }

        return teamCreatorIds.map(
          (teamCreatorId) => {
            const creator =
              creatorMap.get(
                teamCreatorId
              )!;

            const opponentId =
              match.creator_one_id ===
              teamCreatorId
                ? match.creator_two_id
                : match.creator_one_id;

            const opponent =
              creatorMap.get(opponentId) ??
              opponentMap.get(opponentId) ??
              null;

            const event =
              events.find(
                (row) =>
                  row.id === match.event_id
              ) ?? null;

            const eventDate =
              eventDates.find(
                (row) =>
                  row.id ===
                  match.event_date_id
              ) ?? null;

            const slot =
              match.schedule_slot_id
                ? scheduleSlotMap.get(
                    match.schedule_slot_id
                  ) ?? null
                : null;

            return {
              id: match.id,
              status: match.status,
              approved_at:
                match.approved_at,

              creator: {
                user_id:
                  creator.user_id,
                display_name:
                  creator.display_name,
                tiktok_username:
                  creator.tiktok_username,
                diamond_level:
                  creator.diamond_level,
              },

              opponent: opponent
                ? {
                    user_id:
                      opponent.user_id,
                    display_name:
                      opponent.display_name,
                    tiktok_username:
                      opponent.tiktok_username,
                    agency_name:
                      opponent.agency_name,
                    diamond_level:
                      opponent.diamond_level,
                  }
                : null,

              event: event
                ? {
                    id: event.id,
                    name: event.name,
                  }
                : null,

              event_date:
                eventDate?.event_date ??
                event?.event_date ??
                null,

              slot_time:
                slot?.slot_time ?? null,
            };
          }
        );
      });

    return NextResponse.json({
      success: true,

      agent: {
        user_id: userId,
        display_name:
          agentProfile?.display_name ??
          null,
        tiktok_username:
          agentProfile?.tiktok_username ??
          null,
        agency_name:
          agentProfile?.agency_name ??
          null,
      },

      summary: {
        creators: creators.length,

        active_events:
          eventResponse.length,

        total_signups: signups.filter(
          (signup) =>
            signup.status === "signed_up"
        ).length,

        matched_creators:
          new Set(
            matches.flatMap((match) => {
              const ids: string[] = [];

              if (
                creatorMap.has(
                  match.creator_one_id
                )
              ) {
                ids.push(
                  match.creator_one_id
                );
              }

              if (
                creatorMap.has(
                  match.creator_two_id
                )
              ) {
                ids.push(
                  match.creator_two_id
                );
              }

              return ids;
            })
          ).size,

        upcoming_battles:
          teamBattles.length,
      },

      creators: creatorResponse,
      events: eventResponse,
      battles: teamBattles,
    });
  } catch (error) {
    console.error(
      "AGENT EVENTS ROUTE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to load agent event information.",
      },
      { status: 500 }
    );
  }
}
