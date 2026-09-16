import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export async function POST(
  request: Request
) {
  try {
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

    const {
      data: roleRow,
      error: roleError,
    } = await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError) {
      return NextResponse.json(
        {
          error:
            "Unable to verify admin access.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !roleRow ||
      roleRow.status !== "active" ||
      roleRow.role !== "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Admin access required.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const proofPath =
      String(
        body?.proofPath || ""
      ).trim();

    if (!proofPath) {
      return NextResponse.json(
        {
          error:
            "Proof path is missing.",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      createAdminClient();

    const {
      data,
      error,
    } =
      await admin.storage
        .from("reward-proofs")
        .createSignedUrl(
          proofPath,
          60 * 5
        );

    if (error || !data?.signedUrl) {
      console.error(
        "Reward proof signed URL error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Unable to open proof screenshot.",
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
      "Reward proof route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to open proof.",
      },
      {
        status: 500,
      }
    );
  }
}