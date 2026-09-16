import { NextResponse } from "next/server";
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