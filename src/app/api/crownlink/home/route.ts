import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    const accessToken = authorization
      .slice("Bearer ".length)
      .trim();

    if (!accessToken) {
      return null;
    }

    const adminSupabase = createAdminClient();

    const {
      data: { user },
      error,
    } = await adminSupabase.auth.getUser(accessToken);

    if (error || !user) {
      return null;
    }

    return user;
  }

  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated.",
        },
        { status: 401 }
      );
    }

    const adminSupabase = createAdminClient();

    // ---------------------------------------------------------
    // ROLE
    // ---------------------------------------------------------

    const { data: userRole, error: roleError } =
      await adminSupabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", user.id)
        .maybeSingle();

    if (
      roleError ||
      !userRole ||
      userRole.status !== "active" ||
      userRole.role !== "creator"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Creator access required.",
        },
        { status: 403 }
      );
    }

    // ---------------------------------------------------------
    // CREATOR PROFILE
    // ---------------------------------------------------------

    const { data: profile, error: profileError } =
      await adminSupabase
        .from("crownlink_profiles")
        .select(`
          id,
          display_name,
          tiktok_username,
          diamond_level
        `)
        .eq("user_id", user.id)
        .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          success: false,
          error: "Creator profile not found.",
        },
        { status: 404 }
      );
    }

    // ---------------------------------------------------------
    // NEXT APPROVED BATTLE
    // ---------------------------------------------------------

    const { data: battleRows } =
      await adminSupabase
        .from("crownlink_matches")
        .select(`
          id,
          event_id,
          creator_one_id,
          creator_two_id,
          battle_date,
          battle_time,
          status
        `)
        .eq("status", "approved")
        .or(
          `creator_one_id.eq.${profile.id},creator_two_id.eq.${profile.id}`
        )
        .order("battle_date", { ascending: true })
        .order("battle_time", { ascending: true })
        .limit(10);

    const today = new Date()
      .toLocaleDateString("en-CA", {
        timeZone: "America/New_York",
      });

    const upcomingBattles =
      battleRows?.filter((battle) => {
        if (!battle.battle_date) {
          return false;
        }

        return battle.battle_date >= today;
      }) ?? [];

    const nextBattleRow =
      upcomingBattles.length > 0
        ? upcomingBattles[0]
        : null;

    let nextBattle = null;

    if (nextBattleRow) {
      const opponentId =
        nextBattleRow.creator_one_id === profile.id
          ? nextBattleRow.creator_two_id
          : nextBattleRow.creator_one_id;

      const [
        { data: opponent },
        { data: event },
      ] = await Promise.all([
        adminSupabase
          .from("crownlink_profiles")
          .select(`
            id,
            display_name,
            tiktok_username,
            diamond_level
          `)
          .eq("id", opponentId)
          .maybeSingle(),

        adminSupabase
          .from("crownlink_events")
          .select(`
            id,
            name
          `)
          .eq("id", nextBattleRow.event_id)
          .maybeSingle(),
      ]);

      nextBattle = {
        id: nextBattleRow.id,
        battle_date: nextBattleRow.battle_date,
        battle_time: nextBattleRow.battle_time,
        status: nextBattleRow.status,

        event: event
          ? {
              id: event.id,
              name: event.name,
            }
          : null,

        opponent: opponent
          ? {
              id: opponent.id,
              display_name: opponent.display_name,
              tiktok_username:
                opponent.tiktok_username,
              diamond_level:
                opponent.diamond_level,
            }
          : null,
      };
    }

    // ---------------------------------------------------------
    // REWARDS
    // ---------------------------------------------------------

    const { data: rewardRows } =
      await adminSupabase
        .from("rewards")
        .select(`
          id,
          reward_name,
          reward_month,
          gift,
          coins,
          dropped,
          dropped_at
        `)
        .eq("creator_id", profile.id);

    const rewards = rewardRows ?? [];

    const pendingRewards =
      rewards.filter(
        (reward) => !reward.dropped
      );

    const deliveredRewards =
      rewards.filter(
        (reward) => reward.dropped
      );

    // ---------------------------------------------------------
    // ANALYTICS
    // ---------------------------------------------------------

    const { data: analyticsLink } =
      await adminSupabase
        .from("creator_analytics_links")
        .select(`
          creator_id,
          status
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

    let analytics = null;

    if (analyticsLink?.creator_id) {
      const { data: stats } =
        await adminSupabase
          .from("backstage_creator_stats")
          .select(`
            username,
            diamonds,
            live_days,
            live_duration,
            matches,
            diamonds_from_matches,
            updated_at
          `)
          .eq(
            "creator_id",
            analyticsLink.creator_id
          )
          .order("updated_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

      if (stats) {
        analytics = {
          connected: true,
          username: stats.username,
          diamonds: stats.diamonds,
          live_days: stats.live_days,
          live_hours: stats.live_duration,
          matches: stats.matches,
          diamonds_from_matches:
            stats.diamonds_from_matches,
          updated_at: stats.updated_at,
        };
      }
    }

    if (!analytics) {
      analytics = {
        connected: false,
      };
    }

    // ---------------------------------------------------------
    // ATTENDANCE / ALERTS
    // ---------------------------------------------------------

    let noShowCount = 0;
    let replacementCount = 0;

    const { data: attendanceRows } =
      await adminSupabase
        .from("crownlink_attendance")
        .select(`
          status
        `)
        .eq("creator_id", profile.id);

    if (attendanceRows) {
      noShowCount =
        attendanceRows.filter(
          (row) =>
            row.status === "no_show"
        ).length;

      replacementCount =
        attendanceRows.filter(
          (row) =>
            row.status === "replacement"
        ).length;
    }

    const alerts: Array<{
      type: string;
      title: string;
      message: string;
    }> = [];

    if (noShowCount > 0) {
      alerts.push({
        type:
          noShowCount >= 3
            ? "danger"
            : "warning",

        title:
          noShowCount >= 3
            ? "Battle Signup Restriction"
            : "Attendance Notice",

        message:
          noShowCount >= 3
            ? `You currently have ${noShowCount} no-shows. Battle signup restrictions may apply.`
            : `You currently have ${noShowCount} no-show${noShowCount === 1 ? "" : "s"} on your attendance record.`,
      });
    }

    if (pendingRewards.length > 0) {
      alerts.push({
        type: "reward",
        title: "Reward Pending",
        message:
          pendingRewards.length === 1
            ? "You have 1 reward waiting to be delivered."
            : `You have ${pendingRewards.length} rewards waiting to be delivered.`,
      });
    }

    // ---------------------------------------------------------
    // RESPONSE
    // ---------------------------------------------------------

    return NextResponse.json({
      success: true,

      profile: {
        id: profile.id,
        display_name: profile.display_name,
        tiktok_username:
          profile.tiktok_username,
        diamond_level:
          profile.diamond_level,
      },

      next_battle: nextBattle,

      rewards: {
        pending_count:
          pendingRewards.length,
        delivered_count:
          deliveredRewards.length,

        next_pending:
          pendingRewards.length > 0
            ? pendingRewards[0]
            : null,
      },

      analytics,

      attendance: {
        no_show_count: noShowCount,
        replacement_count:
          replacementCount,
      },

      alerts,
    });
  } catch (error) {
    console.error(
      "Home dashboard API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load dashboard.",
      },
      { status: 500 }
    );
  }
}
