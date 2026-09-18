import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getAuthenticatedUser(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization");

  if (
    authorization?.toLowerCase().startsWith("bearer ")
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
      ROLE CHECK
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
        "Creator analytics role error:",
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
      userRole.status !== "active" ||
      userRole.role !== "creator"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Creator access required.",
        },
        {
          status: 403,
        }
      );
    }

    /*
      CHECK FOR APPROVED LINK
    */

    const {
      data: analyticsLink,
      error: linkError,
    } = await adminSupabase
      .from("creator_analytics_links")
      .select(`
        id,
        creator_record_id,
        status,
        approved_at
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (linkError) {
      console.error(
        "Creator analytics link error:",
        linkError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load analytics connection.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      CONNECTED
    */

    if (
      analyticsLink?.creator_record_id
    ) {
      const {
        data: latestStats,
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
        .eq(
          "creator_id",
          analyticsLink.creator_record_id
        )
        .order(
          "imported_at",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle();

      if (statsError) {
        console.error(
          "Creator analytics stats error:",
          statsError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to load analytics.",
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        success: true,
        state: "connected",
        link: {
          id: analyticsLink.id,
          creator_record_id:
            analyticsLink.creator_record_id,
          approved_at:
            analyticsLink.approved_at,
        },
        stats: latestStats ?? null,
        pendingRequest: null,
      });
    }

    /*
      CHECK FOR PENDING REQUEST
    */

    const {
      data: pendingRequest,
      error: pendingError,
    } = await adminSupabase
      .from(
        "creator_analytics_link_requests"
      )
      .select(`
        id,
        requested_creator_record_id,
        requested_username,
        status,
        created_at
      `)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingError) {
      console.error(
        "Creator analytics pending error:",
        pendingError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load analytics connection request.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      PENDING
    */

    if (pendingRequest) {
      return NextResponse.json({
        success: true,
        state: "pending",
        link: null,
        stats: null,
        pendingRequest,
      });
    }

    /*
      NOT CONNECTED
    */

    return NextResponse.json({
      success: true,
      state: "not_connected",
      link: null,
      stats: null,
      pendingRequest: null,
    });
  } catch (error) {
    console.error(
      "Creator analytics API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while loading creator analytics.",
      },
      {
        status: 500,
      }
    );
  }
}
