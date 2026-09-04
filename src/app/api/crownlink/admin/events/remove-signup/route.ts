import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import { rebuildScheduleSlots } from "@/app/lib/crownlink/rebuildScheduleSlots";

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
        { status: 401 }
      );
    }

    const {
      data: userRole,
      error: roleError,
    } = await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .single();

    if (
      roleError ||
      !userRole ||
      userRole.role !== "admin" ||
      userRole.status !== "active"
    ) {
      return NextResponse.json(
        {
          error: "Admin access required.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const signupId = String(
      body?.signupId || ""
    ).trim();

    if (!signupId) {
      return NextResponse.json(
        {
          error: "Signup ID is required.",
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
      .select(
        "id, event_id, user_id, status"
      )
      .eq("id", signupId)
      .maybeSingle();

    if (signupError) {
      return NextResponse.json(
        {
          error: signupError.message,
        },
        { status: 500 }
      );
    }

    if (!signup) {
      return NextResponse.json(
        {
          error: "Signup not found.",
        },
        { status: 404 }
      );
    }

    if (
      signup.status !== "signed_up"
    ) {
      return NextResponse.json(
        {
          error:
            "Only active signups can be removed.",
        },
        { status: 400 }
      );
    }

    const {
      data: approvedMatch,
      error: matchError,
    } = await adminSupabase
      .from("crownlink_matches")
      .select("id")
      .eq(
        "event_id",
        signup.event_id
      )
      .eq("status", "approved")
      .or(
        `creator_one_id.eq.${signup.user_id},creator_two_id.eq.${signup.user_id}`
      )
      .maybeSingle();

    if (matchError) {
      return NextResponse.json(
        {
          error: matchError.message,
        },
        { status: 500 }
      );
    }

    if (approvedMatch) {
      return NextResponse.json(
        {
          error:
            "This creator has an approved battle and cannot be removed until that battle is cancelled.",
        },
        { status: 409 }
      );
    }

    const { error: removeError } =
      await adminSupabase
        .from(
          "crownlink_event_signups"
        )
        .update({
          status: "removed",
        })
        .eq("id", signup.id)
        .eq(
          "status",
          "signed_up"
        );

    if (removeError) {
      return NextResponse.json(
        {
          error: removeError.message,
        },
        { status: 500 }
      );
    }

    await rebuildScheduleSlots(
      adminSupabase,
      signup.event_id
    );

    return NextResponse.json({
      success: true,
      message:
        "Creator removed from the event successfully.",
    });
  } catch (error) {
    console.error(
      "Remove Crown Link signup error:",
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