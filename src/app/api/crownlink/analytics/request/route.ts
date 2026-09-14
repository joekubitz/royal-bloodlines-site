import { NextResponse } from "next/server";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient();

    const adminSupabase =
      createAdminClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Not authenticated.",
        },
        {
          status: 401,
        }
      );
    }

    /*
      CREATOR ACCESS ONLY
    */

    const { data: role } =
      await supabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", user.id)
        .maybeSingle();

    if (
      !role ||
      role.role !== "creator" ||
      role.status !== "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Creator access required.",
        },
        {
          status: 403,
        }
      );
    }

    /*
      ALREADY LINKED?
    */

    const {
      data: existingLink,
    } = await adminSupabase
      .from(
        "creator_analytics_links"
      )
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (existingLink) {
      return NextResponse.json(
        {
          error:
            "Your account is already connected to analytics.",
        },
        {
          status: 409,
        }
      );
    }

    /*
      ALREADY PENDING?
    */

    const {
      data: existingRequest,
    } = await adminSupabase
      .from(
        "creator_analytics_link_requests"
      )
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingRequest) {
      return NextResponse.json(
        {
          error:
            "You already have a pending analytics connection request.",
        },
        {
          status: 409,
        }
      );
    }

    /*
      READ REQUEST
    */

    const body =
      await request.json();

    const creatorId =
      String(
        body.creatorId ?? ""
      ).trim();

    if (!creatorId) {
      return NextResponse.json(
        {
          error:
            "Creator ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      VERIFY THAT CREATOR ID
      REALLY EXISTS IN BACKSTAGE
    */

    const {
      data: creator,
    } = await adminSupabase
      .from(
        "backstage_creator_stats"
      )
      .select(`
        creator_id,
        username
      `)
      .eq(
        "creator_id",
        creatorId
      )
      .order("imported_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (!creator) {
      return NextResponse.json(
        {
          error:
            "That creator could not be verified in Backstage.",
        },
        {
          status: 404,
        }
      );
    }

    /*
      CREATE REQUEST
    */

    const {
      error:
        insertError,
    } = await adminSupabase
      .from(
        "creator_analytics_link_requests"
      )
      .insert({
        user_id:
          user.id,

        requested_creator_record_id:
          creator.creator_id,

        requested_username:
          creator.username,

        status:
          "pending",
      });

    if (insertError) {
      console.error(
        "Analytics request insert error:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            insertError.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Analytics request route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected server error.",
      },
      {
        status: 500,
      }
    );
  }
}