import { NextResponse } from "next/server";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

type ScoreRow = {
  battleId?: unknown;
  creatorScore?: unknown;
  opponentScore?: unknown;
};

function parseScore(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const cleaned = String(value)
    .trim()
    .replace(/,/g, "")
    .replace(/\s/g, "");

  if (!/^\d+$/.test(cleaned)) {
    return NaN;
  }

  const score = Number(cleaned);

  if (!Number.isSafeInteger(score) || score < 0) {
    return NaN;
  }

  return score;
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

    const adminSupabase = createAdminClient();

    const { data: userRole, error: roleError } =
      await adminSupabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", user.id)
        .maybeSingle();

    if (roleError) {
      console.error(
        "BLOODLINE ARENA SAVE SCORES ROLE ERROR:",
        roleError
      );

      return NextResponse.json(
        { error: "Could not verify admin access." },
        { status: 500 }
      );
    }

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

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json(
        { error: "No battle scores were provided." },
        { status: 400 }
      );
    }

    const rows = body.rows as ScoreRow[];

    const preparedRows = rows.map((row) => ({
      battleId: String(row.battleId ?? "").trim(),
      creatorScore: parseScore(row.creatorScore),
      opponentScore: parseScore(row.opponentScore),
    }));

    const duplicateCheck = new Set<string>();

    for (const row of preparedRows) {
      if (!row.battleId) {
        return NextResponse.json(
          { error: "A Battle ID is missing." },
          { status: 400 }
        );
      }

      if (duplicateCheck.has(row.battleId)) {
        return NextResponse.json(
          {
            error: `Duplicate Battle ID detected: ${row.battleId}`,
          },
          { status: 400 }
        );
      }

      duplicateCheck.add(row.battleId);

      if (
        row.creatorScore === null ||
        row.opponentScore === null
      ) {
        return NextResponse.json(
          {
            error:
              "Both scores must be entered for every battle.",
          },
          { status: 400 }
        );
      }

      if (
        Number.isNaN(row.creatorScore) ||
        Number.isNaN(row.opponentScore)
      ) {
        return NextResponse.json(
          {
            error:
              "One or more scores are invalid.",
          },
          { status: 400 }
        );
      }
    }

    const battleIds = preparedRows.map(
      (row) => row.battleId
    );

    /*
     * IMPORTANT:
     * We fetch the battles again here instead of trusting
     * the previous spreadsheet scan.
     *
     * This means someone cannot alter the browser request
     * after the preview and update an unrelated record.
     */
    const { data: battles, error: battlesError } =
      await adminSupabase
        .from("crownlink_matches")
        .select(`
          id,
          status,
          creator_one_score,
          creator_two_score
        `)
        .in("id", battleIds);

    if (battlesError) {
      console.error(
        "BLOODLINE ARENA SAVE SCORES BATTLE ERROR:",
        battlesError
      );

      return NextResponse.json(
        {
          error:
            "Bloodline Arena could not verify the battles.",
        },
        { status: 500 }
      );
    }

    if ((battles ?? []).length !== preparedRows.length) {
      return NextResponse.json(
        {
          error:
            "One or more battles could not be found. No scores were saved.",
        },
        { status: 400 }
      );
    }

    const battleMap = new Map(
      (battles ?? []).map((battle) => [
        battle.id,
        battle,
      ])
    );

    /*
     * Revalidate every battle immediately before saving.
     */
    for (const row of preparedRows) {
      const battle = battleMap.get(row.battleId);

      if (!battle) {
        return NextResponse.json(
          {
            error:
              "A battle could not be found. No scores were saved.",
          },
          { status: 400 }
        );
      }

      if (battle.status !== "approved") {
        return NextResponse.json(
          {
            error:
              "One of these battles is no longer approved. No scores were saved.",
          },
          { status: 400 }
        );
      }

      /*
       * Don't silently overwrite scores that are already saved.
       */
      if (
        battle.creator_one_score !== null ||
        battle.creator_two_score !== null
      ) {
        return NextResponse.json(
          {
            error:
              "One of these battles already has scores saved. No scores were changed.",
          },
          { status: 409 }
        );
      }
    }

    /*
     * Everything has passed validation.
     * Update each exact battle by its Battle ID.
     */
    for (const row of preparedRows) {
      const { error: updateError } =
        await adminSupabase
          .from("crownlink_matches")
          .update({
            creator_one_score: row.creatorScore,
            creator_two_score: row.opponentScore,
          })
          .eq("id", row.battleId)
          .eq("status", "approved");

      if (updateError) {
        console.error(
          "BLOODLINE ARENA SAVE SCORE UPDATE ERROR:",
          updateError
        );

        return NextResponse.json(
          {
            error:
              "A database error occurred while saving the scores.",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      savedCount: preparedRows.length,
      message: `${preparedRows.length} battle ${
        preparedRows.length === 1
          ? "result"
          : "results"
      } successfully saved.`,
    });
  } catch (error) {
    console.error(
      "BLOODLINE ARENA SAVE SCORES ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while saving the battle scores.",
      },
      { status: 500 }
    );
  }
}