import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

type RouteContext = {
  params: Promise<{
    rewardId: string;
  }>;
};

export async function GET(
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
      .select(`
        id,
        creator_id,
        dropped,
        proof_url
      `)
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

    if (
      !reward.dropped ||
      !reward.proof_url
    ) {
      return NextResponse.json(
        {
          error:
            "Delivery proof is not available yet.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data,
      error,
    } =
      await admin.storage
        .from("reward-proofs")
        .createSignedUrl(
          reward.proof_url,
          60 * 5
        );

    if (
      error ||
      !data?.signedUrl
    ) {
      console.error(
        "Creator reward proof error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Unable to open delivery proof.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      url: data.signedUrl,
    });
  } catch (error) {
    console.error(
      "Creator reward proof route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to open delivery proof.",
      },
      {
        status: 500,
      }
    );
  }
}