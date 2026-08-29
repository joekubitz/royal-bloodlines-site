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

    const userId = String(body.userId || "");
    const status = String(body.status || "");

    if (!userId) {
      return NextResponse.json(
        { error: "Creator user ID is required." },
        { status: 400 }
      );
    }

    if (!["active", "suspended"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: targetRole, error: targetRoleError } =
      await adminSupabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

    if (
      targetRoleError ||
      !targetRole ||
      targetRole.role !== "creator"
    ) {
      return NextResponse.json(
        { error: "Creator account not found." },
        { status: 404 }
      );
    }

    const { error: roleUpdateError } = await adminSupabase
      .from("user_roles")
      .update({
        status,
      })
      .eq("user_id", userId);

    if (roleUpdateError) {
      return NextResponse.json(
        { error: roleUpdateError.message },
        { status: 500 }
      );
    }

    const { error: profileUpdateError } =
      await adminSupabase
        .from("crownlink_profiles")
        .update({
          profile_status: status,
        })
        .eq("user_id", userId);

    if (profileUpdateError) {
      return NextResponse.json(
        { error: profileUpdateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error(
      "CROWN LINK CREATOR STATUS ERROR:",
      error
    );

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}