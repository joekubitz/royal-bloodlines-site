import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

/**
 * Supports:
 * 1. Website authentication through Supabase cookies
 * 2. Native iOS / Android authentication through
 *    Authorization: Bearer <Supabase access token>
 */
async function getAuthenticatedUser(
  request: Request
) {
  const authorization =
    request.headers.get("authorization");

  // Native app authentication
  if (
    authorization &&
    authorization
      .toLowerCase()
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

// MARK: - ADD UNAVAILABLE TIME

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
            "Not authenticated.",
        },
        {
          status: 401,
        }
      );
    }

    const adminSupabase =
      createAdminClient();

    // Verify role server-side.
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
        "UNAVAILABLE TIME ROLE CHECK ERROR:",
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
      ![
        "creator",
        "agent",
        "admin",
      ].includes(userRole.role) ||
      userRole.status !== "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Active account access required.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const eventId =
      String(
        body.eventId ?? ""
      ).trim();

    const eventDateId =
      String(
        body.eventDateId ?? ""
      ).trim();

    const blockedTime =
      String(
        body.blockedTime ?? ""
      ).trim();

    if (
      !eventId ||
      !eventDateId ||
      !blockedTime
    ) {
      return NextResponse.json(
        {
          error:
            "Event, event date, and blocked time are required.",
        },
        {
          status: 400,
        }
      );
    }

    // Verify this user is actually
    // signed up for this event.
    const {
      data: signup,
      error: signupError,
    } = await adminSupabase
      .from(
        "crownlink_event_signups"
      )
      .select("id, status")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      signupError ||
      !signup ||
      signup.status !== "signed_up"
    ) {
      return NextResponse.json(
        {
          error:
            "You must be signed up for this event first.",
        },
        {
          status: 403,
        }
      );
    }

    // Verify this required date
    // belongs to this event.
    const {
      data: eventDate,
      error: eventDateError,
    } = await adminSupabase
      .from(
        "crownlink_event_dates"
      )
      .select("id, event_id")
      .eq("id", eventDateId)
      .eq("event_id", eventId)
      .maybeSingle();

    if (
      eventDateError ||
      !eventDate
    ) {
      return NextResponse.json(
        {
          error:
            "Required event date not found.",
        },
        {
          status: 404,
        }
      );
    }

    // Add blocked time.
    const {
      data: blockedRecord,
      error: insertError,
    } = await adminSupabase
      .from(
        "crownlink_event_unavailable_times"
      )
      .insert({
        event_id: eventId,
        event_date_id:
          eventDateId,
        user_id: user.id,
        blocked_time:
          blockedTime,
      })
      .select()
      .single();

    if (insertError) {
      // Duplicate unavailable time.
      if (
        insertError.code ===
        "23505"
      ) {
        return NextResponse.json(
          {
            error:
              "That time is already marked unavailable.",
          },
          {
            status: 409,
          }
        );
      }

      console.error(
        "ADD UNAVAILABLE TIME ERROR:",
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
      unavailableTime:
        blockedRecord,
    });
  } catch (error) {
    console.error(
      "ADD UNAVAILABLE TIME ERROR:",
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

// MARK: - REMOVE UNAVAILABLE TIME

export async function DELETE(
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
            "Not authenticated.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const unavailableTimeId =
      String(
        body.unavailableTimeId ??
          ""
      ).trim();

    if (!unavailableTimeId) {
      return NextResponse.json(
        {
          error:
            "Unavailable time ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const adminSupabase =
      createAdminClient();

    // Find the record first so we can
    // verify ownership.
    const {
      data: unavailableTime,
      error: lookupError,
    } = await adminSupabase
      .from(
        "crownlink_event_unavailable_times"
      )
      .select("id, user_id")
      .eq(
        "id",
        unavailableTimeId
      )
      .maybeSingle();

    if (
      lookupError ||
      !unavailableTime
    ) {
      return NextResponse.json(
        {
          error:
            "Unavailable time not found.",
        },
        {
          status: 404,
        }
      );
    }

    // Users can only remove their
    // own unavailable time.
    if (
      unavailableTime.user_id !==
      user.id
    ) {
      return NextResponse.json(
        {
          error:
            "You can only remove your own unavailable times.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      error: deleteError,
    } = await adminSupabase
      .from(
        "crownlink_event_unavailable_times"
      )
      .delete()
      .eq(
        "id",
        unavailableTimeId
      );

    if (deleteError) {
      console.error(
        "REMOVE UNAVAILABLE TIME ERROR:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            deleteError.message,
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
      "REMOVE UNAVAILABLE TIME ERROR:",
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
