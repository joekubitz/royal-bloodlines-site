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

    const eventId = String(body.eventId || "").trim();
    const slotTime = String(body.slotTime || "").trim();

    if (!eventId) {
      return NextResponse.json(
        { error: "Event is required." },
        { status: 400 }
      );
    }

    if (!slotTime) {
      return NextResponse.json(
        { error: "Time slot is required." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: event, error: eventError } =
      await adminSupabase
        .from("crownlink_events")
        .select("id")
        .eq("id", eventId)
        .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 }
      );
    }

    const { data: timeSlot, error: timeSlotError } =
      await adminSupabase
        .from("crownlink_event_time_slots")
        .insert({
          event_id: eventId,
          slot_time: slotTime,
          capacity: 2,
        })
        .select()
        .single();

    if (timeSlotError) {
      console.error(
        "CREATE CROWN LINK TIME SLOT ERROR:",
        timeSlotError
      );

      if (timeSlotError.code === "23505") {
        return NextResponse.json(
          {
            error:
              "That time slot already exists for this event.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: timeSlotError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      timeSlot,
    });
  } catch (error) {
    console.error(
      "CREATE CROWN LINK TIME SLOT ERROR:",
      error
    );

    return NextResponse.json(
      { error: "Unexpected server error." },
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

    const timeSlotId = String(
      body.timeSlotId || ""
    ).trim();

    if (!timeSlotId) {
      return NextResponse.json(
        { error: "Time slot is required." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: existingTimeSlot, error: timeSlotError } =
      await adminSupabase
        .from("crownlink_event_time_slots")
        .select("id")
        .eq("id", timeSlotId)
        .single();

    if (timeSlotError || !existingTimeSlot) {
      return NextResponse.json(
        { error: "Time slot not found." },
        { status: 404 }
      );
    }

    const { error: deleteError } =
      await adminSupabase
        .from("crownlink_event_time_slots")
        .delete()
        .eq("id", timeSlotId);

    if (deleteError) {
      console.error(
        "DELETE CROWN LINK TIME SLOT ERROR:",
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
      "DELETE CROWN LINK TIME SLOT ERROR:",
      error
    );

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}