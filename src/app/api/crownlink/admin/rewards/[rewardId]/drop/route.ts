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
    const { rewardId } = await context.params;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: roleRow, error: roleError } =
      await supabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", user.id)
        .maybeSingle();

    if (roleError) {
      console.error(
        "Reward drop role lookup error:",
        roleError
      );

      return NextResponse.json(
        { error: "Unable to verify admin access." },
        { status: 500 }
      );
    }

    if (
      !roleRow ||
      roleRow.status !== "active" ||
      roleRow.role !== "admin"
    ) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const formData = await request.formData();

    const proof = formData.get("proof");
    const notes = String(
      formData.get("notes") || ""
    ).trim();

    if (!(proof instanceof File)) {
      return NextResponse.json(
        { error: "Proof screenshot is required." },
        { status: 400 }
      );
    }

    if (!proof.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Proof must be an image." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: reward, error: rewardError } =
      await admin
        .from("rewards")
        .select("id, handle, dropped")
        .eq("id", rewardId)
        .maybeSingle();

    if (rewardError) {
      console.error(
        "Reward lookup error:",
        rewardError
      );

      return NextResponse.json(
        { error: "Unable to find reward." },
        { status: 500 }
      );
    }

    if (!reward) {
      return NextResponse.json(
        { error: "Reward not found." },
        { status: 404 }
      );
    }

    if (reward.dropped) {
      return NextResponse.json({
        success: true,
        alreadyDropped: true,
      });
    }

    const fileExtension =
      proof.name
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

    const safeHandle = reward.handle
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .toLowerCase();

    const filePath =
      `${safeHandle}/${rewardId}-${Date.now()}.${fileExtension}`;

    const arrayBuffer =
      await proof.arrayBuffer();

    const fileBuffer =
      Buffer.from(arrayBuffer);

    const { error: uploadError } =
      await admin.storage
        .from("reward-proofs")
        .upload(
          filePath,
          fileBuffer,
          {
            contentType: proof.type,
            upsert: false,
          }
        );

    if (uploadError) {
      console.error(
        "Reward proof upload error:",
        uploadError
      );

      return NextResponse.json(
        {
          error: `Unable to upload proof: ${uploadError.message}`,
        },
        { status: 500 }
      );
    }

    const now =
      new Date().toISOString();

    const { error: updateError } =
      await admin
        .from("rewards")
        .update({
          dropped: true,
          dropped_at: now,
          dropped_by: user.id,
          dropped_by_name:
            user.email || "Admin",
          proof_url: filePath,
          drop_notes:
            notes || null,
          updated_at: now,
        })
        .eq("id", rewardId);

    if (updateError) {
      console.error(
        "Reward drop update error:",
        updateError
      );

      await admin.storage
        .from("reward-proofs")
        .remove([filePath]);

      return NextResponse.json(
        {
          error: `Unable to mark reward as dropped: ${updateError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Reward drop route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to mark reward as dropped.",
      },
      { status: 500 }
    );
  }
}