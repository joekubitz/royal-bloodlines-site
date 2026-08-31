import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

function timeToMinutes(timeString: string) {
  const [hourString, minuteString] =
    timeString.split(":");

  return (
    Number(hourString) * 60 +
    Number(minuteString)
  );
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(
    totalMinutes / 60
  );

  const minutes =
    totalMinutes % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(
    2,
    "0"
  )}:00`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Not authenticated.",
        },
        {
          status: 401,
        }
      );
    }

    const { data: userRole } =
      await supabase
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
        {
          status: 403,
        }
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
        {
          status: 400,
        }
      );
    }

    const adminSupabase =
      createAdminClient();

    /*
     * Load event scheduling settings.
     */
    const {
      data: event,
      error: eventError,
    } = await adminSupabase
      .from("crownlink_events")
      .select(`
        id,
        name,
        event_time,
        battle_interval_minutes,
        status
      `)
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
        {
          status: 404,
        }
      );
    }

    /*
     * Load every required date.
     */
    const {
      data: requiredDates,
      error: datesError,
    } = await adminSupabase
      .from("crownlink_event_dates")
      .select(`
        id,
        event_date
      `)
      .eq("event_id", eventId)
      .order("event_date", {
        ascending: true,
      });

    if (datesError) {
      console.error(
        "LOAD REQUIRED DATES ERROR:",
        datesError
      );

      return NextResponse.json(
        {
          error: datesError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      !requiredDates ||
      requiredDates.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "This event does not have any required dates.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Count active signed-up creators.
     */
    const {
      data: signups,
      error: signupsError,
    } = await adminSupabase
      .from("crownlink_event_signups")
      .select(`
        id,
        user_id
      `)
      .eq("event_id", eventId)
      .eq("status", "signed_up");

    if (signupsError) {
      console.error(
        "LOAD EVENT SIGNUPS ERROR:",
        signupsError
      );

      return NextResponse.json(
        {
          error: signupsError.message,
        },
        {
          status: 500,
        }
      );
    }

    const creatorCount =
      signups?.length ?? 0;

    /*
     * Two creators per battle.
     *
     * An odd creator count gets one
     * extra potential slot. Later the
     * scheduler will flag the schedule
     * incomplete until that creator
     * receives an opponent.
     */
    const slotsPerDate =
      Math.ceil(
        creatorCount / 2
      );

    const interval =
      Number(
        event.battle_interval_minutes
      ) || 10;

    const firstBattleMinutes =
      timeToMinutes(
        event.event_time
      );

    /*
     * Make sure generated battle times
     * do not cross midnight.
     */
    if (slotsPerDate > 0) {
      const lastBattleMinutes =
        firstBattleMinutes +
        (slotsPerDate - 1) *
          interval;

      if (
        lastBattleMinutes >=
        24 * 60
      ) {
        return NextResponse.json(
          {
            error:
              "The generated schedule would continue past midnight. Change the first battle time or battle interval.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * Remove old generated slots for
     * this event before rebuilding.
     */
    const {
      error: deleteError,
    } = await adminSupabase
      .from(
        "crownlink_schedule_slots"
      )
      .delete()
      .eq("event_id", eventId);

    if (deleteError) {
      console.error(
        "DELETE OLD SCHEDULE SLOTS ERROR:",
        deleteError
      );

      return NextResponse.json(
        {
          error: deleteError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
     * If nobody is signed up yet,
     * clearing the old schedule is all
     * we need to do.
     */
    if (slotsPerDate === 0) {
      return NextResponse.json({
        success: true,
        creatorCount: 0,
        requiredDateCount:
          requiredDates.length,
        slotsPerDate: 0,
        totalSlots: 0,
        hasOddCreatorCount: false,
        message:
          "No creators are currently signed up.",
      });
    }

    const slotsToInsert =
      requiredDates.flatMap(
        (requiredDate) => {
          return Array.from(
            {
              length: slotsPerDate,
            },
            (_, index) => {
              const slotMinutes =
                firstBattleMinutes +
                index * interval;

              return {
                event_id: eventId,
                event_date_id:
                  requiredDate.id,
                slot_time:
                  minutesToTime(
                    slotMinutes
                  ),
              };
            }
          );
        }
      );

    const {
      data: createdSlots,
      error: insertError,
    } = await adminSupabase
      .from(
        "crownlink_schedule_slots"
      )
      .insert(slotsToInsert)
      .select();

    if (insertError) {
      console.error(
        "CREATE SCHEDULE SLOTS ERROR:",
        insertError
      );

      return NextResponse.json(
        {
          error: insertError.message,
        },
        {
          status: 500,
        }
      );
    }

    const hasOddCreatorCount =
      creatorCount % 2 !== 0;

    return NextResponse.json({
      success: true,

      creatorCount,

      requiredDateCount:
        requiredDates.length,

      slotsPerDate,

      totalSlots:
        createdSlots?.length ?? 0,

      hasOddCreatorCount,

      message:
        hasOddCreatorCount
          ? `Generated ${slotsPerDate} battle times per date. There are ${creatorCount} creators, so the final schedule will remain incomplete until the unmatched creator receives an opponent.`
          : `Generated ${slotsPerDate} battle times per required date.`,
    });
  } catch (error) {
    console.error(
      "GENERATE CROWN LINK SLOTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected server error.",
      },
      {
        status: 500,
      }
    );
  }
}