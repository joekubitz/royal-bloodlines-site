import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getAuthenticatedUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  /*
    IOS / MOBILE APP AUTH
  */
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    const accessToken = authorization.slice(7).trim();

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

  /*
    WEBSITE SESSION AUTH
  */
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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

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

    const adminSupabase = createAdminClient();

    /*
      VERIFY ACTIVE AGENT ROLE
    */
    const {
      data: userRole,
      error: roleError,
    } = await adminSupabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError) {
      console.error(
        "Agent analytics role error:",
        roleError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify account access.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !userRole ||
      userRole.status !== "active" ||
      userRole.role !== "agent"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Agent access required.",
        },
        {
          status: 403,
        }
      );
    }

    /*
      FIND AGENT'S BACKSTAGE MANAGER
    */
    const {
      data: agentAccess,
      error: accessError,
    } = await adminSupabase
      .from("analytics_agent_access")
      .select(`
        backstage_manager,
        status
      `)
      .eq("user_id", user.id)
      .maybeSingle();

    if (accessError) {
      console.error(
        "Agent analytics access error:",
        accessError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to load agent analytics access.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !agentAccess ||
      agentAccess.status !== "active" ||
      !agentAccess.backstage_manager
    ) {
      return NextResponse.json({
        success: true,
        state: "not_connected",
        manager: null,
        creators: [],
        totals: {
          creators: 0,
          diamonds: 0,
          requirements_met: 0,
          matches: 0,
          match_diamonds: 0,
          last_month_diamonds: 0,
        },
      });
    }

    const manager = agentAccess.backstage_manager;

    /*
      LOAD ALL STATS FOR THIS MANAGER.

      Rows are sorted newest first so that when
      duplicate usernames exist, the newest row
      is the one we keep.
    */
    const {
      data: statsRows,
      error: statsError,
    } = await adminSupabase
      .from("backstage_creator_stats")
      .select(`
        creator_id,
        username,
        manager,
        diamonds,
        live_days,
        live_duration,
        matches,
        diamonds_from_matches,
        last_month_diamonds,
        last_month_days,
        last_month_hours,
        days_since_joining,
        imported_at
      `)
      .eq("manager", manager)
      .order("imported_at", {
        ascending: false,
      });

    if (statsError) {
      console.error(
        "Agent analytics stats error:",
        statsError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to load team analytics.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      REMOVE DUPLICATE CREATORS.

      Backstage may contain multiple Creator IDs
      for the same TikTok username, so username is
      the unique key here.

      We normalize capitalization, spaces, and @.
    */
    const creatorMap = new Map<
      string,
      NonNullable<typeof statsRows>[number]
    >();

    for (const row of statsRows ?? []) {
      const normalizedUsername = row.username
        .trim()
        .toLowerCase()
        .replace(/^@/, "");

      if (
        normalizedUsername &&
        !creatorMap.has(normalizedUsername)
      ) {
        creatorMap.set(normalizedUsername, row);
      }
    }

    /*
      SORT CURRENT CREATORS BY DIAMONDS
    */
    const creators = Array.from(
      creatorMap.values()
    ).sort(
      (a, b) =>
        Number(b.diamonds ?? 0) -
        Number(a.diamonds ?? 0)
    );

    /*
      TEAM TOTALS
    */
    const totals = creators.reduce(
      (result, creator) => {
        result.creators += 1;

        /*
          CREATOR REQUIREMENT:
          Must have BOTH 12+ LIVE days
          AND 25+ LIVE hours.
        */
        if (
          Number(creator.live_days ?? 0) >= 12 &&
          Number(creator.live_duration ?? 0) >= 25
        ) {
          result.requirements_met += 1;
        }

        result.diamonds += Number(
          creator.diamonds ?? 0
        );

        result.matches += Number(
          creator.matches ?? 0
        );

        result.match_diamonds += Number(
          creator.diamonds_from_matches ?? 0
        );

        result.last_month_diamonds += Number(
          creator.last_month_diamonds ?? 0
        );

        return result;
      },
      {
        creators: 0,
        diamonds: 0,
        requirements_met: 0,
        matches: 0,
        match_diamonds: 0,
        last_month_diamonds: 0,
      }
    );

    /*
      RESPONSE
    */
    return NextResponse.json({
      success: true,
      state: "connected",
      manager,
      totals,
      creators,
    });
  } catch (error) {
    console.error(
      "Agent analytics API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while loading agent analytics.",
      },
      {
        status: 500,
      }
    );
  }
}