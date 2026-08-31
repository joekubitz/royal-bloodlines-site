import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

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

    const name = String(body.name || "").trim();

    const description = String(
      body.description || ""
    ).trim();

    const prizeInformation = String(
      body.prizeInformation || ""
    ).trim();

    const eventDate = String(
      body.eventDate || ""
    ).trim();

    const eventTime = String(
      body.eventTime || ""
    ).trim();

    const battleIntervalMinutes = Number(
      body.battleIntervalMinutes
    );

    if (!name) {
      return NextResponse.json(
        { error: "Event name is required." },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        {
          error:
            "Event description is required.",
        },
        { status: 400 }
      );
    }

    if (!eventDate) {
      return NextResponse.json(
        { error: "Event date is required." },
        { status: 400 }
      );
    }

    if (!eventTime) {
      return NextResponse.json(
        {
          error:
            "First battle time is required.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(
        battleIntervalMinutes
      ) ||
      battleIntervalMinutes <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Battle interval must be at least 1 minute.",
        },
        { status: 400 }
      );
    }

    const adminSupabase =
      createAdminClient();

    /*
     * Create the main event.
     */
    const {
      data: event,
      error: createEventError,
    } = await adminSupabase
      .from("crownlink_events")
      .insert({
        name,
        description,
        prize_information:
          prizeInformation || null,

        /*
         * Keep these existing fields for now
         * so we don't break the rest of the site.
         *
         * event_date currently acts as the first
         * required date.
         *
         * event_time now acts as the first battle
         * time for each required date.
         */
        event_date: eventDate,
        event_time: eventTime,

        battle_interval_minutes:
          battleIntervalMinutes,

        status: "active",
        created_by: user.id,
      })
      .select()
      .single();

    if (createEventError) {
      console.error(
        "CREATE CROWN LINK EVENT ERROR:",
        createEventError
      );

      return NextResponse.json(
        {
          error:
            createEventError.message,
        },
        { status: 500 }
      );
    }

    /*
     * Automatically create the first required
     * event date.
     */
    const {
      error: createDateError,
    } = await adminSupabase
      .from("crownlink_event_dates")
      .insert({
        event_id: event.id,
        event_date: eventDate,
      });

    if (createDateError) {
      console.error(
        "CREATE CROWN LINK EVENT DATE ERROR:",
        createDateError
      );

      /*
       * Remove the event if its first required
       * date could not be created.
       *
       * This prevents us from leaving behind
       * a partially-created event.
       */
      await adminSupabase
        .from("crownlink_events")
        .delete()
        .eq("id", event.id);

      return NextResponse.json(
        {
          error:
            "The event could not be completed because its first event date could not be created.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error(
      "CREATE CROWN LINK EVENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}