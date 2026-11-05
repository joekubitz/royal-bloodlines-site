import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

type ImportedRow = {
  "Battle ID"?: unknown;
  Creator?: unknown;
  Opponent?: unknown;
  Score?: unknown;
  "Opponent Score"?: unknown;
  [key: string]: unknown;
};

type Match = {
  id: string;
  event_id: string;
  creator_one_id: string;
  creator_two_id: string;
  status: string;
  creator_one_score: number | string | null;
  creator_two_score: number | string | null;
};

type Profile = {
  user_id: string;
  display_name: string | null;
  tiktok_username: string | null;
};

function cellText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeUsername(value: unknown): string {
  return cellText(value).replace(/^@/, "").toLowerCase();
}

function parseScore(value: unknown): number | null {
  if (value === null || value === undefined || cellText(value) === "") {
    return null;
  }
  const cleaned = cellText(value).replace(/[,\s]/g, "");
  if (!/^\d+$/.test(cleaned)) return NaN;
  const score = Number(cleaned);
  return Number.isSafeInteger(score) && score >= 0 ? score : NaN;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { data: role, error: roleError } = await adminSupabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError) {
      return NextResponse.json({ error: "Could not verify admin access." }, { status: 500 });
    }
    if (role?.role !== "admin" || role.status !== "active") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || !/\.xlsx?$/i.test(file.name)) {
      return NextResponse.json({ error: "Upload a valid .xlsx or .xls spreadsheet." }, { status: 400 });
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    } catch {
      return NextResponse.json({ error: "Could not read the Excel spreadsheet." }, { status: 400 });
    }
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: "The spreadsheet is empty." }, { status: 400 });
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<ImportedRow>(sheet, {
      defval: "",
      raw: false,
    });
    if (!rows.length) {
      return NextResponse.json({ error: "No battle rows were found." }, { status: 400 });
    }

    const headers = Object.keys(rows[0]);
    const required = ["Battle ID", "Creator", "Opponent", "Score", "Opponent Score"];
    if (required.some((header) => !headers.includes(header))) {
      return NextResponse.json({
        error: "The spreadsheet must contain Battle ID, Creator, Opponent, Score and Opponent Score columns.",
      }, { status: 400 });
    }

    // J/K are physical Excel columns, independent of their header labels.
    const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
    const replacements = [] as {
      spreadsheetRow: number;
      username: string;
      score: number | null;
      valid: boolean;
      issues: string[];
      battleId: null;
      replacedCreatorId: null;
    }[];

    for (let r = 1; r <= range.e.r; r++) {
      const usernameCell = sheet[XLSX.utils.encode_cell({ r, c: 9 })];
      const scoreCell = sheet[XLSX.utils.encode_cell({ r, c: 10 })];
      const username = cellText(usernameCell?.w ?? usernameCell?.v).replace(/^@/, "");
      const score = parseScore(scoreCell?.w ?? scoreCell?.v);
      if (!username && score === null) continue;
      const issues: string[] = [];
      if (!username) issues.push("Replacement username is missing in column J");
      if (score === null) issues.push("Replacement score is missing in column K");
      if (Number.isNaN(score)) issues.push("Replacement score is invalid");
      replacements.push({
        spreadsheetRow: r + 1,
        username,
        score: Number.isNaN(score) ? null : score,
        valid: issues.length === 0,
        issues,
        battleId: null,
        replacedCreatorId: null,
      });
    }

    const scoredRows = rows.map((row, index) => ({
      spreadsheetRow: index + 2,
      originalBattleId: cellText(row["Battle ID"]),
      spreadsheetCreator: cellText(row.Creator),
      spreadsheetOpponent: cellText(row.Opponent),
      creatorScore: parseScore(row.Score),
      opponentScore: parseScore(row["Opponent Score"]),
    })).filter((row) => row.creatorScore !== null || row.opponentScore !== null);

    const skippedRows = rows.length - scoredRows.length;
    if (!scoredRows.length) {
      return NextResponse.json({
        error: "No completed battles with scores were found. Future unscored battles were skipped.",
      }, { status: 400 });
    }

    const originalIds = [...new Set(scoredRows.map((row) => row.originalBattleId).filter(Boolean))];
    const { data: originalMatches, error: originalError } = await adminSupabase
      .from("crownlink_matches")
      .select("id, event_id, creator_one_id, creator_two_id, status, creator_one_score, creator_two_score")
      .in("id", originalIds);
    if (originalError) throw originalError;

    const originalMap = new Map(
      ((originalMatches ?? []) as Match[]).map((match) => [match.id, match])
    );
    const eventIds = [...new Set((originalMatches ?? []).map((match) => match.event_id))];
    if (!eventIds.length) {
      return NextResponse.json({ error: "None of the hidden Battle IDs could be located. Import cannot safely determine the event." }, { status: 400 });
    }

    const { data: approvedMatches, error: approvedError } = await adminSupabase
      .from("crownlink_matches")
      .select("id, event_id, creator_one_id, creator_two_id, status, creator_one_score, creator_two_score")
      .in("event_id", eventIds)
      .eq("status", "approved");
    if (approvedError) throw approvedError;

    const allMatches = [...(originalMatches ?? []), ...(approvedMatches ?? [])] as Match[];
    const creatorIds = [...new Set(allMatches.flatMap((match) => [match.creator_one_id, match.creator_two_id]))];
    const { data: profiles, error: profileError } = await adminSupabase
      .from("crownlink_profiles")
      .select("user_id, display_name, tiktok_username")
      .in("user_id", creatorIds);
    if (profileError) throw profileError;
    const profileMap = new Map(
      ((profiles ?? []) as Profile[]).map((profile) => [profile.user_id, profile])
    );
    const usernameFor = (id: string) => normalizeUsername(profileMap.get(id)?.tiktok_username);
    const labelFor = (id: string) =>
      profileMap.get(id)?.display_name?.trim() ||
      profileMap.get(id)?.tiktok_username?.trim() || "Creator";

    const seenResolvedIds = new Set<string>();
    const preview = scoredRows.map((row) => {
      const issues: string[] = [];
      const notes: string[] = [];
      const original = originalMap.get(row.originalBattleId);
      const creatorUsername = normalizeUsername(row.spreadsheetCreator);
      const opponentUsername = normalizeUsername(row.spreadsheetOpponent);

      if (!row.originalBattleId || !original) {
        issues.push("Hidden Battle ID missing or unknown; event cannot be verified");
      }
      if (!creatorUsername || !opponentUsername) {
        issues.push("Both spreadsheet TikTok usernames are required");
      }
      if (row.creatorScore === null || row.opponentScore === null) {
        issues.push("Both scores must be entered for a completed battle");
      }
      if (Number.isNaN(row.creatorScore) || Number.isNaN(row.opponentScore)) {
        issues.push("Scores must be nonnegative whole numbers");
      }

      // The original ID is only trusted if both usernames and approval still match.
      // Otherwise look within that ID's event for exactly one approved matchup.
      const candidates = original && creatorUsername && opponentUsername
        ? (approvedMatches as Match[]).filter((match) => {
            if (match.event_id !== original.event_id) return false;
            const first = usernameFor(match.creator_one_id);
            const second = usernameFor(match.creator_two_id);
            return (first === creatorUsername && second === opponentUsername) ||
              (first === opponentUsername && second === creatorUsername);
          })
        : [];

      let match: Match | undefined;
      if (candidates.length === 1) {
        match = candidates[0];
      } else if (candidates.length === 0) {
        issues.push("No approved battle matches both TikTok usernames in this event");
      } else {
        issues.push("Multiple approved battles match these usernames; manual review required");
      }

      let creatorScore = row.creatorScore;
      let opponentScore = row.opponentScore;
      if (match) {
        const reversed = usernameFor(match.creator_one_id) === opponentUsername &&
          usernameFor(match.creator_two_id) === creatorUsername;
        if (reversed) {
          creatorScore = row.opponentScore;
          opponentScore = row.creatorScore;
          notes.push("Participant order reversed; scores swapped to match the database");
        }
        if (match.id !== row.originalBattleId) {
          notes.push("Outdated Battle ID corrected to current approved matchup");
        }
        if (seenResolvedIds.has(match.id)) {
          issues.push("Two spreadsheet rows resolve to the same approved battle");
        }
        seenResolvedIds.add(match.id);
        if (match.creator_one_score !== null || match.creator_two_score !== null) {
          issues.push("This approved battle already has scores saved");
        }
      }

      return {
        spreadsheetRow: row.spreadsheetRow,
        originalBattleId: row.originalBattleId,
        battleId: match?.id ?? row.originalBattleId,
        creator: match ? labelFor(match.creator_one_id) : row.spreadsheetCreator,
        opponent: match ? labelFor(match.creator_two_id) : row.spreadsheetOpponent,
        creatorOneId: match?.creator_one_id ?? null,
        creatorTwoId: match?.creator_two_id ?? null,
        spreadsheetCreator: row.spreadsheetCreator,
        spreadsheetOpponent: row.spreadsheetOpponent,
        creatorScore: Number.isNaN(creatorScore) ? null : creatorScore,
        opponentScore: Number.isNaN(opponentScore) ? null : opponentScore,
        remapped: Boolean(match && match.id !== row.originalBattleId),
        notes,
        valid: issues.length === 0,
        issues,
      };
    });

    const validRows = preview.filter((row) => row.valid).length;
    const errorRows = preview.length - validRows;
    const replacementErrors = replacements.filter((row) => !row.valid).length;
    const remappedRows = preview.filter((row) => row.remapped).length;

    return NextResponse.json({
      success: true,
      fileName: file.name,
      totalRows: preview.length,
      skippedRows,
      validRows,
      errorRows,
      replacementCount: replacements.length,
      replacementErrors,
      remappedRows,
      replacements,
      requiresReplacementReview: replacements.length > 0,
      canImport: validRows > 0 && errorRows === 0 && replacementErrors === 0,
      preview,
      notice: `${skippedRows} unscored future battles skipped. ${remappedRows} outdated Battle IDs corrected. Review all matchups and replacement assignments before saving.`,
    });
  } catch (error) {
    console.error("BLOODLINE ARENA SMART IMPORT ERROR:", error);
    return NextResponse.json({ error: "Something went wrong while scanning the battle spreadsheet." }, { status: 500 });
  }
}
