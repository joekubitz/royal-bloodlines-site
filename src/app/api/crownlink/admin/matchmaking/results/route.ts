import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

type AttendanceStatus =
  | "unmarked"
  | "attended"
  | "no_show"
  | "replacement";

type AttendanceInput = {
  creatorId: string;
  status: AttendanceStatus;
  replacementUserId?: string | null;
  replacementName?: string | null;
  adminNotes?: string | null;
};

type ResultsBody = {
  matchId: string;
  creatorOne: AttendanceInput;
  creatorTwo: AttendanceInput;
  creatorOneScore?: number | null;
  creatorTwoScore?: number | null;
  adminNotes?: string | null;
};

function cleanOptionalText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeScore(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numberValue = Number(value);

  if (
    !Number.isFinite(numberValue) ||
    numberValue < 0
  ) {
    throw new Error(
      "Scores must be valid positive numbers."
    );
  }

  return Math.round(numberValue);
}

function validateAttendance(
  attendance: AttendanceInput,
  expectedCreatorId: string
) {
  const allowedStatuses: AttendanceStatus[] = [
    "unmarked",
    "attended",
    "no_show",
    "replacement",
  ];

  if (
    !attendance ||
    attendance.creatorId !== expectedCreatorId
  ) {
    throw new Error(
      "Attendance creator does not match this battle."
    );
  }

  if (
    !allowedStatuses.includes(attendance.status)
  ) {
    throw new Error(
      "Invalid attendance status."
    );
  }

  if (
    attendance.status === "replacement" &&
    !cleanOptionalText(
      attendance.replacementUserId
    ) &&
    !cleanOptionalText(
      attendance.replacementName
    )
  ) {
    throw new Error(
      "Enter who replaced the creator."
    );
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

    const body =
      (await request.json()) as ResultsBody;

    const matchId = String(
      body.matchId || ""
    ).trim();

    if (!matchId) {
      return NextResponse.json(
        { error: "Match ID is required." },
        { status: 400 }
      );
    }

    const adminSupabase =
      createAdminClient();

    const {
      data: match,
      error: matchError,
    } = await adminSupabase
      .from("crownlink_matches")
      .select(`
        id,
        event_id,
        creator_one_id,
        creator_two_id,
        status
      `)
      .eq("id", matchId)
      .single();

    if (
      matchError ||
      !match
    ) {
      return NextResponse.json(
        { error: "Match not found." },
        { status: 404 }
      );
    }

    if (
      match.status !== "approved"
    ) {
      return NextResponse.json(
        {
          error:
            "Results can only be recorded for approved matches.",
        },
        { status: 400 }
      );
    }

    if (
      !body.creatorOne ||
      !body.creatorTwo
    ) {
      return NextResponse.json(
        {
          error:
            "Attendance is required for both creators.",
        },
        { status: 400 }
      );
    }

    try {
      validateAttendance(
        body.creatorOne,
        match.creator_one_id
      );

      validateAttendance(
        body.creatorTwo,
        match.creator_two_id
      );
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid attendance information.",
        },
        { status: 400 }
      );
    }

    let creatorOneScore: number | null;
    let creatorTwoScore: number | null;

    try {
      creatorOneScore =
        normalizeScore(
          body.creatorOneScore
        );

      creatorTwoScore =
        normalizeScore(
          body.creatorTwoScore
        );
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid battle score.",
        },
        { status: 400 }
      );
    }

    const now =
      new Date().toISOString();

    const attendanceRows = [
      {
        match_id: match.id,
        creator_id:
          match.creator_one_id,
        status:
          body.creatorOne.status,
        replacement_user_id:
          body.creatorOne.status ===
          "replacement"
            ? cleanOptionalText(
                body.creatorOne
                  .replacementUserId
              )
            : null,
        replacement_name:
          body.creatorOne.status ===
          "replacement"
            ? cleanOptionalText(
                body.creatorOne
                  .replacementName
              )
            : null,
        admin_notes:
          cleanOptionalText(
            body.creatorOne.adminNotes
          ),
        updated_by: user.id,
        updated_at: now,
      },
      {
        match_id: match.id,
        creator_id:
          match.creator_two_id,
        status:
          body.creatorTwo.status,
        replacement_user_id:
          body.creatorTwo.status ===
          "replacement"
            ? cleanOptionalText(
                body.creatorTwo
                  .replacementUserId
              )
            : null,
        replacement_name:
          body.creatorTwo.status ===
          "replacement"
            ? cleanOptionalText(
                body.creatorTwo
                  .replacementName
              )
            : null,
        admin_notes:
          cleanOptionalText(
            body.creatorTwo.adminNotes
          ),
        updated_by: user.id,
        updated_at: now,
      },
    ];

    const {
      error: attendanceError,
    } = await adminSupabase
      .from(
        "crownlink_match_attendance"
      )
      .upsert(
        attendanceRows,
        {
          onConflict:
            "match_id,creator_id",
        }
      );

    if (attendanceError) {
      return NextResponse.json(
        {
          error:
            attendanceError.message,
        },
        { status: 500 }
      );
    }

    const {
      error: resultsError,
    } = await adminSupabase
      .from(
        "crownlink_match_results"
      )
      .upsert(
        {
          match_id: match.id,
          creator_one_score:
            creatorOneScore,
          creator_two_score:
            creatorTwoScore,
          admin_notes:
            cleanOptionalText(
              body.adminNotes
            ),
          updated_by: user.id,
          updated_at: now,
        },
        {
          onConflict: "match_id",
        }
      );

    if (resultsError) {
      return NextResponse.json(
        {
          error:
            resultsError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      matchId: match.id,
      eventId: match.event_id,
      message:
        "Battle results saved.",
    });
  } catch (error) {
    console.error(
      "CROWN LINK MATCH RESULTS ERROR:",
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

export async function GET(request: Request) {
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

    const { searchParams } =
      new URL(request.url);

    const matchId =
      String(
        searchParams.get("matchId") || ""
      ).trim();

    if (!matchId) {
      return NextResponse.json(
        { error: "Match ID is required." },
        { status: 400 }
      );
    }

    const adminSupabase =
      createAdminClient();

    const {
      data: match,
      error: matchError,
    } = await adminSupabase
      .from("crownlink_matches")
      .select(`
        id,
        creator_one_id,
        creator_two_id
      `)
      .eq("id", matchId)
      .single();

    if (
      matchError ||
      !match
    ) {
      return NextResponse.json(
        { error: "Match not found." },
        { status: 404 }
      );
    }

    const {
      data: attendance,
      error: attendanceError,
    } = await adminSupabase
      .from(
        "crownlink_match_attendance"
      )
      .select(`
        id,
        match_id,
        creator_id,
        status,
        replacement_user_id,
        replacement_name,
        admin_notes,
        updated_by,
        updated_at
      `)
      .eq("match_id", matchId);

    if (attendanceError) {
      return NextResponse.json(
        {
          error:
            attendanceError.message,
        },
        { status: 500 }
      );
    }

    const {
      data: results,
      error: resultsError,
    } = await adminSupabase
      .from(
        "crownlink_match_results"
      )
      .select(`
        id,
        match_id,
        creator_one_score,
        creator_two_score,
        score_screenshot_url,
        admin_notes,
        updated_by,
        updated_at
      `)
      .eq("match_id", matchId)
      .maybeSingle();

    if (resultsError) {
      return NextResponse.json(
        {
          error:
            resultsError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      match,
      attendance:
        attendance ?? [],
      results: results ?? null,
    });
  } catch (error) {
    console.error(
      "CROWN LINK MATCH RESULTS GET ERROR:",
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
