import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getAuthenticatedUser(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization");

  if (
    authorization &&
    authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    const accessToken =
      authorization.slice(7).trim();

    if (!accessToken) {
      return null;
    }

    const adminSupabase =
      createAdminClient();

    const {
      data: { user },
      error,
    } =
      await adminSupabase.auth.getUser(
        accessToken
      );

    if (error || !user) {
      return null;
    }

    return user;
  }

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  return user ?? null;
}

export async function GET(
  request: NextRequest
) {
  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const adminSupabase =
      createAdminClient();

    /*
     * VERIFY ACTIVE CREATOR ROLE
     */
    const {
      data: userRole,
      error: roleError,
    } = await adminSupabase
      .from("user_roles")
      .select(`
        role,
        status
      `)
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

    if (
      roleError ||
      !userRole ||
      userRole.status !== "active" ||
      userRole.role !== "creator"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Creator access required.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * FIND CREATOR PROFILE
     */
    const {
      data: profile,
      error: profileError,
    } = await adminSupabase
      .from("crownlink_profiles")
      .select(`
        id,
        display_name,
        tiktok_username
      `)
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

    if (profileError) {
      console.error(
        "Native rewards profile error:",
        profileError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load creator profile.",
        },
        {
          status: 500,
        }
      );
    }

    if (!profile?.id) {
      return NextResponse.json({
        success: true,
        rewards: [],
        pendingCount: 0,
        deliveredCount: 0,
      });
    }

    /*
     * LOAD CREATOR REWARDS
     */
    const {
      data: rewardData,
      error: rewardError,
    } = await adminSupabase
      .from("rewards")
      .select(`
        id,
        reward_month,
        reward_type,
        reward_name,
        level,
        gift,
        coins,
        money,
        dropped,
        dropped_at,
        proof_url,
        typical_live_times,
        live_timezone,
        created_at
      `)
      .eq(
        "creator_id",
        profile.id
      )
      .order(
        "dropped",
        {
          ascending: true,
        }
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (rewardError) {
      console.error(
        "Native rewards load error:",
        rewardError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load rewards.",
        },
        {
          status: 500,
        }
      );
    }

    const rewards =
      rewardData ?? [];

    const pendingCount =
      rewards.filter(
        (reward) =>
          !reward.dropped
      ).length;

    const deliveredCount =
      rewards.filter(
        (reward) =>
          reward.dropped
      ).length;

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        display_name:
          profile.display_name,
        tiktok_username:
          profile.tiktok_username,
      },
      rewards,
      pendingCount,
      deliveredCount,
    });
  } catch (error) {
    console.error(
      "Native rewards API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to load rewards.",
      },
      {
        status: 500,
      }
    );
  }
}
