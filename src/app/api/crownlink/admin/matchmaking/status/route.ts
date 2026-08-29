import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

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

    const matchId = String(body.matchId || "").trim();
    const action = String(body.action || "").trim();

    if (!matchId) {
      return NextResponse.json(
        { error: "Match ID is required." },
        { status: 400 }
      );
    }

    if (!["approve", "cancel"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid match action." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: match, error: matchError } =
      await adminSupabase
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

    if (matchError || !match) {
      return NextResponse.json(
        { error: "Match not found." },
        { status: 404 }
      );
    }

    if (match.status !== "suggested") {
      return NextResponse.json(
        {
          error:
            "Only suggested matches can be approved or cancelled.",
        },
        { status: 400 }
      );
    }

    if (action === "approve") {
      const { error: updateError } =
        await adminSupabase
          .from("crownlink_matches")
          .update({
            status: "approved",
            approved_at: new Date().toISOString(),
          })
          .eq("id", matchId)
          .eq("status", "suggested");

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        status: "approved",
      });
    }

    const { error: cancelError } =
      await adminSupabase
        .from("crownlink_matches")
        .update({
          status: "cancelled",
          approved_at: null,
        })
        .eq("id", matchId)
        .eq("status", "suggested");

    if (cancelError) {
      return NextResponse.json(
        { error: cancelError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "cancelled",
    });
  } catch (error) {
    console.error("MATCH STATUS ERROR:", error);

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}