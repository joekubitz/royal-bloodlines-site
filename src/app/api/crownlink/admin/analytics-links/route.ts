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

    const { data: role } =
      await supabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", user.id)
        .maybeSingle();

    if (
      !role ||
      role.role !== "admin" ||
      role.status !== "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Admin access required.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const requestId =
      String(
        body.requestId ?? ""
      ).trim();

    const action =
      String(
        body.action ?? ""
      ).trim();

    if (
      !requestId ||
      !["approve", "reject"].includes(
        action
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid request.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: linkRequest,
      error: loadError,
    } = await adminSupabase
      .from(
        "creator_analytics_link_requests"
      )
      .select(`
        id,
        user_id,
        requested_creator_record_id,
        requested_username,
        status
      `)
      .eq("id", requestId)
      .eq("status", "pending")
      .maybeSingle();

    if (
      loadError ||
      !linkRequest
    ) {
      return NextResponse.json(
        {
          error:
            "Pending request not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (action === "reject") {
      const { error } =
        await adminSupabase
          .from(
            "creator_analytics_link_requests"
          )
          .update({
            status:
              "rejected",

            reviewed_by:
              user.id,

            reviewed_at:
              new Date().toISOString(),
          })
          .eq("id", requestId);

      if (error) {
        return NextResponse.json(
          {
            error:
              error.message,
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        success: true,
      });
    }

    /*
      APPROVE
    */

    const { error: linkError } =
      await adminSupabase
        .from(
          "creator_analytics_links"
        )
        .insert({
          user_id:
            linkRequest.user_id,

          creator_record_id:
            linkRequest.requested_creator_record_id,

          status:
            "active",

          approved_by:
            user.id,

          approved_at:
            new Date().toISOString(),
        });

    if (linkError) {
      console.error(
        "Analytics link creation error:",
        linkError
      );

      return NextResponse.json(
        {
          error:
            linkError.message,
        },
        {
          status: 500,
        }
      );
    }

    const { error: requestError } =
      await adminSupabase
        .from(
          "creator_analytics_link_requests"
        )
        .update({
          status:
            "approved",

          reviewed_by:
            user.id,

          reviewed_at:
            new Date().toISOString(),
        })
        .eq("id", requestId);

    if (requestError) {
      console.error(
        "Analytics request approval update error:",
        requestError
      );

      return NextResponse.json(
        {
          error:
            requestError.message,
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
      "Analytics link admin route error:",
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