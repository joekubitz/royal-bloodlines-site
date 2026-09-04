import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import { rebuildScheduleSlots } from "@/app/lib/crownlink/rebuildScheduleSlots";

const TEST_PASSWORD = "CrownLinkTest123!";

const TEST_CREATORS = [
  {
    email: "crownlinktest1@example.com",
    displayName: "Crown Test 1",
    tiktokUsername: "crown_test_1",
    diamondLevel: 25000,
  },
  {
    email: "crownlinktest2@example.com",
    displayName: "Crown Test 2",
    tiktokUsername: "crown_test_2",
    diamondLevel: 40000,
  },
  {
    email: "crownlinktest3@example.com",
    displayName: "Crown Test 3",
    tiktokUsername: "crown_test_3",
    diamondLevel: 65000,
  },
  {
    email: "crownlinktest4@example.com",
    displayName: "Crown Test 4",
    tiktokUsername: "crown_test_4",
    diamondLevel: 90000,
  },
  {
    email: "crownlinktest5@example.com",
    displayName: "Crown Test 5",
    tiktokUsername: "crown_test_5",
    diamondLevel: 125000,
  },
  {
    email: "crownlinktest6@example.com",
    displayName: "Crown Test 6",
    tiktokUsername: "crown_test_6",
    diamondLevel: 175000,
  },
];

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      ),
    };
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
    return {
      error: NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      ),
    };
  }

  return {
    user,
  };
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();

    if ("error" in auth) {
      return auth.error;
    }

    const body = await request.json();

    const eventId = String(
      body.eventId || ""
    ).trim();

    if (!eventId) {
      return NextResponse.json(
        {
          error:
            "Event ID is required.",
        },
        { status: 400 }
      );
    }

    const adminSupabase =
      createAdminClient();

    const {
      data: event,
      error: eventError,
    } = await adminSupabase
      .from("crownlink_events")
      .select("id, status")
      .eq("id", eventId)
      .maybeSingle();

    if (
      eventError ||
      !event
    ) {
      return NextResponse.json(
        {
          error:
            "Event not found.",
        },
        { status: 404 }
      );
    }

    const {
      data: agencies,
      error: agenciesError,
    } = await adminSupabase
      .from("crownlink_agencies")
      .select("id, name")
      .eq("status", "active")
      .limit(3);

    if (agenciesError) {
      return NextResponse.json(
        {
          error:
            agenciesError.message,
        },
        { status: 500 }
      );
    }

    const agencyIds =
      agencies?.map(
        (agency) => agency.id
      ) ?? [];

    const createdUserIds: string[] =
      [];

    for (
      let index = 0;
      index <
      TEST_CREATORS.length;
      index++
    ) {
      const testCreator =
        TEST_CREATORS[index];

      let userId: string | null =
        null;

      const {
        data: existingUsers,
        error:
          existingUsersError,
      } =
        await adminSupabase.auth.admin.listUsers(
          {
            page: 1,
            perPage: 1000,
          }
        );

      if (existingUsersError) {
        throw new Error(
          existingUsersError.message
        );
      }

      const existingUser =
        existingUsers.users.find(
          (candidate) =>
            candidate.email ===
            testCreator.email
        );

      if (existingUser) {
        userId =
          existingUser.id;
      } else {
        const {
          data: createdUser,
          error:
            createUserError,
        } =
          await adminSupabase.auth.admin.createUser(
            {
              email:
                testCreator.email,
              password:
                TEST_PASSWORD,
              email_confirm: true,
            }
          );

        if (
          createUserError ||
          !createdUser.user
        ) {
          throw new Error(
            createUserError?.message ||
              `Could not create ${testCreator.email}.`
          );
        }

        userId =
          createdUser.user.id;
      }

      createdUserIds.push(
        userId
      );

      const selectedAgency =
        agencies && agencies.length > 0
          ? agencies[
              index %
                agencies.length
            ]
          : null;

      const agencyId =
        selectedAgency?.id ?? null;

      const agencyName =
        selectedAgency?.name ??
        "Test Agency";

      const {
        error: roleError,
      } = await adminSupabase
        .from("user_roles")
        .upsert(
          {
            user_id:
              userId,
            role:
              "creator",
            status:
              "active",
            agency_id:
              agencyId,
          },
          {
            onConflict:
              "user_id",
          }
        );

      if (roleError) {
        throw new Error(
          roleError.message
        );
      }

      const {
        error: profileError,
      } = await adminSupabase
        .from(
          "crownlink_profiles"
        )
        .upsert(
          {
            user_id:
              userId,
            display_name:
              testCreator.displayName,
            tiktok_username:
              testCreator.tiktokUsername,
            diamond_level:
              testCreator.diamondLevel,
            agency_name:
              agencyName,
          },
          {
            onConflict:
              "user_id",
          }
        );

      if (profileError) {
        throw new Error(
          profileError.message
        );
      }

      const {
        data: existingSignup,
        error:
          existingSignupError,
      } = await adminSupabase
        .from(
          "crownlink_event_signups"
        )
        .select("id, status")
        .eq(
          "event_id",
          eventId
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

      if (
        existingSignupError
      ) {
        throw new Error(
          existingSignupError.message
        );
      }

      if (existingSignup) {
        const {
          error:
            updateSignupError,
        } =
          await adminSupabase
            .from(
              "crownlink_event_signups"
            )
            .update({
              status:
                "signed_up",
            })
            .eq(
              "id",
              existingSignup.id
            );

        if (
          updateSignupError
        ) {
          throw new Error(
            updateSignupError.message
          );
        }
      } else {
        const {
          error:
            insertSignupError,
        } =
          await adminSupabase
            .from(
              "crownlink_event_signups"
            )
            .insert({
              event_id:
                eventId,
              user_id:
                userId,
              status:
                "signed_up",
            });

        if (
          insertSignupError
        ) {
          throw new Error(
            insertSignupError.message
          );
        }
      }
    }

    await rebuildScheduleSlots(
      adminSupabase,
      eventId
    );

    return NextResponse.json({
      success: true,
      creatorsAdded:
        createdUserIds.length,
      userIds:
        createdUserIds,
    });
  } catch (error) {
    console.error(
      "CREATE CROWN LINK TEST DATA ERROR:",
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

export async function DELETE(
  request: Request
) {
  try {
    const auth =
      await requireAdmin();

    if ("error" in auth) {
      return auth.error;
    }

    const body =
      await request.json();

    const eventId = String(
      body.eventId || ""
    ).trim();

    if (!eventId) {
      return NextResponse.json(
        {
          error:
            "Event ID is required.",
        },
        { status: 400 }
      );
    }

    const adminSupabase =
      createAdminClient();

    const {
      data: usersData,
      error: usersError,
    } =
      await adminSupabase.auth.admin.listUsers(
        {
          page: 1,
          perPage: 1000,
        }
      );

    if (usersError) {
      throw new Error(
        usersError.message
      );
    }

    const testEmails =
      new Set(
        TEST_CREATORS.map(
          (creator) =>
            creator.email
        )
      );

    const testUsers =
      usersData.users.filter(
        (user) =>
          user.email &&
          testEmails.has(
            user.email
          )
      );

    const testUserIds =
      testUsers.map(
        (user) => user.id
      );

    if (
      testUserIds.length === 0
    ) {
      return NextResponse.json({
        success: true,
        creatorsRemoved: 0,
      });
    }

    const {
      error: matchDeleteError,
    } = await adminSupabase
      .from("crownlink_matches")
      .delete()
      .eq("event_id", eventId)
      .or(
        testUserIds
          .map(
            (userId) =>
              `creator_one_id.eq.${userId},creator_two_id.eq.${userId}`
          )
          .join(",")
      );

    if (matchDeleteError) {
      throw new Error(
        matchDeleteError.message
      );
    }

    const {
      error: unavailableDeleteError,
    } = await adminSupabase
      .from(
        "crownlink_event_unavailable_times"
      )
      .delete()
      .eq("event_id", eventId)
      .in(
        "user_id",
        testUserIds
      );

    if (
      unavailableDeleteError
    ) {
      throw new Error(
        unavailableDeleteError.message
      );
    }

    const {
      error: signupDeleteError,
    } = await adminSupabase
      .from(
        "crownlink_event_signups"
      )
      .delete()
      .eq("event_id", eventId)
      .in(
        "user_id",
        testUserIds
      );

    if (
      signupDeleteError
    ) {
      throw new Error(
        signupDeleteError.message
      );
    }

    await rebuildScheduleSlots(
      adminSupabase,
      eventId
    );

    return NextResponse.json({
      success: true,
      creatorsRemoved:
        testUserIds.length,
    });
  } catch (error) {
    console.error(
      "DELETE CROWN LINK TEST DATA ERROR:",
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