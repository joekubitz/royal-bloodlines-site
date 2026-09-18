import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
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

async function rebuildScheduleSlots(
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

  const { error: deleteError } =
    await adminSupabase
      .from(
        "crownlink_schedule_slots"
      )
      .delete()
      .eq("event_id", eventId);

  if (deleteError) {
    throw new Error(
      deleteError.message
    );
  }

  if (
    creatorCount === 0 ||
    !requiredDates ||
    requiredDates.length === 0
  ) {
    return;
  }

  const rows =
    requiredDates.flatMap(
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

  const {
    error: insertError,
  } = await adminSupabase
    .from(
      "crownlink_schedule_slots"
    )
    .insert(rows);

  if (insertError) {
    throw new Error(
      insertError.message
    );
  }
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
      userRole.role !==
        "admin" ||
      userRole.status !==
        "active"
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

    const eventDate = String(
      body.eventDate || ""
    ).trim();

    if (
      !eventId ||
      !eventDate
    ) {
      return NextResponse.json(
        {
          error:
            "Event and event date are required.",
        },
        { status: 400 }
      );
    }

    const adminSupabase =
      createAdminClient();

    /*
     * Make sure the event exists.
     */
    const {
      data: event,
      error: eventError,
    } = await adminSupabase
      .from(
        "crownlink_events"
      )
      .select("id")
      .eq("id", eventId)
      .maybeSingle();

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

    /*
     * Add the required date.
     */
    const {
      data: eventDateRecord,
      error: insertError,
    } = await adminSupabase
      .from(
        "crownlink_event_dates"
      )
      .insert({
        event_id: eventId,
        event_date:
          eventDate,
      })
      .select()
      .single();

    if (insertError) {
      /*
       * Duplicate date.
       */
      if (
        insertError.code ===
        "23505"
      ) {
        return NextResponse.json(
          {
            error:
              "That date is already part of this event.",
          },
          { status: 409 }
        );
      }

      console.error(
        "ADD BLOODLINE ARENA EVENT DATE ERROR:",
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

    /*
     * Automatically rebuild all
     * schedule times now that a
     * required date was added.
     */
    await rebuildScheduleSlots(
      adminSupabase,
      eventId
    );

    return NextResponse.json({
      success: true,
      eventDate:
        eventDateRecord,
    });
  } catch (error) {
    console.error(
      "ADD BLOODLINE ARENA EVENT DATE ERROR:",
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

export async function DELETE(
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
      userRole.role !==
        "admin" ||
      userRole.status !==
        "active"
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

    const eventDateId =
      String(
        body.eventDateId ||
          ""
      ).trim();

    if (!eventDateId) {
      return NextResponse.json(
        {
          error:
            "Event date ID is required.",
        },
        { status: 400 }
      );
    }

    const adminSupabase =
      createAdminClient();

    /*
     * Get the event ID before
     * deleting the date.
     */
    const {
      data: eventDateRecord,
      error:
        eventDateLookupError,
    } = await adminSupabase
      .from(
        "crownlink_event_dates"
      )
      .select(`
        id,
        event_id
      `)
      .eq(
        "id",
        eventDateId
      )
      .maybeSingle();

    if (
      eventDateLookupError
    ) {
      return NextResponse.json(
        {
          error:
            eventDateLookupError.message,
        },
        { status: 500 }
      );
    }

    if (
      !eventDateRecord
    ) {
      return NextResponse.json(
        {
          error:
            "Event date not found.",
        },
        { status: 404 }
      );
    }

    const {
      error: deleteError,
    } = await adminSupabase
      .from(
        "crownlink_event_dates"
      )
      .delete()
      .eq(
        "id",
        eventDateId
      );

    if (deleteError) {
      console.error(
        "REMOVE BLOODLINE ARENA EVENT DATE ERROR:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            deleteError.message,
        },
        { status: 500 }
      );
    }

    /*
     * Automatically rebuild the
     * remaining schedule times.
     */
    await rebuildScheduleSlots(
      adminSupabase,
      eventDateRecord.event_id
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "REMOVE BLOODLINE ARENA EVENT DATE ERROR:",
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
export async function GET(request: Request) {
  try {
    const authorization =
      request.headers.get("authorization");

    let userId: string | null = null;

    /*
     * Native iOS / Android authentication.
     */
    if (
      authorization?.startsWith("Bearer ")
    ) {
      const accessToken =
        authorization
          .slice("Bearer ".length)
          .trim();

      const adminSupabase =
        createAdminClient();

      const {
        data: { user },
        error: userError,
      } =
        await adminSupabase.auth.getUser(
          accessToken
        );

      if (userError || !user) {
        return NextResponse.json(
          {
            error:
              "Not authenticated.",
          },
          { status: 401 }
        );
      }

      userId = user.id;
    } else {
      /*
       * Existing website cookie authentication.
       */
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

      userId = user.id;
    }

    const adminSupabase =
      createAdminClient();

    /*
     * Make sure this is an active
     * Bloodline Arena account.
     */
    const {
      data: userRole,
      error: roleError,
    } = await adminSupabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", userId)
      .single();

    if (
      roleError ||
      !userRole ||
      userRole.status !== "active" ||
      ![
        "creator",
        "agent",
        "admin",
      ].includes(userRole.role)
    ) {
      return NextResponse.json(
        {
          error:
            "Bloodline Arena access required.",
        },
        { status: 403 }
      );
    }

    /*
     * Return upcoming required event dates.
     *
     * Use Eastern Time because Bloodline Arena
     * uses Eastern Time throughout the platform.
     */
    const easternDate =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            "America/New_York",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }
      ).format(new Date());

    const {
      data: eventDates,
      error: datesError,
    } = await adminSupabase
      .from("crownlink_event_dates")
      .select(`
        id,
        event_id,
        event_date
      `)
      .gte(
        "event_date",
        easternDate
      )
      .order(
        "event_date",
        {
          ascending: true,
        }
      );

    if (datesError) {
      console.error(
        "LOAD BLOODLINE ARENA EVENT DATES ERROR:",
        datesError
      );

      return NextResponse.json(
        {
          error:
            datesError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      eventDates:
        eventDates ?? [],
    });
  } catch (error) {
    console.error(
      "LOAD BLOODLINE ARENA EVENT DATES ERROR:",
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