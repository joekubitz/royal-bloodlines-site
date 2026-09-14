import { createAdminClient } from "@/app/supabase/admin";

type ConflictSeverity =
  | "danger"
  | "warning"
  | "info";

export type ScheduleConflict = {
  id: string;
  severity: ConflictSeverity;
  type: string;
  title: string;
  message: string;

  eventDateId?: string | null;
  matchId?: string | null;
  creatorIds?: string[];
};

export type ScheduleHealthResult = {
  score: number;
  status:
    | "healthy"
    | "review"
    | "critical";

  totalIssues: number;
  dangerCount: number;
  warningCount: number;
  infoCount: number;

  conflicts: ScheduleConflict[];
};

function normalizeTime(
  value: string | null
) {
  if (!value) {
    return "";
  }

  return value.slice(0, 8);
}

function pairKey(
  first: string,
  second: string
) {
  return [first, second]
    .sort()
    .join("|");
}

export async function analyzeScheduleConflicts(
  eventId: string
): Promise<ScheduleHealthResult> {
  const db =
    createAdminClient();

  const conflicts: ScheduleConflict[] =
    [];

  /*
   * EVENT DATES
   */
  const {
    data: eventDates,
    error: eventDatesError,
  } = await db
    .from("crownlink_event_dates")
    .select(`
      id,
      event_date
    `)
    .eq("event_id", eventId)
    .order("event_date", {
      ascending: true,
    });

  if (eventDatesError) {
    throw new Error(
      eventDatesError.message
    );
  }

  /*
   * ACTIVE SIGNUPS
   */
  const {
    data: signups,
    error: signupError,
  } = await db
    .from("crownlink_event_signups")
    .select("user_id")
    .eq("event_id", eventId)
    .eq("status", "signed_up");

  if (signupError) {
    throw new Error(
      signupError.message
    );
  }

  const signupIds = Array.from(
    new Set(
      (signups ?? []).map(
        (signup) =>
          signup.user_id
      )
    )
  );

  /*
   * CREATOR ROLES
   */
  let roleRows: Array<{
    user_id: string;
    agency_id: string | null;
  }> = [];

  if (signupIds.length > 0) {
    const {
      data,
      error,
    } = await db
      .from("user_roles")
      .select(`
        user_id,
        agency_id
      `)
      .in("user_id", signupIds)
      .eq("role", "creator")
      .eq("status", "active");

    if (error) {
      throw new Error(
        error.message
      );
    }

    roleRows = data ?? [];
  }

  const agencyByUser =
    new Map(
      roleRows.map(
        (row) => [
          row.user_id,
          row.agency_id,
        ]
      )
    );

  /*
   * CREATOR PROFILES
   */
  let profiles: Array<{
    user_id: string;
    display_name: string | null;
    tiktok_username: string | null;
    diamond_level: number | null;
  }> = [];

  if (signupIds.length > 0) {
    const {
      data,
      error,
    } = await db
      .from(
        "crownlink_profiles"
      )
      .select(`
        user_id,
        display_name,
        tiktok_username,
        diamond_level
      `)
      .in("user_id", signupIds);

    if (error) {
      throw new Error(
        error.message
      );
    }

    profiles = data ?? [];
  }

  const profileByUser =
    new Map(
      profiles.map(
        (profile) => [
          profile.user_id,
          profile,
        ]
      )
    );

  function creatorName(
    userId: string
  ) {
    const profile =
      profileByUser.get(userId);

    if (
      profile?.tiktok_username
    ) {
      return `@${profile.tiktok_username}`;
    }

    return (
      profile?.display_name ||
      userId
    );
  }

  /*
   * SCHEDULE SLOTS
   */
  const {
    data: slots,
    error: slotError,
  } = await db
    .from(
      "crownlink_schedule_slots"
    )
    .select(`
      id,
      event_date_id,
      slot_time
    `)
    .eq("event_id", eventId);

  if (slotError) {
    throw new Error(
      slotError.message
    );
  }

  const slotById =
    new Map(
      (slots ?? []).map(
        (slot) => [
          slot.id,
          slot,
        ]
      )
    );

  /*
   * BLOCKED TIMES
   */
  const {
    data: unavailable,
    error: unavailableError,
  } = await db
    .from(
      "crownlink_event_unavailable_times"
    )
    .select(`
      event_date_id,
      user_id,
      blocked_time
    `)
    .eq("event_id", eventId);

  if (unavailableError) {
    throw new Error(
      unavailableError.message
    );
  }

  const blockedMap =
    new Map<string, Set<string>>();

  for (
    const blocked of
      unavailable ?? []
  ) {
    const key =
      `${blocked.event_date_id}|${blocked.user_id}`;

    if (!blockedMap.has(key)) {
      blockedMap.set(
        key,
        new Set()
      );
    }

    blockedMap
      .get(key)
      ?.add(
        normalizeTime(
          blocked.blocked_time
        )
      );
  }

  /*
   * MATCHES
   */
  const {
    data: matches,
    error: matchError,
  } = await db
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
    .in("status", [
      "suggested",
      "approved",
    ]);

  if (matchError) {
    throw new Error(
      matchError.message
    );
  }

  const activeMatches =
    matches ?? [];

  /*
   * 1. MISSING DATE OR SLOT
   */
  for (
    const match of
      activeMatches
  ) {
    if (!match.event_date_id) {
      conflicts.push({
        id: `missing-date-${match.id}`,
        severity: "danger",
        type: "missing_event_date",
        title:
          "Battle missing event date",
        message:
          `${creatorName(
            match.creator_one_id
          )} vs ${creatorName(
            match.creator_two_id
          )} does not have an event date assigned.`,
        matchId: match.id,
        creatorIds: [
          match.creator_one_id,
          match.creator_two_id,
        ],
      });
    }

    if (!match.schedule_slot_id) {
      conflicts.push({
        id: `missing-slot-${match.id}`,
        severity: "danger",
        type: "missing_schedule_slot",
        title:
          "Battle missing schedule slot",
        message:
          `${creatorName(
            match.creator_one_id
          )} vs ${creatorName(
            match.creator_two_id
          )} does not have a battle time assigned.`,
        eventDateId:
          match.event_date_id,
        matchId: match.id,
        creatorIds: [
          match.creator_one_id,
          match.creator_two_id,
        ],
      });
    }
  }

  /*
   * 2. DUPLICATE SLOT USE
   */
  const matchesBySlot =
    new Map<
      string,
      typeof activeMatches
    >();

  for (
    const match of
      activeMatches
  ) {
    if (
      !match.schedule_slot_id
    ) {
      continue;
    }

    if (
      !matchesBySlot.has(
        match.schedule_slot_id
      )
    ) {
      matchesBySlot.set(
        match.schedule_slot_id,
        []
      );
    }

    matchesBySlot
      .get(
        match.schedule_slot_id
      )
      ?.push(match);
  }

  for (
    const [
      slotId,
      slotMatches,
    ] of matchesBySlot
  ) {
    if (
      slotMatches.length <= 1
    ) {
      continue;
    }

    conflicts.push({
      id: `duplicate-slot-${slotId}`,
      severity: "danger",
      type: "duplicate_slot",
      title:
        "Multiple battles share one slot",
      message:
        `${slotMatches.length} battles are assigned to the same schedule slot.`,
      eventDateId:
        slotMatches[0]
          ?.event_date_id,
    });
  }

  /*
   * 3. CREATOR SCHEDULED TWICE
   * ON THE SAME EVENT DATE
   */
  for (
    const eventDate of
      eventDates ?? []
  ) {
    const creatorCounts =
      new Map<string, number>();

    const dateMatches =
      activeMatches.filter(
        (match) =>
          match.event_date_id ===
          eventDate.id
      );

    for (
      const match of
        dateMatches
    ) {
      for (
        const creatorId of [
          match.creator_one_id,
          match.creator_two_id,
        ]
      ) {
        creatorCounts.set(
          creatorId,
          (
            creatorCounts.get(
              creatorId
            ) ?? 0
          ) + 1
        );
      }
    }

    for (
      const [
        creatorId,
        count,
      ] of creatorCounts
    ) {
      if (count <= 1) {
        continue;
      }

      conflicts.push({
        id:
          `duplicate-creator-${eventDate.id}-${creatorId}`,
        severity: "danger",
        type:
          "creator_double_booked",
        title:
          "Creator scheduled more than once",
        message:
          `${creatorName(
            creatorId
          )} has ${count} battles scheduled on ${eventDate.event_date}.`,
        eventDateId:
          eventDate.id,
        creatorIds: [
          creatorId,
        ],
      });
    }
  }

  /*
   * 4. BLOCKED TIME CONFLICTS
   */
  for (
    const match of
      activeMatches
  ) {
    if (
      !match.event_date_id ||
      !match.schedule_slot_id
    ) {
      continue;
    }

    const slot =
      slotById.get(
        match.schedule_slot_id
      );

    if (!slot) {
      conflicts.push({
        id:
          `invalid-slot-${match.id}`,
        severity: "danger",
        type: "invalid_slot",
        title:
          "Schedule slot not found",
        message:
          "This battle references a schedule slot that no longer exists.",
        eventDateId:
          match.event_date_id,
        matchId: match.id,
      });

      continue;
    }

    for (
      const creatorId of [
        match.creator_one_id,
        match.creator_two_id,
      ]
    ) {
      const blocked =
        blockedMap.get(
          `${match.event_date_id}|${creatorId}`
        );

      if (
        blocked?.has(
          normalizeTime(
            slot.slot_time
          )
        )
      ) {
        conflicts.push({
          id:
            `blocked-${match.id}-${creatorId}`,
          severity: "danger",
          type:
            "blocked_time_conflict",
          title:
            "Creator scheduled during blocked time",
          message:
            `${creatorName(
              creatorId
            )} marked ${slot.slot_time} unavailable but is scheduled at that time.`,
          eventDateId:
            match.event_date_id,
          matchId: match.id,
          creatorIds: [
            creatorId,
          ],
        });
      }
    }
  }

  /*
   * 5. UNMATCHED CREATORS
   */
  for (
    const eventDate of
      eventDates ?? []
  ) {
    const scheduled =
      new Set<string>();

    for (
      const match of
        activeMatches
    ) {
      if (
        match.event_date_id !==
        eventDate.id
      ) {
        continue;
      }

      scheduled.add(
        match.creator_one_id
      );

      scheduled.add(
        match.creator_two_id
      );
    }

    const unmatched =
      signupIds.filter(
        (creatorId) =>
          !scheduled.has(
            creatorId
          )
      );

    for (
      const creatorId of
        unmatched
    ) {
      conflicts.push({
        id:
          `unmatched-${eventDate.id}-${creatorId}`,
        severity: "danger",
        type:
          "unmatched_creator",
        title:
          "Creator is unmatched",
        message:
          `${creatorName(
            creatorId
          )} does not have a battle scheduled for ${eventDate.event_date}.`,
        eventDateId:
          eventDate.id,
        creatorIds: [
          creatorId,
        ],
      });
    }
  }

  /*
   * 6. REPEAT OPPONENTS
   */
  const pairCounts =
    new Map<string, number>();

  for (
    const match of
      activeMatches
  ) {
    const key =
      pairKey(
        match.creator_one_id,
        match.creator_two_id
      );

    pairCounts.set(
      key,
      (
        pairCounts.get(key) ??
        0
      ) + 1
    );
  }

  for (
    const [
      key,
      count,
    ] of pairCounts
  ) {
    if (count <= 1) {
      continue;
    }

    const [
      creatorOneId,
      creatorTwoId,
    ] = key.split("|");

    conflicts.push({
      id:
        `repeat-opponent-${key}`,
      severity: "warning",
      type:
        "repeat_opponent",
      title:
        "Repeat opponent matchup",
      message:
        `${creatorName(
          creatorOneId
        )} and ${creatorName(
          creatorTwoId
        )} are matched ${count} times during this event.`,
      creatorIds: [
        creatorOneId,
        creatorTwoId,
      ],
    });
  }

  /*
   * 7. SAME-AGENCY MATCHES
   */
  for (
    const match of
      activeMatches
  ) {
    const firstAgency =
      agencyByUser.get(
        match.creator_one_id
      );

    const secondAgency =
      agencyByUser.get(
        match.creator_two_id
      );

    if (
      firstAgency &&
      secondAgency &&
      firstAgency ===
        secondAgency
    ) {
      conflicts.push({
        id:
          `same-agency-${match.id}`,
        severity: "warning",
        type:
          "same_agency",
        title:
          "Same-agency matchup",
        message:
          `${creatorName(
            match.creator_one_id
          )} and ${creatorName(
            match.creator_two_id
          )} are from the same agency. Review whether a cross-agency alternative is available.`,
        eventDateId:
          match.event_date_id,
        matchId: match.id,
        creatorIds: [
          match.creator_one_id,
          match.creator_two_id,
        ],
      });
    }
  }

  /*
   * 8. LARGE DIAMOND DIFFERENCE
   *
   * We will initially flag anything
   * over 50,000 diamonds.
   */
  const LARGE_DIAMOND_GAP =
    50000;

  for (
    const match of
      activeMatches
  ) {
    const creatorOne =
      profileByUser.get(
        match.creator_one_id
      );

    const creatorTwo =
      profileByUser.get(
        match.creator_two_id
      );

    const firstDiamonds =
      Number(
        creatorOne?.diamond_level ??
          0
      );

    const secondDiamonds =
      Number(
        creatorTwo?.diamond_level ??
          0
      );

    const difference =
      Math.abs(
        firstDiamonds -
          secondDiamonds
      );

    if (
      difference >
      LARGE_DIAMOND_GAP
    ) {
      conflicts.push({
        id:
          `diamond-gap-${match.id}`,
        severity: "warning",
        type:
          "diamond_mismatch",
        title:
          "Large diamond mismatch",
        message:
          `${creatorName(
            match.creator_one_id
          )} and ${creatorName(
            match.creator_two_id
          )} are ${difference.toLocaleString()} diamonds apart.`,
        eventDateId:
          match.event_date_id,
        matchId: match.id,
        creatorIds: [
          match.creator_one_id,
          match.creator_two_id,
        ],
      });
    }
  }

  /*
   * HEALTH SCORE
   *
   * Danger = -15
   * Warning = -5
   * Info = -1
   */
  const dangerCount =
    conflicts.filter(
      (conflict) =>
        conflict.severity ===
        "danger"
    ).length;

  const warningCount =
    conflicts.filter(
      (conflict) =>
        conflict.severity ===
        "warning"
    ).length;

  const infoCount =
    conflicts.filter(
      (conflict) =>
        conflict.severity ===
        "info"
    ).length;

  const score = Math.max(
    0,
    100 -
      dangerCount * 15 -
      warningCount * 5 -
      infoCount
  );

  let status:
    ScheduleHealthResult["status"] =
      "healthy";

  if (
    dangerCount > 0 ||
    score < 70
  ) {
    status = "critical";
  } else if (
    warningCount > 0 ||
    score < 90
  ) {
    status = "review";
  }

  return {
    score,
    status,

    totalIssues:
      conflicts.length,

    dangerCount,
    warningCount,
    infoCount,

    conflicts,
  };
}