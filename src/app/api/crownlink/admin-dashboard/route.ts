import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Authenticate the iOS user
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const accessToken = authorization.replace("Bearer ", "").trim();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid session",
        },
        { status: 401 }
      );
    }

    // Verify administrator role
    const { data: adminRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .eq("status", "active")
      .maybeSingle();

    if (roleError) {
      console.error("Admin role lookup failed:", roleError);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify administrator access",
        },
        { status: 500 }
      );
    }

    if (!adminRole) {
      return NextResponse.json(
        {
          success: false,
          error: "Administrator access required",
        },
        { status: 403 }
      );
    }

    // Active creator accounts
    const { count: creatorCount, error: creatorError } = await supabase
      .from("crownlink_profiles")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("profile_status", "active");

    if (creatorError) {
      console.error("Creator count failed:", creatorError);
    }

    // Creator accounts waiting for approval
    const { count: pendingApprovalCount, error: approvalError } =
      await supabase
        .from("crownlink_profiles")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("profile_status", "pending");

    if (approvalError) {
      console.error("Pending approval count failed:", approvalError);
    }

    // Approved battles
    const { count: upcomingBattleCount, error: battleError } =
      await supabase
        .from("crownlink_matches")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("status", "approved");

    if (battleError) {
      console.error("Upcoming battle count failed:", battleError);
    }

    // Rewards that have not been dropped yet
    const { count: pendingRewardCount, error: rewardError } =
      await supabase
        .from("creator_rewards")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("dropped", false);

    if (rewardError) {
      console.error("Pending reward count failed:", rewardError);
    }

    return NextResponse.json({
      success: true,

      totals: {
        creators: creatorCount ?? 0,
        pending_approvals: pendingApprovalCount ?? 0,
        upcoming_battles: upcomingBattleCount ?? 0,
        pending_rewards: pendingRewardCount ?? 0,
      },
    });
  } catch (error) {
    console.error("Admin dashboard API error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load admin dashboard",
      },
      { status: 500 }
    );
  }
}
