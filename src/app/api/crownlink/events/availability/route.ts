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
      userRole.status !== "active" ||
      !["creator", "admin"].includes(userRole.role)
    ) {
      return NextResponse.json(
        { error: "Creator access required." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const eventId = String(body.eventId || "").trim();
    const timeSlotId = String(
      body.timeSlotId || ""
    ).trim();

    if (!eventId || !timeSlotId) {
      return NextResponse.json(
        { error: "Event and time slot are required." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: signup } = await adminSupabase
      .from("crownlink_event_signups")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .eq("status", "signed_up")
      .maybeSingle();

    if (!signup) {
      return NextResponse.json(
        {
          error:
            "You must be signed up for this event before selecting availability.",
        },
        { status: 400 }
      );
    }

    const { data: timeSlot, error: timeSlotError } =
      await adminSupabase
        .from("crownlink_event_time_slots")
        .select("id, event_id")
        .eq("id", timeSlotId)
        .eq("event_id", eventId)
        .single();

    if (timeSlotError || !timeSlot) {
      return NextResponse.json(
        { error: "Time slot not found." },
        { status: 404 }
      );
    }

    const { error: insertError } =
      await adminSupabase
        .from("crownlink_event_availability")
        .insert({
          event_id: eventId,
          time_slot_id: timeSlotId,
          user_id: user.id,
        });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({
          success: true,
          alreadySelected: true,
        });
      }

      console.error(
        "ADD EVENT AVAILABILITY ERROR:",
        insertError
      );

      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "ADD EVENT AVAILABILITY ERROR:",
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

    const body = await request.json();

    const eventId = String(body.eventId || "").trim();
    const timeSlotId = String(
      body.timeSlotId || ""
    ).trim();

    if (!eventId || !timeSlotId) {
      return NextResponse.json(
        { error: "Event and time slot are required." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { error: deleteError } =
      await adminSupabase
        .from("crownlink_event_availability")
        .delete()
        .eq("event_id", eventId)
        .eq("time_slot_id", timeSlotId)
        .eq("user_id", user.id);

    if (deleteError) {
      console.error(
        "REMOVE EVENT AVAILABILITY ERROR:",
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
      "REMOVE EVENT AVAILABILITY ERROR:",
      error
    );

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}