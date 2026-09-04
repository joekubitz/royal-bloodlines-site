import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import { rebuildScheduleSlots } from "@/app/lib/crownlink/rebuildScheduleSlots";

type CreatorPoolItem = {
  userId: string;
  agencyId: string | null;
  diamondLevel: number;
};

type ScheduleSlot = {
  id: string;
  event_date_id: string;
  slot_time: string;
};

type ExistingMatch = {
  id: string;
  creator_one_id: string;
  creator_two_id: string;
  status: string;
  event_date_id: string | null;
  schedule_slot_id: string | null;
};

type GeneratedMatchInsert = {
  event_id: string;
  event_date_id: string;
  schedule_slot_id: string;
  creator_one_id: string;
  creator_two_id: string;
  status: "approved";
  approved_at: string;
};

function normalizeTime(timeString: string) {
  return timeString.slice(0, 8);
}

function opponentKey(
  creatorOneId: string,
  creatorTwoId: string
) {
  return [creatorOneId, creatorTwoId]
    .sort()
    .join("|");
}

function isSameAgency(
  creatorOne: CreatorPoolItem,
  creatorTwo: CreatorPoolItem
) {
  return Boolean(
    creatorOne.agencyId &&
      creatorTwo.agencyId &&
      creatorOne.agencyId ===
        creatorTwo.agencyId
  );
}

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Not authenticated.",
        },
        { status: 401 }
      );
    }

    const {
      data: userRole,
    } = await supabase
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
        {
          error:
            "Admin access required.",
        },
        { status: 403 }
      );
    }

    const body =
      await request.json();

    const eventId = String(
      body.eventId || ""
    ).trim();

    if (!eventId) {
      return NextResponse.json(
        {
          error:
            "Event ID is required.",
        },
        { status: 400 }
      );
    }

    const adminSupabase =
      createAdminClient();

    const {
      data: event,
      error: eventError,
    } = await adminSupabase
      .from("crownlink_events")
      .select(
        "id, name, status"
      )
      .eq("id", eventId)
      .single();

    if (
      eventError ||
      !event
    ) {
      return NextResponse.json(
        {
          error:
            "Event not found.",
        },
        { status: 404 }
      );
    }

    if (
      event.status !== "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Only active events can be matched.",
        },
        { status: 400 }
      );
    }

    /*
     * Make sure the generated slots
     * are current before matchmaking.
     */
    await rebuildScheduleSlots(
      adminSupabase,
      eventId
    );

    /*
     * Load required event dates.
     */
    const {
      data: eventDates,
      error: eventDatesError,
    } = await adminSupabase
      .from(
        "crownlink_event_dates"
      )
      .select(
        "id, event_date"
      )
      .eq("event_id", eventId)
      .order(
        "event_date",
        {
          ascending: true,
        }
      );

    if (eventDatesError) {
      return NextResponse.json(
        {
          error:
            eventDatesError.message,
        },
        { status: 500 }
      );
    }

    if (
      !eventDates ||
      eventDates.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "This event does not have any required battle dates.",
        },
        { status: 400 }
      );
    }

    /*
     * Load current active signups.
     */
    const {
      data: signups,
      error: signupError,
    } = await adminSupabase
      .from(
        "crownlink_event_signups"
      )
      .select("user_id")
      .eq("event_id", eventId)
      .eq(
        "status",
        "signed_up"
      );

    if (signupError) {
      return NextResponse.json(
        {
          error:
            signupError.message,
        },
        { status: 500 }
      );
    }

    if (
      !signups ||
      signups.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "There are no creators currently signed up for this event.",
        },
        { status: 400 }
      );
    }

    const signupUserIds =
      signups.map(
        (signup) =>
          signup.user_id
      );

    /*
     * Load active creator roles.
     */
    const {
      data: roles,
      error: rolesError,
    } = await adminSupabase
      .from("user_roles")
      .select(
        "user_id, agency_id, role, status"
      )
      .in(
        "user_id",
        signupUserIds
      );

    if (rolesError) {
      return NextResponse.json(
        {
          error:
            rolesError.message,
        },
        { status: 500 }
      );
    }

    /*
     * Load diamond levels.
     */
    const {
      data: profiles,
      error: profilesError,
    } = await adminSupabase
      .from(
        "crownlink_profiles"
      )
      .select(
        "user_id, diamond_level"
      )
      .in(
        "user_id",
        signupUserIds
      );

    if (profilesError) {
      return NextResponse.json(
        {
          error:
            profilesError.message,
        },
        { status: 500 }
      );
    }

    const roleMap = new Map(
      (roles ?? []).map(
        (role) => [
          role.user_id,
          role,
        ]
      )
    );

    const profileMap =
      new Map(
        (profiles ?? []).map(
          (profile) => [
            profile.user_id,
            profile,
          ]
        )
      );

    /*
     * Build the active creator pool.
     */
    const pool: CreatorPoolItem[] =
      [];

    for (
      const signup of signups
    ) {
      const role =
        roleMap.get(
          signup.user_id
        );

      const profile =
        profileMap.get(
          signup.user_id
        );

      if (!role) {
        continue;
      }

      if (
        role.role !==
          "creator" ||
        role.status !==
          "active"
      ) {
        continue;
      }

      pool.push({
        userId:
          signup.user_id,
        agencyId:
          role.agency_id ??
          null,
        diamondLevel:
          Number(
            profile?.diamond_level ??
              0
          ),
      });
    }

    if (pool.length < 2) {
      return NextResponse.json(
        {
          error:
            "There are not enough active creators to generate matches.",
        },
        { status: 400 }
      );
    }

    /*
     * Load generated schedule
     * slots.
     */
    const {
      data: scheduleSlots,
      error:
        scheduleSlotsError,
    } = await adminSupabase
      .from(
        "crownlink_schedule_slots"
      )
      .select(`
        id,
        event_date_id,
        slot_time
      `)
      .eq("event_id", eventId)
      .order(
        "slot_time",
        {
          ascending: true,
        }
      );

    if (
      scheduleSlotsError
    ) {
      return NextResponse.json(
        {
          error:
            scheduleSlotsError.message,
        },
        { status: 500 }
      );
    }

    if (
      !scheduleSlots ||
      scheduleSlots.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No schedule slots are available for this event.",
        },
        { status: 400 }
      );
    }

    /*
     * Load blocked creator times.
     */
    const {
      data: unavailableTimes,
      error:
        unavailableTimesError,
    } = await adminSupabase
      .from(
        "crownlink_event_unavailable_times"
      )
      .select(`
        event_date_id,
        user_id,
        blocked_time
      `)
      .eq(
        "event_id",
        eventId
      );

    if (
      unavailableTimesError
    ) {
      return NextResponse.json(
        {
          error:
            unavailableTimesError.message,
        },
        { status: 500 }
      );
    }

    /*
     * Load existing active matches.
     *
     * Suggested and approved
     * matches remain untouched.
     */
    const {
      data: existingMatches,
      error:
        existingMatchesError,
    } = await adminSupabase
      .from("crownlink_matches")
      .select(`
        id,
        creator_one_id,
        creator_two_id,
        status,
        event_date_id,
        schedule_slot_id
      `)
      .eq("event_id", eventId)
      .in(
        "status",
        [
          "suggested",
          "approved",
        ]
      );

    if (
      existingMatchesError
    ) {
      return NextResponse.json(
        {
          error:
            existingMatchesError.message,
        },
        { status: 500 }
      );
    }

    /*
     * Old Crown Link matches created
     * before the multi-date system
     * do not have a date or slot.
     *
     * Do not guess where they belong.
     */
    const legacyMatches =
      (
        existingMatches ??
        []
      ).filter(
        (match) =>
          !match.event_date_id ||
          !match.schedule_slot_id
      );

    if (
      legacyMatches.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "This event has existing matches from the old scheduling system. Cancel those matches before generating the new multi-date schedule.",
          legacyMatches:
            legacyMatches.map(
              (match) =>
                match.id
            ),
        },
        { status: 409 }
      );
    }

    /*
     * Map blocked times by:
     *
     * event date + creator.
     */
    const blockedTimeMap =
      new Map<
        string,
        Set<string>
      >();

    for (
      const blocked of
        unavailableTimes ?? []
    ) {
      const key =
        `${blocked.event_date_id}|${blocked.user_id}`;

      if (
        !blockedTimeMap.has(
          key
        )
      ) {
        blockedTimeMap.set(
          key,
          new Set()
        );
      }

      blockedTimeMap
        .get(key)
        ?.add(
          normalizeTime(
            blocked.blocked_time
          )
        );
    }

    function creatorCanUseSlot(
      creatorId: string,
      eventDateId: string,
      slotTime: string
    ) {
      const blocked =
        blockedTimeMap.get(
          `${eventDateId}|${creatorId}`
        );

      if (!blocked) {
        return true;
      }

      return !blocked.has(
        normalizeTime(
          slotTime
        )
      );
    }

    /*
     * Track opponent combinations
     * across ALL event dates.
     *
     * This lets us strongly avoid
     * repeat opponents.
     */
    const usedOpponentPairs =
      new Set<string>();

    for (
      const match of
        existingMatches ?? []
    ) {
      usedOpponentPairs.add(
        opponentKey(
          match.creator_one_id,
          match.creator_two_id
        )
      );
    }

    const newMatches:
      GeneratedMatchInsert[] =
        [];

    const incompleteDates: {
      eventDateId: string;
      eventDate: string;
      unmatchedCreatorIds: string[];
    }[] = [];

    /*
     * Process every required date
     * independently.
     */
    for (
      const eventDate of
        eventDates
    ) {
      const dateSlots =
        (
          scheduleSlots as ScheduleSlot[]
        ).filter(
          (slot) =>
            slot.event_date_id ===
            eventDate.id
        );

      /*
       * Matches already created for
       * this date occupy their
       * creators and schedule slots.
       */
      const dateExistingMatches =
        (
          existingMatches ??
          []
        ).filter(
          (
            match: ExistingMatch
          ) =>
            match.event_date_id ===
            eventDate.id
        );

      const occupiedCreatorIds =
        new Set<string>();

      const occupiedSlotIds =
        new Set<string>();

      for (
        const match of
          dateExistingMatches
      ) {
        occupiedCreatorIds.add(
          match.creator_one_id
        );

        occupiedCreatorIds.add(
          match.creator_two_id
        );

        if (
          match.schedule_slot_id
        ) {
          occupiedSlotIds.add(
            match.schedule_slot_id
          );
        }
      }

      /*
       * Creators who still need a
       * battle on this date.
       */
      const remainingCreators =
        pool.filter(
          (creator) =>
            !occupiedCreatorIds.has(
              creator.userId
            )
        );

      /*
       * Slots that are still open.
       */
      const openSlots =
        dateSlots.filter(
          (slot) =>
            !occupiedSlotIds.has(
              slot.id
            )
        );

      /*
       * Schedule the most restricted
       * creators first.
       *
       * This reduces the chance that
       * someone with only one usable
       * time gets stranded.
       */
      remainingCreators.sort(
        (a, b) => {
          const aAvailability =
            openSlots.filter(
              (slot) =>
                creatorCanUseSlot(
                  a.userId,
                  eventDate.id,
                  slot.slot_time
                )
            ).length;

          const bAvailability =
            openSlots.filter(
              (slot) =>
                creatorCanUseSlot(
                  b.userId,
                  eventDate.id,
                  slot.slot_time
                )
            ).length;

          if (
            aAvailability !==
            bAvailability
          ) {
            return (
              aAvailability -
              bAvailability
            );
          }

          return (
            a.diamondLevel -
            b.diamondLevel
          );
        }
      );

      const unmatched =
        [...remainingCreators];

      const availableSlots =
        [...openSlots];

      while (
        unmatched.length >= 2 &&
        availableSlots.length > 0
      ) {
        const creatorOne =
          unmatched.shift();

        if (!creatorOne) {
          break;
        }

        /*
         * Find every creator who can
         * share at least one open
         * slot with creator one.
         */
        const candidates =
          unmatched
            .map(
              (
                candidate,
                index
              ) => {
                const commonSlots =
                  availableSlots.filter(
                    (slot) =>
                      creatorCanUseSlot(
                        creatorOne.userId,
                        eventDate.id,
                        slot.slot_time
                      ) &&
                      creatorCanUseSlot(
                        candidate.userId,
                        eventDate.id,
                        slot.slot_time
                      )
                  );

                return {
                  candidate,
                  index,
                  commonSlots,
                  hasRepeat:
                    usedOpponentPairs.has(
                      opponentKey(
                        creatorOne.userId,
                        candidate.userId
                      )
                    ),
                  diamondDifference:
                    Math.abs(
                      creatorOne.diamondLevel -
                        candidate.diamondLevel
                    ),
                  sameAgency:
                    isSameAgency(
                      creatorOne,
                      candidate
                    ),
                };
              }
            )
            .filter(
              (option) =>
                option.commonSlots
                  .length > 0
            );

        if (
          candidates.length === 0
        ) {
          /*
           * No one can share any
           * remaining slot with this
           * creator.
           *
           * Keep them unmatched and
           * continue trying the rest.
           */
          unmatched.push(
            creatorOne
          );

          /*
           * Move to another creator.
           * If everyone is impossible,
           * the safety break below
           * prevents an infinite loop.
           */
          const impossibleForAll =
            unmatched.every(
              (creator) => {
                const others =
                  unmatched.filter(
                    (other) =>
                      other.userId !==
                      creator.userId
                  );

                return !others.some(
                  (other) =>
                    availableSlots.some(
                      (slot) =>
                        creatorCanUseSlot(
                          creator.userId,
                          eventDate.id,
                          slot.slot_time
                        ) &&
                        creatorCanUseSlot(
                          other.userId,
                          eventDate.id,
                          slot.slot_time
                        )
                    )
                );
              }
            );

          if (
            impossibleForAll
          ) {
            break;
          }

          continue;
        }

        /*
         * Priority:
         *
         * 1. Avoid repeat opponents.
         * 2. Closest diamonds.
         * 3. Prefer different agency.
         */
        candidates.sort(
          (a, b) => {
            /*
             * A repeat opponent adds the equivalent
             * of a 25,000-diamond penalty.
             *
             * A same-agency matchup adds a smaller
             * 10,000-diamond penalty.
             *
             * This means Crown Link will still prefer
             * fresh, cross-agency opponents when the
             * diamond levels are reasonably close,
             * but it will choose a repeat/fallback
             * matchup instead of forcing something
             * extremely uneven like 25K vs 175K.
             */
            const aScore =
              a.diamondDifference +
              (a.hasRepeat ? 25000 : 0) +
              (a.sameAgency ? 10000 : 0);

            const bScore =
              b.diamondDifference +
              (b.hasRepeat ? 25000 : 0) +
              (b.sameAgency ? 10000 : 0);

            if (aScore !== bScore) {
              return aScore - bScore;
            }

            /*
             * Tie-breakers:
             * 1. Closest raw diamond difference.
             * 2. Avoid a repeat opponent.
             * 3. Prefer a different agency.
             */
            if (
              a.diamondDifference !==
              b.diamondDifference
            ) {
              return (
                a.diamondDifference -
                b.diamondDifference
              );
            }

            if (
              a.hasRepeat !==
              b.hasRepeat
            ) {
              return a.hasRepeat
                ? 1
                : -1;
            }

            if (
              a.sameAgency !==
              b.sameAgency
            ) {
              return a.sameAgency
                ? 1
                : -1;
            }

            return 0;
          }
        );

        const best =
          candidates[0];

        const creatorTwo =
          best.candidate;

        /*
         * If multiple times work,
         * choose the slot that leaves
         * the greatest number of
         * options for everyone else.
         */
        const rankedSlots =
          best.commonSlots
            .map((slot) => {
              const remainingAfterPair =
                unmatched.filter(
                  (creator) =>
                    creator.userId !==
                    creatorTwo.userId
                );

              const flexibility =
                remainingAfterPair.reduce(
                  (
                    total,
                    creator
                  ) => {
                    if (
                      creatorCanUseSlot(
                        creator.userId,
                        eventDate.id,
                        slot.slot_time
                      )
                    ) {
                      return (
                        total + 1
                      );
                    }

                    return total;
                  },
                  0
                );

              return {
                slot,
                flexibility,
              };
            })
            .sort(
              (a, b) =>
                a.flexibility -
                b.flexibility
            );

        const selectedSlot =
          rankedSlots[0].slot;

        newMatches.push({
          event_id:
            eventId,
          event_date_id:
            eventDate.id,
          schedule_slot_id:
            selectedSlot.id,
          creator_one_id:
            creatorOne.userId,
          creator_two_id:
            creatorTwo.userId,
          status:
            "approved",
          approved_at:
            new Date().toISOString(),
        });

        usedOpponentPairs.add(
          opponentKey(
            creatorOne.userId,
            creatorTwo.userId
          )
        );

        /*
         * Remove creator two from the
         * unmatched pool.
         */
        const creatorTwoIndex =
          unmatched.findIndex(
            (creator) =>
              creator.userId ===
              creatorTwo.userId
          );

        if (
          creatorTwoIndex !== -1
        ) {
          unmatched.splice(
            creatorTwoIndex,
            1
          );
        }

        /*
         * Each slot can contain only
         * one 1v1 battle.
         */
        const slotIndex =
          availableSlots.findIndex(
            (slot) =>
              slot.id ===
              selectedSlot.id
          );

        if (
          slotIndex !== -1
        ) {
          availableSlots.splice(
            slotIndex,
            1
          );
        }
      }

      if (
        unmatched.length > 0
      ) {
        incompleteDates.push({
          eventDateId:
            eventDate.id,
          eventDate:
            eventDate.event_date,
          unmatchedCreatorIds:
            unmatched.map(
              (creator) =>
                creator.userId
            ),
        });
      }
    }

    /*
     * Save all newly created
     * approved matches at once.
     */
    let createdMatches:
      GeneratedMatchInsert[] =
        [];

    if (
      newMatches.length > 0
    ) {
      const {
        data,
        error: insertError,
      } = await adminSupabase
        .from(
          "crownlink_matches"
        )
        .insert(newMatches)
        .select();

      if (insertError) {
        console.error(
          "GENERATE MATCHES ERROR:",
          insertError
        );

        return NextResponse.json(
          {
            error:
              insertError.message,
          },
          { status: 500 }
        );
      }

      createdMatches =
        (data ??
          []) as GeneratedMatchInsert[];
    }

    const scheduleComplete =
      incompleteDates.length ===
      0;

    return NextResponse.json({
      success: true,
      eventName:
        event.name,
      matchesCreated:
        createdMatches.length,
      existingMatches:
        existingMatches?.length ??
        0,
      requiredDates:
        eventDates.length,
      creatorCount:
        pool.length,
      scheduleComplete,
      incompleteDates,
      message:
        scheduleComplete
          ? "Matches were automatically scheduled for every required event date."
          : "Matches were automatically scheduled, but the schedule is incomplete. Review the unmatched creators.",
    });
  } catch (error) {
    console.error(
      "GENERATE MATCHES ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}