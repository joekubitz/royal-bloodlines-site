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
    const eventId = String(body.eventId ?? "").trim();

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: event, error: eventError } = await adminSupabase
      .from("crownlink_events")
      .select("id, name, status")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError) {
      return NextResponse.json(
        { error: eventError.message },
        { status: 500 }
      );
    }

    if (!event) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 }
      );
    }

    if (event.status === "archived") {
      return NextResponse.json({
        success: true,
        eventId: event.id,
        message: "Event is already archived.",
      });
    }

    const { error: archiveError } = await adminSupabase
      .from("crownlink_events")
      .update({
        status: "archived",
      })
      .eq("id", event.id);

    if (archiveError) {
      return NextResponse.json(
        { error: archiveError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      eventId: event.id,
      message: `${event.name} was archived.`,
    });
  } catch (error) {
    console.error("Archive Crown Link event error:", error);

    return NextResponse.json(
      { error: "Something went wrong while archiving the event." },
      { status: 500 }
    );
  }
}
