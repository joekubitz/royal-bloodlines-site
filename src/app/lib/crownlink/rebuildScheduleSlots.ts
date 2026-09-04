import { createAdminClient } from "@/app/supabase/admin";

function timeToMinutes(timeString: string) {
  const [hours, minutes] =
    timeString.split(":").map(Number);

  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(
    2,
    "0"
  )}:00`;
}

function normalizeTime(timeString: string) {
  return timeString.slice(0, 8);
}

export async function rebuildScheduleSlots(
  adminSupabase: ReturnType<
    typeof createAdminClient
  >,
  eventId: string
) {
  const {
    data: event,
    error: eventError,
  } = await adminSupabase
    .from("crownlink_events")
    .select(`
      id,
      event_time,
      battle_interval_minutes
    `)
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    throw new Error(
      eventError?.message ||
        "Event could not be found."
    );
  }

  const {
    data: requiredDates,
    error: datesError,
  } = await adminSupabase
    .from("crownlink_event_dates")
    .select(`
      id,
      event_date
    `)
    .eq("event_id", eventId);

  if (datesError) {
    throw new Error(
      datesError.message
    );
  }

  const {
    data: signups,
    error: signupsError,
  } = await adminSupabase
    .from("crownlink_event_signups")
    .select("id")
    .eq("event_id", eventId)
    .eq("status", "signed_up");

  if (signupsError) {
    throw new Error(
      signupsError.message
    );
  }

  const creatorCount =
    signups?.length ?? 0;

  const slotsPerDate =
    Math.ceil(creatorCount / 2);

  const interval =
    event.battle_interval_minutes ??
    10;

  const startMinutes =
    timeToMinutes(
      event.event_time
    );

  if (slotsPerDate > 0) {
    const lastSlotMinutes =
      startMinutes +
      (slotsPerDate - 1) *
        interval;

    if (
      lastSlotMinutes >=
      24 * 60
    ) {
      throw new Error(
        "The generated battle schedule would continue past midnight."
      );
    }
  }

  const {
    data: existingSlots,
    error: existingSlotsError,
  } = await adminSupabase
    .from(
      "crownlink_schedule_slots"
    )
    .select(`
      id,
      event_date_id,
      slot_time
    `)
    .eq("event_id", eventId);

  if (existingSlotsError) {
    throw new Error(
      existingSlotsError.message
    );
  }

  const {
    data: activeMatches,
    error: activeMatchesError,
  } = await adminSupabase
    .from("crownlink_matches")
    .select(`
      id,
      schedule_slot_id
    `)
    .eq("event_id", eventId)
    .in("status", [
      "suggested",
      "approved",
    ]);

  if (activeMatchesError) {
    throw new Error(
      activeMatchesError.message
    );
  }

  const protectedSlotIds =
    new Set(
      (activeMatches ?? [])
        .map(
          (match) =>
            match.schedule_slot_id
        )
        .filter(
          (
            slotId
          ): slotId is string =>
            Boolean(slotId)
        )
    );

  const desiredRows =
    (requiredDates ?? []).flatMap(
      (requiredDate) =>
        Array.from(
          {
            length:
              slotsPerDate,
          },
          (_, index) => ({
            event_id:
              eventId,
            event_date_id:
              requiredDate.id,
            slot_time:
              minutesToTime(
                startMinutes +
                  index *
                    interval
              ),
          })
        )
    );

  const desiredKeys =
    new Set(
      desiredRows.map(
        (row) =>
          `${row.event_date_id}|${normalizeTime(
            row.slot_time
          )}`
      )
    );

  const existingKeyMap =
    new Map(
      (existingSlots ?? []).map(
        (slot) => [
          `${slot.event_date_id}|${normalizeTime(
            slot.slot_time
          )}`,
          slot,
        ]
      )
    );

  const rowsToInsert =
    desiredRows.filter(
      (row) =>
        !existingKeyMap.has(
          `${row.event_date_id}|${normalizeTime(
            row.slot_time
          )}`
        )
    );

  if (rowsToInsert.length > 0) {
    const {
      error: insertError,
    } = await adminSupabase
      .from(
        "crownlink_schedule_slots"
      )
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(
        insertError.message
      );
    }
  }

  const slotIdsToDelete =
    (existingSlots ?? [])
      .filter((slot) => {
        const key =
          `${slot.event_date_id}|${normalizeTime(
            slot.slot_time
          )}`;

        return (
          !desiredKeys.has(key) &&
          !protectedSlotIds.has(
            slot.id
          )
        );
      })
      .map((slot) => slot.id);

  if (
    slotIdsToDelete.length > 0
  ) {
    const {
      error: deleteError,
    } = await adminSupabase
      .from(
        "crownlink_schedule_slots"
      )
      .delete()
      .in(
        "id",
        slotIdsToDelete
      );

    if (deleteError) {
      throw new Error(
        deleteError.message
      );
    }
  }

  return {
    creatorCount,
    slotsPerDate,
    requiredDateCount:
      requiredDates?.length ?? 0,
    slotsAdded:
      rowsToInsert.length,
    slotsRemoved:
      slotIdsToDelete.length,
    protectedSlots:
      protectedSlotIds.size,
  };
}
