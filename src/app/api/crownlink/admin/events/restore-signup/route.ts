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
      signup.status !== "removed"
    ) {
      return NextResponse.json(
        {
          error:
            "Only admin-removed signups can be restored.",
        },
        { status: 400 }
      );
    }

    const {
      data: creatorRole,
      error: creatorRoleError,
    } = await adminSupabase
      .from("user_roles")
      .select("role, status")
      .eq(
        "user_id",
        signup.user_id
      )
      .maybeSingle();

    if (creatorRoleError) {
      return NextResponse.json(
        {
          error:
            creatorRoleError.message,
        },
        { status: 500 }
      );
    }

    if (
      !creatorRole ||
      creatorRole.role !== "creator" ||
      creatorRole.status !== "active"
    ) {
      return NextResponse.json(
        {
          error:
            "This creator is not currently an active Bloodline Arena creator.",
        },
        { status: 400 }
      );
    }

    const { error: restoreError } =
      await adminSupabase
        .from(
          "crownlink_event_signups"
        )
        .update({
          status: "signed_up",
        })
        .eq("id", signup.id)
        .eq(
          "status",
          "removed"
        );

    if (restoreError) {
      return NextResponse.json(
        {
          error:
            restoreError.message,
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
        "Creator restored to the event successfully.",
    });
  } catch (error) {
    console.error(
      "Restore Bloodline Arena signup error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong restoring the creator.",
      },
      { status: 500 }
    );
  }
}