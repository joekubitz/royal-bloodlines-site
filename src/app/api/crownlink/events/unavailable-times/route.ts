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
      !["creator", "admin"].includes(
        userRole.role
      ) ||
      userRole.status !== "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Active creator access required.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const eventId = String(
      body.eventId || ""
    ).trim();

    const eventDateId = String(
      body.eventDateId || ""
    ).trim();

    const blockedTime = String(
      body.blockedTime || ""
    ).trim();

    if (
      !eventId ||
      !eventDateId ||
      !blockedTime
    ) {
      return NextResponse.json(
        {
          error:
            "Event, event date, and blocked time are required.",
        },
        { status: 400 }
      );
    }

    const adminSupabase =
      createAdminClient();

    const {
      data: signup,
      error: signupError,
    } = await adminSupabase
      .from("crownlink_event_signups")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      signupError ||
      !signup ||
      signup.status !== "signed_up"
    ) {
      return NextResponse.json(
        {
          error:
            "You must be signed up for this event first.",
        },
        { status: 403 }
      );
    }

    const {
      data: eventDate,
      error: eventDateError,
    } = await adminSupabase
      .from("crownlink_event_dates")
      .select("id, event_id")
      .eq("id", eventDateId)
      .eq("event_id", eventId)
      .maybeSingle();

    if (
      eventDateError ||
      !eventDate
    ) {
      return NextResponse.json(
        {
          error:
            "Required event date not found.",
        },
        { status: 404 }
      );
    }

    const {
      data: blockedRecord,
      error: insertError,
    } = await adminSupabase
      .from(
        "crownlink_event_unavailable_times"
      )
      .insert({
        event_id: eventId,
        event_date_id: eventDateId,
        user_id: user.id,
        blocked_time: blockedTime,
      })
      .select()
      .single();

    if (insertError) {
      if (
        insertError.code === "23505"
      ) {
        return NextResponse.json(
          {
            error:
              "That time is already marked unavailable.",
          },
          { status: 409 }
        );
      }

      console.error(
        "ADD UNAVAILABLE TIME ERROR:",
        insertError
      );

      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      unavailableTime: blockedRecord,
    });
  } catch (error) {
    console.error(
      "ADD UNAVAILABLE TIME ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request
) {
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

    const body = await request.json();

    const unavailableTimeId = String(
      body.unavailableTimeId || ""
    ).trim();

    if (!unavailableTimeId) {
      return NextResponse.json(
        {
          error:
            "Unavailable time ID is required.",
        },
        { status: 400 }
      );
    }

    const adminSupabase =
      createAdminClient();

    const {
      data: unavailableTime,
      error: lookupError,
    } = await adminSupabase
      .from(
        "crownlink_event_unavailable_times"
      )
      .select("id, user_id")
      .eq("id", unavailableTimeId)
      .maybeSingle();

    if (
      lookupError ||
      !unavailableTime
    ) {
      return NextResponse.json(
        {
          error:
            "Unavailable time not found.",
        },
        { status: 404 }
      );
    }

    if (
      unavailableTime.user_id !==
      user.id
    ) {
      return NextResponse.json(
        {
          error:
            "You can only remove your own unavailable times.",
        },
        { status: 403 }
      );
    }

    const { error: deleteError } =
      await adminSupabase
        .from(
          "crownlink_event_unavailable_times"
        )
        .delete()
        .eq("id", unavailableTimeId);

    if (deleteError) {
      console.error(
        "REMOVE UNAVAILABLE TIME ERROR:",
        deleteError
      );

      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "REMOVE UNAVAILABLE TIME ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}