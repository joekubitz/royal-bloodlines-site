
import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import { rebuildScheduleSlots } from "@/app/lib/crownlink/rebuildScheduleSlots";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const {
      data: userRoles,
      error: roleError,
    } = await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id);

    if (roleError) {
      return NextResponse.json(
        { error: roleError.message },
        { status: 500 }
      );
    }

    const isAdmin = (userRoles ?? []).some(
      (role) =>
        role.role === "admin" &&
        role.status === "active"
    );

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    // Validate signup ID
    const body = await request.json();

    const signupId = String(
      body?.signupId || ""
    ).trim();

    if (!signupId) {
      return NextResponse.json(
        { error: "Signup ID is required." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Find signup
    const {
      data: signups,
      error: signupError,
    } = await adminSupabase
      .from("crownlink_event_signups")
      .select("id, event_id, user_id, status")
      .eq("id", signupId);

    if (signupError) {
      return NextResponse.json(
        { error: signupError.message },
        { status: 500 }
      );
    }

    if (!signups || signups.length === 0) {
      return NextResponse.json(
        { error: "Signup not found." },
        { status: 404 }
      );
    }

    if (signups.length !== 1) {
      return NextResponse.json(
        {
          error:
            "Multiple signups matched this ID. Removal cancelled.",
        },
        { status: 409 }
      );
    }

    const signup = signups[0];

    if (signup.status !== "signed_up") {
      return NextResponse.json(
        {
          error:
            "Only active signups can be removed.",
        },
        { status: 400 }
      );
    }

    if (!signup.user_id) {
      return NextResponse.json(
        {
          error:
            "Signup has no associated user ID.",
        },
        { status: 400 }
      );
    }

    // Check ALL approved matches for this creator
    const {
      data: approvedMatches,
      error: matchError,
    } = await adminSupabase
      .from("crownlink_matches")
      .select("id")
      .eq("event_id", signup.event_id)
      .eq("status", "approved")
      .or(
        `creator_one_id.eq.${signup.user_id},creator_two_id.eq.${signup.user_id}`
      );

    if (matchError) {
      return NextResponse.json(
        { error: matchError.message },
        { status: 500 }
      );
    }

    // Prevent removing creators with approved battles
    if (
      approvedMatches &&
      approvedMatches.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "This creator has an approved battle and cannot be removed until that battle is cancelled.",
        },
        { status: 409 }
      );
    }

    // Remove creator signup
    const {
      data: removedSignups,
      error: removeError,
    } = await adminSupabase
      .from("crownlink_event_signups")
      .update({
        status: "removed",
      })
      .eq("id", signup.id)
      .eq("status", "signed_up")
      .select("id");

    if (removeError) {
      return NextResponse.json(
        { error: removeError.message },
        { status: 500 }
      );
    }

    if (
      !removedSignups ||
      removedSignups.length !== 1
    ) {
      return NextResponse.json(
        {
          error:
            "Signup could not be updated. It may have already been removed.",
        },
        { status: 409 }
      );
    }

    // Rebuild event schedule slots
    try {
      await rebuildScheduleSlots(
        adminSupabase,
        signup.event_id
      );
    } catch (scheduleError) {
      console.error(
        "Schedule rebuild failed after removal:",
        scheduleError
      );

      return NextResponse.json({
        success: true,
        warning:
          "Creator removed, but schedule slots could not be rebuilt.",
      });
    }

    return NextResponse.json({
      success: true,
      message:
        "Creator removed from the event successfully.",
    });
  } catch (error) {
    console.error(
      "Remove Bloodline Arena signup error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong removing the creator.",
      },
      { status: 500 }
    );
  }
}
