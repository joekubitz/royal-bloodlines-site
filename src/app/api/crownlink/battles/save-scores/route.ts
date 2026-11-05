import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

type ScoreRow = {
  battleId?: unknown;
  creatorScore?: unknown;
  opponentScore?: unknown;
};

type ReplacementRow = {
  battleId?: unknown;
  replacedCreatorId?: unknown;
  username?: unknown;
  score?: unknown;
};

function parseScore(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const cleaned = String(value).trim().replace(/,/g, "").replace(/\s/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const number = Number(cleaned);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { data: userRole, error: roleError } = await adminSupabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError) {
      console.error("SAVE SCORES ROLE ERROR:", roleError);
      return NextResponse.json({ error: "Could not verify admin access." }, { status: 500 });
    }
    if (userRole?.role !== "admin" || userRole.status !== "active") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const payload = body as { rows?: unknown; replacements?: unknown };
    if (!Array.isArray(payload.rows) || payload.rows.length === 0) {
      return NextResponse.json({ error: "No battle scores were provided." }, { status: 400 });
    }
    if (payload.replacements !== undefined && !Array.isArray(payload.replacements)) {
      return NextResponse.json({ error: "Replacements must be an array." }, { status: 400 });
    }

    const rawRows = payload.rows as ScoreRow[];
    const rawReplacements = (payload.replacements ?? []) as ReplacementRow[];
    const rows: { battleId: string; creatorScore: number; opponentScore: number }[] = [];
    const battleIds = new Set<string>();

    for (const row of rawRows) {
      if (!row || typeof row !== "object") {
        return NextResponse.json({ error: "Invalid battle row." }, { status: 400 });
      }
      const battleId = textValue(row.battleId);
      const creatorScore = parseScore(row.creatorScore);
      const opponentScore = parseScore(row.opponentScore);
      if (!battleId) {
        return NextResponse.json({ error: "A Battle ID is missing." }, { status: 400 });
      }
      if (battleIds.has(battleId)) {
        return NextResponse.json({ error: `Duplicate Battle ID: ${battleId}` }, { status: 400 });
      }
      if (creatorScore === null || opponentScore === null) {
        return NextResponse.json({ error: `Invalid or missing scores for battle ${battleId}.` }, { status: 400 });
      }
      battleIds.add(battleId);
      rows.push({ battleId, creatorScore, opponentScore });
    }

    const replacements: {
      battleId: string;
      replacedCreatorId: string;
      username: string;
      score: number;
    }[] = [];
    const assignedSides = new Set<string>();

    for (const replacement of rawReplacements) {
      if (!replacement || typeof replacement !== "object") {
        return NextResponse.json({ error: "Invalid replacement row." }, { status: 400 });
      }
      const battleId = textValue(replacement.battleId);
      const replacedCreatorId = textValue(replacement.replacedCreatorId);
      const username = textValue(replacement.username).replace(/^@/, "");
      const score = parseScore(replacement.score);
      if (!battleIds.has(battleId)) {
        return NextResponse.json({ error: "Each replacement must be assigned to an imported battle." }, { status: 400 });
      }
      if (!replacedCreatorId || !username || score === null) {
        return NextResponse.json({ error: "Complete the replacement's battle, absent creator, username and score." }, { status: 400 });
      }
      const sideKey = `${battleId}:${replacedCreatorId}`;
      if (assignedSides.has(sideKey)) {
        return NextResponse.json({ error: "Two replacements were assigned to the same battle position." }, { status: 400 });
      }
      assignedSides.add(sideKey);
      replacements.push({ battleId, replacedCreatorId, username, score });
    }

    // A single PostgreSQL function performs validation and writes atomically.
    // This route must use the service-role admin client, never the browser client.
    const { data, error } = await adminSupabase.rpc("crownlink_save_imported_scores", {
      p_rows: rows,
      p_replacements: replacements,
      p_updated_by: user.id,
    });

    if (error) {
      console.error("BLOODLINE ARENA ATOMIC SAVE ERROR:", error);
      return NextResponse.json(
        { error: error.message || "The import was rejected. No scores were saved." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      savedCount: rows.length,
      replacementCount: replacements.length,
      ...((data && typeof data === "object" && !Array.isArray(data)) ? data : {}),
    });
  } catch (error) {
    console.error("BLOODLINE ARENA SAVE SCORES ERROR:", error);
    return NextResponse.json(
      { error: "Something went wrong while saving battle scores." },
      { status: 500 }
    );
  }
}
