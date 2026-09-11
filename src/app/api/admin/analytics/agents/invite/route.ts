import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

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

    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      roleError ||
      userRole?.role !== "admin" ||
      userRole?.status !== "active"
    ) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const backstageManager =
      typeof body.backstageManager === "string"
        ? body.backstageManager.trim().toLowerCase()
        : "";

    if (!email || !backstageManager) {
      return NextResponse.json(
        {
          error:
            "Email and Backstage manager email are required.",
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    /*
      CHECK WHETHER THIS EMAIL ALREADY HAS
      A SUPABASE AUTH ACCOUNT.

      IF IT DOES, REUSE IT.
      NEVER CHANGE ITS PASSWORD.
    */

    let existingUserId: string | null = null;
    let page = 1;

    while (page <= 20) {
      const {
        data: usersPage,
        error: listUsersError,
      } = await admin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

      if (listUsersError) {
        throw listUsersError;
      }

      const existingUser = usersPage.users.find(
        (candidate) =>
          candidate.email?.trim().toLowerCase() === email
      );

      if (existingUser) {
        existingUserId = existingUser.id;
        break;
      }

      if (usersPage.users.length < 1000) {
        break;
      }

      page += 1;
    }

    /*
      SAFETY CHECK:
      DO NOT ATTACH AGENT ANALYTICS ACCESS
      TO AN EXISTING ADMIN ACCOUNT.
    */

    if (existingUserId) {
      const {
        data: existingRole,
        error: existingRoleError,
      } = await admin
        .from("user_roles")
        .select("role, status")
        .eq("user_id", existingUserId)
        .maybeSingle();

      if (existingRoleError) {
        throw existingRoleError;
      }

      if (
        existingRole?.role === "admin" &&
        existingRole?.status === "active"
      ) {
        return NextResponse.json(
          {
            error:
              "That email belongs to an active admin account. Admin accounts should not be assigned an agent analytics mapping.",
          },
          { status: 400 }
        );
      }
    }

    let targetUserId = existingUserId;
    let invited = false;

    /*
      IF NO ACCOUNT EXISTS, SEND A SUPABASE INVITE.

      IMPORTANT:
      WE DO NOT ADD A USER_ROLES 'agent' ROW HERE.
      ANALYTICS ACCESS IS NOW CONTROLLED ONLY BY
      analytics_agent_access.
    */

    if (!targetUserId) {
      const {
        data: inviteData,
        error: inviteError,
      } = await admin.auth.admin.inviteUserByEmail(email);

      if (inviteError) {
        return NextResponse.json(
          { error: inviteError.message },
          { status: 400 }
        );
      }

      targetUserId = inviteData.user?.id ?? null;
      invited = true;
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Unable to determine the user's account ID." },
        { status: 500 }
      );
    }

    /*
      CREATE / UPDATE ANALYTICS ACCESS ONLY.

      THIS DOES NOT CHANGE:
      - THEIR PASSWORD
      - THEIR BLOODLINE ARENA ROLE
      - THEIR BLOODLINE ARENA ROLE
    */

    const { error: accessError } = await admin
      .from("analytics_agent_access")
      .upsert(
        {
          user_id: targetUserId,
          backstage_manager: backstageManager,
          status: "active",
        },
        {
          onConflict: "user_id",
        }
      );

    if (accessError) {
      throw accessError;
    }

    return NextResponse.json({
      success: true,
      invited,
      reusedExistingAccount: Boolean(existingUserId),
      userId: targetUserId,
      email,
      backstageManager,
      message: invited
        ? `Invite sent to ${email}. Analytics access will be ready when they finish setting up their account.`
        : `${email} already had an account, so analytics access was added without changing their password or Bloodline Arena role.`,
    });
  } catch (error) {
    console.error("Agent invite error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to provision analytics access.",
      },
      { status: 500 }
    );
  }
}
