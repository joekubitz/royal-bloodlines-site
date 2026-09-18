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

async function getAuthenticatedUser(request: Request) {
  const authorization =
    request.headers.get("authorization");

  // Native app authentication
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

    const admin =
      createAdminClient();

    const {
      data: { user },
      error,
    } =
      await admin.auth.getUser(
        accessToken
      );

    if (error || !user) {
      return null;
    }

    return user;
  }

  // Website cookie authentication
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

export async function GET(
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
      data: userRole,
      error: roleError,
    } = await admin
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
