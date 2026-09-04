import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

const BUCKET = "crownlink-battle-results";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function safeExtension(file: File) {
  const name = file.name.toLowerCase();
  const lastDot = name.lastIndexOf(".");

  if (lastDot >= 0) {
    const ext = name.slice(lastDot + 1).replace(/[^a-z0-9]/g, "");

    if (ext && ext.length <= 8) {
      return ext;
    }
  }

  switch (file.type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    default:
      return "jpg";
  }
}

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

    const formData = await request.formData();

    const matchId = String(
      formData.get("matchId") || ""
    ).trim();

    const fileValue = formData.get("file");

    if (!matchId) {
      return NextResponse.json(
        { error: "Match ID is required." },
        { status: 400 }
      );
    }

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        { error: "Screenshot file is required." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(fileValue.type)) {
      return NextResponse.json(
        {
          error:
            "Screenshot must be a JPG, PNG, WEBP, HEIC, or HEIF image.",
        },
        { status: 400 }
      );
    }

    if (fileValue.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error:
            "Screenshot must be 10 MB or smaller.",
        },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const {
      data: match,
      error: matchError,
    } = await adminSupabase
      .from("crownlink_matches")
      .select("id, event_id, status")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json(
        { error: "Match not found." },
        { status: 404 }
      );
    }

    if (match.status !== "approved") {
      return NextResponse.json(
        {
          error:
            "Screenshots can only be uploaded for approved matches.",
        },
        { status: 400 }
      );
    }

    const extension = safeExtension(fileValue);
    const filePath =
      `${match.event_id}/${match.id}/score-${Date.now()}.${extension}`;

    const fileBuffer = Buffer.from(
      await fileValue.arrayBuffer()
    );

    const {
      error: uploadError,
    } = await adminSupabase.storage
      .from(BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: fileValue.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const {
      data: publicUrlData,
    } = adminSupabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    const publicUrl =
      publicUrlData.publicUrl;

    if (!publicUrl) {
      return NextResponse.json(
        {
          error:
            "Screenshot uploaded, but its public URL could not be created.",
        },
        { status: 500 }
      );
    }

    const {
      data: existingResult,
      error: existingResultError,
    } = await adminSupabase
      .from("crownlink_match_results")
      .select("score_screenshot_url")
      .eq("match_id", match.id)
      .maybeSingle();

    if (existingResultError) {
      return NextResponse.json(
        { error: existingResultError.message },
        { status: 500 }
      );
    }

    const oldUrl =
      existingResult?.score_screenshot_url ?? null;

    const {
      error: resultError,
    } = await adminSupabase
      .from("crownlink_match_results")
      .upsert(
        {
          match_id: match.id,
          score_screenshot_url: publicUrl,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "match_id",
        }
      );

    if (resultError) {
      await adminSupabase.storage
        .from(BUCKET)
        .remove([filePath]);

      return NextResponse.json(
        { error: resultError.message },
        { status: 500 }
      );
    }

    if (oldUrl) {
      try {
        const marker = `/storage/v1/object/public/${BUCKET}/`;
        const markerIndex = oldUrl.indexOf(marker);

        if (markerIndex >= 0) {
          const oldPath = decodeURIComponent(
            oldUrl.slice(
              markerIndex + marker.length
            )
          );

          if (oldPath && oldPath !== filePath) {
            await adminSupabase.storage
              .from(BUCKET)
              .remove([oldPath]);
          }
        }
      } catch (cleanupError) {
        console.warn(
          "Could not remove old Crown Link score screenshot:",
          cleanupError
        );
      }
    }

    return NextResponse.json({
      success: true,
      matchId: match.id,
      url: publicUrl,
      path: filePath,
      message: "Score screenshot uploaded.",
    });
  } catch (error) {
    console.error(
      "CROWN LINK SCORE SCREENSHOT UPLOAD ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}
