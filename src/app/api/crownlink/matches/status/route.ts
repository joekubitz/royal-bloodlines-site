import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import { sendMatchApprovedDiscordNotifications } from "@/app/lib/crownlink/sendMatchApprovedDiscordNotifications";
import { logActivity } from "@/app/crownlink/lib/logActivity";

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

    /*
     * Load the match before making
     * any changes.
     */
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
     * Try to get a readable admin name
     * for the activity log.
     *
     * If the admin does not have a
     * Crown Link profile, fall back to
     * their email address.
     */
    const {
      data: adminProfile,
    } = await adminSupabase
      .from("crownlink_profiles")
      .select(`
        display_name,
        tiktok_username
      `)
      .eq("user_id", user.id)
      .maybeSingle();

    const actorName =
      adminProfile?.display_name ||
      adminProfile?.tiktok_username ||
      user.email ||
      "Admin";

    /*
     * Load both creator profiles so
     * activity entries are readable
     * instead of showing only UUIDs.
     */
    const creatorIds = [
      match.creator_one_id,
      match.creator_two_id,
    ].filter(Boolean);

    let creatorOneName =
      match.creator_one_id;

    let creatorTwoName =
      match.creator_two_id;

    if (creatorIds.length > 0) {
      const {
        data: creatorProfiles,
      } = await adminSupabase
        .from("crownlink_profiles")
        .select(`
          id,
          display_name,
          tiktok_username
        `)
        .in("id", creatorIds);

      const creatorOne =
        creatorProfiles?.find(
          (profile) =>
            profile.id ===
            match.creator_one_id
        );

      const creatorTwo =
        creatorProfiles?.find(
          (profile) =>
            profile.id ===
            match.creator_two_id
        );

      creatorOneName =
        creatorOne?.tiktok_username
          ? `@${creatorOne.tiktok_username}`
          : creatorOne?.display_name ||
            match.creator_one_id;

      creatorTwoName =
        creatorTwo?.tiktok_username
          ? `@${creatorTwo.tiktok_username}`
          : creatorTwo?.display_name ||
            match.creator_two_id;
    }

    const matchDisplayName =
      `${creatorOneName} vs ${creatorTwoName}`;

    /*
     * APPROVE MATCH
     *
     * Approval remains for compatibility
     * with older suggested matches.
     *
     * New Bloodline Arena matches are
     * normally approved automatically.
     */
    if (action === "approve") {
      if (
        match.status === "approved"
      ) {
        return NextResponse.json({
          success: true,
          action: "approve",
          eventId: match.event_id,
          matchId: match.id,
          message:
            "This match is already approved.",
        });
      }

      if (
        match.status !== "suggested"
      ) {
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
          {
            error:
              approveError.message,
          },
          { status: 500 }
        );
      }

      /*
       * Record successful approval.
       */
      await logActivity({
        actorUserId: user.id,
        actorRole: userRole.role,
        actorName,

        actionType: "match_approved",
        actionLabel: "Approved battle",

        description:
          `Approved ${matchDisplayName}.`,

        area: "royals_battles",

        targetType: "match",
        targetId: match.id,
        targetName:
          matchDisplayName,

        metadata: {
          eventId: match.event_id,
          creatorOneId:
            match.creator_one_id,
          creatorTwoId:
            match.creator_two_id,
          eventDateId:
            match.event_date_id,
          scheduleSlotId:
            match.schedule_slot_id,
          previousStatus:
            match.status,
          newStatus: "approved",
        },

        source: "user",
      });

      /*
       * Notify both creators after
       * approval.
       *
       * Discord delivery failure does
       * not undo the approved matchup.
       */
      const discordNotifications =
        await sendMatchApprovedDiscordNotifications(
          match.id
        );

      return NextResponse.json({
        success: true,
        action: "approve",
        eventId: match.event_id,
        matchId: match.id,
        discordNotifications,
        message: "Match approved.",
      });
    }

    /*
     * CANCEL MATCH
     *
     * Admins may cancel either an older
     * suggested match or an approved
     * match.
     *
     * Creator signup remains active so
     * Generate Matches can place them
     * into a future matchup.
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
        {
          error:
            cancelError.message,
        },
        { status: 500 }
      );
    }

    /*
     * Record successful cancellation.
     */
    await logActivity({
      actorUserId: user.id,
      actorRole: userRole.role,
      actorName,

      actionType: "match_cancelled",
      actionLabel: "Cancelled battle",

      description:
        `Cancelled ${matchDisplayName}.`,

      area: "royals_battles",

      targetType: "match",
      targetId: match.id,
      targetName:
        matchDisplayName,

      metadata: {
        eventId: match.event_id,
        creatorOneId:
          match.creator_one_id,
        creatorTwoId:
          match.creator_two_id,
        eventDateId:
          match.event_date_id,
        scheduleSlotId:
          match.schedule_slot_id,
        previousStatus:
          match.status,
        newStatus: "cancelled",
      },

      source: "user",
    });

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