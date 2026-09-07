import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

type ImportedRow = {
  "Battle ID"?: unknown;
  Score?: unknown;
  "Opponent Score"?: unknown;
  [key: string]: unknown;
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

  if (
    !Number.isSafeInteger(score) ||
    score < 0
  ) {
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
        "CROWN LINK SCORE IMPORT ROLE ERROR:",
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

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please upload an Excel file." },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();

    if (
      !fileName.endsWith(".xlsx") &&
      !fileName.endsWith(".xls")
    ) {
      return NextResponse.json(
        {
          error:
            "Only .xlsx or .xls battle spreadsheets are supported.",
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();

    let workbook: XLSX.WorkBook;

    try {
      workbook = XLSX.read(bytes, {
        type: "array",
      });
    } catch (error) {
      console.error(
        "CROWN LINK SCORE IMPORT XLSX READ ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            "The spreadsheet could not be read. Please upload the original Crown Link Excel export.",
        },
        { status: 400 }
      );
    }

    const firstSheetName =
      workbook.SheetNames[0];

    if (!firstSheetName) {
      return NextResponse.json(
        { error: "The spreadsheet is empty." },
        { status: 400 }
      );
    }

    const worksheet =
      workbook.Sheets[firstSheetName];

    const rows =
      XLSX.utils.sheet_to_json<ImportedRow>(
        worksheet,
        {
          defval: "",
          raw: false,
        }
      );

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "No battle rows were found in the spreadsheet.",
        },
        { status: 400 }
      );
    }

    const headers = Object.keys(rows[0] ?? {});

    const requiredHeaders = [
      "Battle ID",
      "Score",
      "Opponent Score",
    ];

    const missingHeaders =
      requiredHeaders.filter(
        (header) => !headers.includes(header)
      );

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          error:
            "This does not appear to be a valid Crown Link battle spreadsheet.",
          missingHeaders,
        },
        { status: 400 }
      );
    }

    const seenBattleIds = new Set<string>();
    const duplicateBattleIds = new Set<string>();

    const preparedRows = rows.map(
      (row, index) => {
        const battleId = String(
          row["Battle ID"] ?? ""
        ).trim();

        const creatorScore = parseScore(
          row.Score
        );

        const opponentScore = parseScore(
          row["Opponent Score"]
        );

        if (battleId) {
          if (seenBattleIds.has(battleId)) {
            duplicateBattleIds.add(battleId);
          }

          seenBattleIds.add(battleId);
        }

        return {
          spreadsheetRow: index + 2,
          battleId,
          creatorScore,
          opponentScore,
        };
      }
    );

    const battleIds = [
      ...new Set(
        preparedRows
          .map((row) => row.battleId)
          .filter(Boolean)
      ),
    ];

    if (battleIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "No Battle IDs were found. Please upload the original Crown Link export without removing the hidden Battle ID column.",
        },
        { status: 400 }
      );
    }

    const { data: matches, error: matchesError } =
      await adminSupabase
        .from("crownlink_matches")
        .select(`
          id,
          event_id,
          creator_one_id,
          creator_two_id,
          status,
          creator_one_score,
          creator_two_score
        `)
        .in("id", battleIds);

    if (matchesError) {
      console.error(
        "CROWN LINK SCORE IMPORT MATCH ERROR:",
        matchesError
      );

      return NextResponse.json(
        {
          error:
            "Crown Link could not verify the battles in this spreadsheet.",
        },
        { status: 500 }
      );
    }

    const matchMap = new Map(
      (matches ?? []).map((match) => [
        match.id,
        match,
      ])
    );

    const creatorIds = [
      ...new Set(
        (matches ?? []).flatMap((match) => [
          match.creator_one_id,
          match.creator_two_id,
        ])
      ),
    ];

    const { data: profiles, error: profilesError } =
      creatorIds.length > 0
        ? await adminSupabase
            .from("crownlink_profiles")
            .select(
              "user_id, display_name, tiktok_username"
            )
            .in("user_id", creatorIds)
        : { data: [], error: null };

    if (profilesError) {
      console.error(
        "CROWN LINK SCORE IMPORT PROFILE ERROR:",
        profilesError
      );
    }

    function getCreatorName(userId: string) {
      const profile = profiles?.find(
        (item) => item.user_id === userId
      );

      return (
        profile?.display_name?.trim() ||
        profile?.tiktok_username?.trim() ||
        "Creator"
      );
    }

    const preview = preparedRows.map(
      (row) => {
        const issues: string[] = [];

        if (!row.battleId) {
          issues.push("Missing Battle ID");
        }

        if (
          row.battleId &&
          duplicateBattleIds.has(row.battleId)
        ) {
          issues.push(
            "Duplicate Battle ID in spreadsheet"
          );
        }

        if (Number.isNaN(row.creatorScore)) {
          issues.push(
            "Creator score is not a valid whole number"
          );
        }

        if (Number.isNaN(row.opponentScore)) {
          issues.push(
            "Opponent score is not a valid whole number"
          );
        }

        const match = row.battleId
          ? matchMap.get(row.battleId)
          : undefined;

        if (row.battleId && !match) {
          issues.push(
            "Battle was not found in Crown Link"
          );
        }

        if (
          match &&
          match.status !== "approved"
        ) {
          issues.push(
            "Battle is no longer approved"
          );
        }

        const bothScoresBlank =
          row.creatorScore === null &&
          row.opponentScore === null;

        const onlyOneScoreEntered =
          (row.creatorScore === null) !==
          (row.opponentScore === null);

        if (bothScoresBlank) {
          issues.push(
            "No scores entered"
          );
        }

        if (onlyOneScoreEntered) {
          issues.push(
            "Both battle scores must be entered"
          );
        }

        const hasExistingScores =
          match &&
          (match.creator_one_score !== null ||
            match.creator_two_score !== null);

        const scoreChanged =
          match &&
          !Number.isNaN(row.creatorScore) &&
          !Number.isNaN(row.opponentScore) &&
          row.creatorScore !== null &&
          row.opponentScore !== null &&
          (Number(match.creator_one_score) !==
            row.creatorScore ||
            Number(match.creator_two_score) !==
              row.opponentScore);

        if (
          hasExistingScores &&
          scoreChanged
        ) {
          issues.push(
            "Battle already has scores saved"
          );
        }

        const valid =
          issues.length === 0;

        return {
          spreadsheetRow:
            row.spreadsheetRow,
          battleId: row.battleId,
          creator:
            match
              ? getCreatorName(
                  match.creator_one_id
                )
              : null,
          opponent:
            match
              ? getCreatorName(
                  match.creator_two_id
                )
              : null,
          creatorScore:
            Number.isNaN(row.creatorScore)
              ? null
              : row.creatorScore,
          opponentScore:
            Number.isNaN(row.opponentScore)
              ? null
              : row.opponentScore,
          existingCreatorScore:
            match?.creator_one_score ?? null,
          existingOpponentScore:
            match?.creator_two_score ?? null,
          valid,
          issues,
        };
      }
    );

    const validRows = preview.filter(
      (row) => row.valid
    );

    const errorRows = preview.filter(
      (row) => !row.valid
    );

    return NextResponse.json({
      success: true,
      fileName: file.name,
      totalRows: preview.length,
      validRows: validRows.length,
      errorRows: errorRows.length,
      canImport:
        validRows.length > 0 &&
        errorRows.length === 0,
      preview,
    });
  } catch (error) {
    console.error(
      "CROWN LINK SCORE IMPORT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while scanning the battle spreadsheet.",
      },
      { status: 500 }
    );
  }
}