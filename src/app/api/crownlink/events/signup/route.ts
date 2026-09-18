import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import { rebuildScheduleSlots } from "@/app/lib/crownlink/rebuildScheduleSlots";

/**
 * Supports both:
 *
 * 1. Website authentication through Supabase cookies
 * 2. Native iOS / Android authentication through
 *    Authorization: Bearer <Supabase access token>
 */
async function getAuthenticatedUser(request: Request) {
  const authorization =
    request.headers.get("authorization");

  // Native app authentication
  if (
    authorization &&
    authorization.toLowerCase().startsWith("bearer ")
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
    } = await adminSupabase.auth.getUser(
      accessToken
    );

    if (error || !user) {
      console.error(
        "NATIVE AUTH TOKEN ERROR:",
        error
      );

      return null;
    }

    return user;
  }

  // Existing website authentication
  const supabase =
    await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function POST(
  request: Request
) {
  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          error:
            "You must be logged in.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * Everything below this point happens
     * server-side.
     *
     * The user's identity has already been
     * verified by Supabase.
     */
    const adminSupabase =
      createAdminClient();

    // MARK: Check role

    const {
      data: userRole,
      error: userRoleError,
    } = await adminSupabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .single();

    if (userRoleError) {
      console.error(
        "USER ROLE CHECK ERROR:",
        userRoleError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify your account permissions.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !userRole ||
      userRole.status !== "active" ||
      ![
        "creator",
        "agent",
        "admin",
      ].includes(userRole.role)
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to sign up for this event.",
        },
        {
          status: 403,
        }
      );
    }

    // MARK: Read event ID

    const body =
      await request.json();

    const eventId =
      String(
        body.eventId ?? ""
      ).trim();

    if (!eventId) {
      return NextResponse.json(
        {
          error:
            "Event ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    // MARK: Verify event

    const {
      data: event,
      error: eventError,
    } = await adminSupabase
      .from("crownlink_events")
      .select("id, status")
      .eq("id", eventId)
      .single();

    if (
      eventError ||
      !event ||
      event.status !== "active"
    ) {
      return NextResponse.json(
        {
          error:
            "This event is not available for signup.",
        },
        {
          status: 400,
        }
      );
    }

    // MARK: Current signup

    const {
      data: currentSignup,
      error: currentSignupError,
    } = await adminSupabase
      .from(
        "crownlink_event_signups"
      )
      .select("id, status")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (currentSignupError) {
      return NextResponse.json(
        {
          error:
            currentSignupError.message,
        },
        {
          status: 500,
        }
      );
    }

    // MARK: Admin removed

    if (
      currentSignup?.status ===
      "removed"
    ) {
      return NextResponse.json(
        {
          error:
            "You were removed from this event by an admin and cannot rejoin unless an admin restores your signup.",
          status: "removed",
        },
        {
          status: 403,
        }
      );
    }

    // MARK: Already signed up -> cancel

    if (
      currentSignup?.status ===
      "signed_up"
    ) {
      /*
       * Before cancellation, make sure
       * this creator does not already
       * have an approved battle.
       */
      const {
        data: approvedMatches,
        error: matchError,
      } = await adminSupabase
        .from("crownlink_matches")
        .select("id")
        .eq("event_id", eventId)
        .eq("status", "approved")
        .or(
          `creator_one_id.eq.${user.id},creator_two_id.eq.${user.id}`
        )
        .limit(1);

      if (matchError) {
        return NextResponse.json(
          {
            error:
              matchError.message,
          },
          {
            status: 500,
          }
        );
      }

      if (
        approvedMatches &&
        approvedMatches.length > 0
      ) {
        return NextResponse.json(
          {
            error:
              "Your signup is locked because your battle has already been approved.",
            status:
              "signed_up",
            matched: true,
          },
          {
            status: 409,
          }
        );
      }

      const {
        error: cancelError,
      } = await adminSupabase
        .from(
          "crownlink_event_signups"
        )
        .update({
          status: "cancelled",
        })
        .eq(
          "id",
          currentSignup.id
        );

      if (cancelError) {
        return NextResponse.json(
          {
            error:
              cancelError.message,
          },
          {
            status: 500,
          }
        );
      }

      /*
       * Keep the existing scheduling
       * system in sync.
       */
      await rebuildScheduleSlots(
        adminSupabase,
        eventId
      );

      return NextResponse.json({
        success: true,
        status: "cancelled",
        message:
          "Your event signup has been cancelled.",
      });
    }

    // MARK: Previously cancelled -> rejoin

    if (
      currentSignup?.status ===
      "cancelled"
    ) {
      const {
        error: rejoinError,
      } = await adminSupabase
        .from(
          "crownlink_event_signups"
        )
        .update({
          status: "signed_up",
        })
        .eq(
          "id",
          currentSignup.id
        )
        .eq(
          "status",
          "cancelled"
        );

      if (rejoinError) {
        return NextResponse.json(
          {
            error:
              rejoinError.message,
          },
          {
            status: 500,
          }
        );
      }

      await rebuildScheduleSlots(
        adminSupabase,
        eventId
      );

      return NextResponse.json({
        success: true,
        status: "signed_up",
        message:
          "You are signed up for this event.",
      });
    }

    // MARK: New signup

    const {
      error: insertError,
    } = await adminSupabase
      .from(
        "crownlink_event_signups"
      )
      .insert({
        event_id: eventId,
        user_id: user.id,
        status: "signed_up",
      });

    if (insertError) {
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

    await rebuildScheduleSlots(
      adminSupabase,
      eventId
    );

    return NextResponse.json({
      success: true,
      status: "signed_up",
      message:
        "You are signed up for this event.",
    });
  } catch (error) {
    console.error(
      "BLOODLINE ARENA SIGNUP ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error.",
      },
      {
        status: 500,
      }
    );
  }
}