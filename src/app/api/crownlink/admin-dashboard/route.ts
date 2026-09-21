kimport { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

import {
  getCreatorLevel,
  type CreatorLevel,
} from "@/app/admin/analytics/levelRules";

import {
  getRankUp,
} from "@/app/admin/analytics/tierRules";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getAuthenticatedUser(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization");

  /*
    IOS / MOBILE APP AUTH
  */
  if (
    authorization
      ?.toLowerCase()
      .startsWith("bearer ")
  ) {
    const accessToken =
      authorization.slice(7).trim();

    if (!accessToken) {
      return null;
    }

    const adminSupabase =
      createAdminClient();

    const {
      data: { user },
      error,
    } =
      await adminSupabase.auth.getUser(
        accessToken
      );

    if (error || !user) {
      return null;
    }

    return user;
  }

  /*
    WEBSITE SESSION AUTH
  */
  const supabase =
    await createClient();

  const {
    data: { user },
    error,
  } =
    await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function GET(
  request: NextRequest
) {
  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const adminSupabase =
      createAdminClient();

    /*
      VERIFY ACTIVE ADMIN ROLE
    */
    const {
      data: userRole,
      error: roleError,
    } =
      await adminSupabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", user.id)
        .maybeSingle();

    if (roleError) {
      console.error(
        "Admin dashboard role error:",
        roleError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify account access.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !userRole ||
      userRole.role !== "admin" ||
      userRole.status !== "active"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Administrator access required.",
        },
        {
          status: 403,
        }
      );
    }

    /*
      LOAD BACKSTAGE CREATOR STATS

      Newest imports are first.
      We keep only the newest row
      for each creator.
    */
    const {
      data: rows,
      error: statsError,
    } =
      await adminSupabase
        .from("backstage_creator_stats")
        .select(`
          creator_id,
          username,
          diamonds,
          live_days,
          live_duration,
          diamonds_from_matches,
          last_month_diamonds,
          imported_at
        `)
        .order(
          "imported_at",
          {
            ascending: false,
          }
        );

    if (statsError) {
      console.error(
        "Admin dashboard stats error:",
        statsError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load agency analytics.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      DEDUPE CREATORS
    */
    const creatorMap =
      new Map<
        string,
        NonNullable<
          typeof rows
        >[number]
      >();

    for (
      const row of rows ?? []
    ) {
      const normalizedUsername =
        String(
          row.username ?? ""
        )
          .trim()
          .toLowerCase()
          .replace(/^@/, "");

      if (!normalizedUsername) {
        continue;
      }

      if (
        !creatorMap.has(
          normalizedUsername
        )
      ) {
        creatorMap.set(
          normalizedUsername,
          row
        );
      }
    }

    const creators =
      Array.from(
        creatorMap.values()
      );

    /*
      TOTALS
    */
    let diamondsThisMonth = 0;
    let diamondsLastMonth = 0;
    let matchDiamonds = 0;
    let rankUps = 0;

    const bonusLevels:
      Record<
        CreatorLevel,
        number
      > = {
        "Level 1": 0,
        "Level 2": 0,
        "Level 3": 0,
        "Level 4": 0,
        "Level 5": 0,
        "Not Qualified": 0,
      };

    for (
      const creator of creators
    ) {
      const diamonds =
        Number(
          creator.diamonds ?? 0
        );

      const lastMonthDiamonds =
        Number(
          creator.last_month_diamonds ??
            0
        );

      const creatorMatchDiamonds =
        Number(
          creator
            .diamonds_from_matches ??
            0
        );

      const days =
        Number(
          creator.live_days ?? 0
        );

      const hours =
        Number(
          creator.live_duration ?? 0
        );

      diamondsThisMonth +=
        diamonds;

      diamondsLastMonth +=
        lastMonthDiamonds;

      matchDiamonds +=
        creatorMatchDiamonds;

      const rankUp =
        getRankUp({
          currentDiamonds:
            diamonds,
          lastMonthDiamonds,
        });

      if (rankUp.rankedUp) {
        rankUps += 1;
      }

      const level =
        getCreatorLevel({
          diamonds,
          days,
          hours,
        });

      bonusLevels[level] += 1;
    }

    return NextResponse.json({
      success: true,

      totals: {
        creators:
          creators.length,

        diamonds_this_month:
          diamondsThisMonth,

        diamonds_last_month:
          diamondsLastMonth,

        match_diamonds:
          matchDiamonds,

        rank_ups:
          rankUps,
      },

      bonus_levels: {
        level_1:
          bonusLevels["Level 1"],

        level_2:
          bonusLevels["Level 2"],

        level_3:
          bonusLevels["Level 3"],

        level_4:
          bonusLevels["Level 4"],

        level_5:
          bonusLevels["Level 5"],

        not_qualified:
          bonusLevels[
            "Not Qualified"
          ],
      },
    });
  } catch (error) {
    console.error(
      "Admin dashboard API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load admin dashboard.",
      },
      {
        status: 500,
      }
    );
  }
}
