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

    const eventId = String(
      body.eventId || ""
    ).trim();

    const eventDate = String(
      body.eventDate || ""
    ).trim();

    if (!eventId || !eventDate) {
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

    const {
      data: event,
      error: eventError,
    } = await adminSupabase
      .from("crownlink_events")
      .select("id")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 }
      );
    }

    const {
      data: eventDateRecord,
      error: insertError,
    } = await adminSupabase
      .from("crownlink_event_dates")
      .insert({
        event_id: eventId,
        event_date: eventDate,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            error:
              "That date is already part of this event.",
          },
          { status: 409 }
        );
      }

      console.error(
        "ADD CROWN LINK EVENT DATE ERROR:",
        insertError
      );

      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      eventDate: eventDateRecord,
    });
  } catch (error) {
    console.error(
      "ADD CROWN LINK EVENT DATE ERROR:",
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

export async function DELETE(request: Request) {
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

    const eventDateId = String(
      body.eventDateId || ""
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

    const { error: deleteError } =
      await adminSupabase
        .from("crownlink_event_dates")
        .delete()
        .eq("id", eventDateId);

    if (deleteError) {
      console.error(
        "REMOVE CROWN LINK EVENT DATE ERROR:",
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
      "REMOVE CROWN LINK EVENT DATE ERROR:",
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