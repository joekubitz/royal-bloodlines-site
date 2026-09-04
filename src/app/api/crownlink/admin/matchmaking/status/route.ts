import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

type MatchAction = "approve" | "cancel";

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

    const body = await request.json();

    const matchId = String(
      body.matchId || ""
    ).trim();

    const action = String(
      body.action || ""
    ).trim() as MatchAction;

    if (!matchId) {
      return NextResponse.json(
        { error: "Match ID is required." },
        { status: 400 }
      );
    }

    if (
      action !== "approve" &&
      action !== "cancel"
    ) {
      return NextResponse.json(
        { error: "Invalid match action." },
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
        status,
        event_date_id,
        schedule_slot_id
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

    /*
     * Approval is kept for compatibility
     * with any older suggested matches.
     *
     * New Crown Link matches are now
     * approved automatically.
     */
    if (action === "approve") {
      if (match.status === "approved") {
        return NextResponse.json({
          success: true,
          action: "approve",
          eventId: match.event_id,
          matchId: match.id,
          message:
            "This match is already approved.",
        });
      }

      if (match.status !== "suggested") {
        return NextResponse.json(
          {
            error:
              "Only suggested matches can be approved.",
          },
          { status: 400 }
        );
      }

      const {
        error: approveError,
      } = await adminSupabase
        .from("crownlink_matches")
        .update({
          status: "approved",
          approved_at:
            new Date().toISOString(),
        })
        .eq("id", match.id);

      if (approveError) {
        return NextResponse.json(
          { error: approveError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: "approve",
        eventId: match.event_id,
        matchId: match.id,
        message: "Match approved.",
      });
    }

    /*
     * Admins may cancel either an older
     * suggested match or an automatically
     * approved match.
     *
     * The creator signup remains active.
     * That means a later Generate Matches
     * request can place the affected
     * creators back into the schedule.
     */
    if (
      match.status !== "suggested" &&
      match.status !== "approved"
    ) {
      return NextResponse.json(
        {
          error:
            "Only active matches can be cancelled.",
        },
        { status: 400 }
      );
    }

    const {
      error: cancelError,
    } = await adminSupabase
      .from("crownlink_matches")
      .update({
        status: "cancelled",
        approved_at: null,
      })
      .eq("id", match.id);

    if (cancelError) {
      return NextResponse.json(
        { error: cancelError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      action: "cancel",
      eventId: match.event_id,
      matchId: match.id,
      creatorOneId:
        match.creator_one_id,
      creatorTwoId:
        match.creator_two_id,
      eventDateId:
        match.event_date_id,
      scheduleSlotId:
        match.schedule_slot_id,
      message: "Match cancelled.",
    });
  } catch (error) {
    console.error(
      "MATCH STATUS ERROR:",
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
