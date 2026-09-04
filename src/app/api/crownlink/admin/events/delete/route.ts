import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

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

    const eventId = String(
      body.eventId || ""
    ).trim();

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required." },
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
      .select("id, name")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError) {
      throw new Error(
        eventError.message
      );
    }

    if (!event) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 }
      );
    }

    const {
      error: deleteError,
    } = await adminSupabase
      .from("crownlink_events")
      .delete()
      .eq("id", eventId);

    if (deleteError) {
      throw new Error(
        deleteError.message
      );
    }

    return NextResponse.json({
      success: true,
      eventName: event.name,
    });
  } catch (error) {
    console.error(
      "DELETE CROWN LINK EVENT ERROR:",
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