import { NextResponse } from "next/server";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    rewardId: string;
  }>;
};

async function getAuthenticatedUser(
  request: Request
) {
  const authorization =
    request.headers.get("authorization");

  if (
    authorization &&
    authorization.startsWith("Bearer ")
  ) {
    const accessToken =
      authorization
        .slice("Bearer ".length)
        .trim();

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
    error,
  } =
    await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { rewardId } =
      await context.params;

    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Not authenticated.",
        },
        {
          status: 401,
        }
      );
    }

    const adminSupabase =
      createAdminClient();

    /*
     * Only an active creator can
     * update their reward LIVE times.
     */
    const {
      data: userRole,
      error: roleError,
    } = await adminSupabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      roleError ||
      !userRole ||
      userRole.role !== "creator" ||
      userRole.status !== "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Creator access required.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * Find the creator profile belonging
     * to the authenticated user.
     */
    const {
      data: profile,
      error: profileError,
    } = await adminSupabase
      .from("crownlink_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile
    ) {
      return NextResponse.json(
        {
          error:
            "Creator profile not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Read the submitted LIVE-time data.
     */
    const body =
      await request.json();

    const typicalLiveTimes =
      String(
        body.typicalLiveTimes ??
          body.typical_live_times ??
          ""
      ).trim();

    const liveTimezone =
      String(
        body.liveTimezone ??
          body.live_timezone ??
          ""
      ).trim();

    if (!typicalLiveTimes) {
      return NextResponse.json(
        {
          error:
            "Typical LIVE times are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!liveTimezone) {
      return NextResponse.json(
        {
          error:
            "Timezone is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Load the reward and make sure it
     * belongs to this creator.
     */
    const {
      data: reward,
      error: rewardError,
    } = await adminSupabase
      .from("rewards")
      .select(`
        id,
        creator_id,
        dropped
      `)
      .eq("id", rewardId)
      .maybeSingle();

    if (
      rewardError ||
      !reward
    ) {
      return NextResponse.json(
        {
          error:
            "Reward not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      reward.creator_id !==
      profile.id
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have access to this reward.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * Once a reward has been delivered,
     * LIVE availability can no longer
     * be changed.
     */
    if (reward.dropped) {
      return NextResponse.json(
        {
          error:
            "LIVE times cannot be changed after the reward has been delivered.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Save the creator's availability.
     */
    const {
      data: updatedReward,
      error: updateError,
    } = await adminSupabase
      .from("rewards")
      .update({
        typical_live_times: {
          text: typicalLiveTimes,
        },
        live_timezone:
          liveTimezone,
      })
      .eq("id", rewardId)
      .eq(
        "creator_id",
        profile.id
      )
      .select(`
        id,
        typical_live_times,
        live_timezone
      `)
      .single();

    if (updateError) {
      console.error(
        "UPDATE REWARD LIVE TIMES ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            updateError.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      reward: updatedReward,
    });
  } catch (error) {
    console.error(
      "UPDATE REWARD LIVE TIMES ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      {
        status: 500,
      }
    );
  }
}import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

type RouteContext = {
  params: Promise<{
    rewardId: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { rewardId } =
      await context.params;

    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const liveTimes =
      String(
        body?.liveTimes || ""
      ).trim();

    const timezone =
      String(
        body?.timezone || ""
      ).trim();

    if (!liveTimes) {
      return NextResponse.json(
        {
          error:
            "Please enter your typical LIVE times.",
        },
        {
          status: 400,
        }
      );
    }

    if (!timezone) {
      return NextResponse.json(
        {
          error:
            "Please select a timezone.",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      createAdminClient();

    const {
      data: profile,
      error: profileError,
    } = await admin
      .from("crownlink_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile
    ) {
      return NextResponse.json(
        {
          error:
            "Creator profile not found.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      data: reward,
      error: rewardError,
    } = await admin
      .from("rewards")
      .select(
        "id, creator_id, dropped"
      )
      .eq("id", rewardId)
      .eq(
        "creator_id",
        profile.id
      )
      .maybeSingle();

    if (
      rewardError ||
      !reward
    ) {
      return NextResponse.json(
        {
          error:
            "Reward not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (reward.dropped) {
      return NextResponse.json(
        {
          error:
            "This reward has already been delivered.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      error: updateError,
    } = await admin
      .from("rewards")
      .update({
        typical_live_times:
          {
            text: liveTimes,
          },

        live_timezone:
          timezone,

        live_times_updated_at:
          new Date().toISOString(),

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", rewardId);

    if (updateError) {
      console.error(
        "Reward LIVE times update error:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Unable to save your LIVE times.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Reward LIVE times route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save your LIVE times.",
      },
      {
        status: 500,
      }
    );
  }
}
