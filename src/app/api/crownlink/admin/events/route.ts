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
    const eventDate = String(body.eventDate || "").trim();
    const eventTime = String(body.eventTime || "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Event name is required." },
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
        { error: "Event time is required." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: event, error: createEventError } =
      await adminSupabase
        .from("crownlink_events")
        .insert({
          name,
          event_date: eventDate,
          event_time: eventTime,
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
        { error: createEventError.message },
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
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}