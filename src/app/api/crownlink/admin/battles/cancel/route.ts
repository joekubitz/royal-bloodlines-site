import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

type CancelMode =
  | "keep_both"
  | "remove_creator_one"
  | "remove_creator_two"
  | "remove_both";

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

    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .single();

    if (
      roleError ||
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

    const matchId = body?.matchId;
    const cancelMode = body?.cancelMode as CancelMode;

    const validCancelModes: CancelMode[] = [
      "keep_both",
      "remove_creator_one",
      "remove_creator_two",
      "remove_both",
    ];

    if (!matchId) {
      return NextResponse.json(
        { error: "Missing match ID." },
        { status: 400 }
      );
    }

    if (!validCancelModes.includes(cancelMode)) {
      return NextResponse.json(
        { error: "Invalid cancellation option." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: match, error: matchError } = await adminSupabase
      .from("crownlink_matches")
      .select(`
        id,
        event_id,
        creator_one_id,
        creator_two_id,
        status
      `)
      .eq("id", matchId)
      .maybeSingle();

    if (matchError) {
      return NextResponse.json(
        { error: matchError.message },
        { status: 500 }
      );
    }

    if (!match) {
      return NextResponse.json(
        { error: "Battle not found." },
        { status: 404 }
      );
    }

    if (match.status !== "approved") {
      return NextResponse.json(
        {
          error:
            "Only approved battles can be cancelled from Battle Management.",
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await adminSupabase
      .from("crownlink_matches")
      .update({
        status: "cancelled",
        approved_at: null,
      })
      .eq("id", matchId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    const creatorsToRemove: string[] = [];

    if (
      cancelMode === "remove_creator_one" ||
      cancelMode === "remove_both"
    ) {
      creatorsToRemove.push(match.creator_one_id);
    }

    if (
      cancelMode === "remove_creator_two" ||
      cancelMode === "remove_both"
    ) {
      creatorsToRemove.push(match.creator_two_id);
    }

    if (creatorsToRemove.length > 0) {
      const { error: signupError } = await adminSupabase
        .from("crownlink_event_signups")
        .update({
          status: "cancelled",
        })
        .eq("event_id", match.event_id)
        .in("user_id", creatorsToRemove);

      if (signupError) {
        console.error(
          "Battle cancelled but signup update failed:",
          signupError
        );

        return NextResponse.json(
          {
            error:
              "The battle was cancelled, but one or more creator signups could not be updated.",
          },
          { status: 500 }
        );
      }
    }

    let message = "Battle cancelled successfully.";

    if (cancelMode === "keep_both") {
      message =
        "Battle cancelled. Both creators remain signed up for the event.";
    }

    if (cancelMode === "remove_creator_one") {
      message =
        "Battle cancelled. Creator One was removed from the event.";
    }

    if (cancelMode === "remove_creator_two") {
      message =
        "Battle cancelled. Creator Two was removed from the event.";
    }

    if (cancelMode === "remove_both") {
      message =
        "Battle cancelled. Both creators were removed from the event.";
    }

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Cancel Crown Link battle error:", error);

    return NextResponse.json(
      {
        error:
          "Something went wrong cancelling the battle.",
      },
      { status: 500 }
    );
  }
}