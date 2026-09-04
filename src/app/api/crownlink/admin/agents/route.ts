import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

function normalizeCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

function normalizeTikTokUsername(value: string) {
  return value.trim().replace(/^@+/, "");
}

function generateTemporaryPassword() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `CrownLink${randomPart}!A9`;
}

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
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();

    const displayName = String(body.displayName ?? "").trim();

    const tiktokUsername = normalizeTikTokUsername(
      String(body.tiktokUsername ?? "")
    );

    const agencyName = String(body.agencyName ?? "").trim();

    const registrationCode = normalizeCode(
      String(body.registrationCode ?? "")
    );

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    if (!displayName) {
      return NextResponse.json(
        { error: "Display name is required." },
        { status: 400 }
      );
    }

    if (!tiktokUsername) {
      return NextResponse.json(
        { error: "TikTok username is required." },
        { status: 400 }
      );
    }

    if (!agencyName) {
      return NextResponse.json(
        { error: "Agency name is required." },
        { status: 400 }
      );
    }

    if (!registrationCode) {
      return NextResponse.json(
        { error: "Registration code is required." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: existingCode, error: existingCodeError } =
      await adminSupabase
        .from("crownlink_agent_codes")
        .select("id")
        .eq("code", registrationCode)
        .maybeSingle();

    if (existingCodeError) {
      return NextResponse.json(
        { error: existingCodeError.message },
        { status: 400 }
      );
    }

    if (existingCode) {
      return NextResponse.json(
        { error: "That registration code is already in use." },
        { status: 409 }
      );
    }

    /*
      Make sure the agent's agency exists in Crown Link.

      If an active agency with the same name already exists, reuse it.
      If not, create it automatically so the admin does not have to
      maintain a separate agency list by hand.
    */
    let agencyId: string | null = null;

    const {
      data: existingAgency,
      error: existingAgencyError,
    } = await adminSupabase
      .from("crownlink_agencies")
      .select("id, name, status")
      .ilike("name", agencyName)
      .maybeSingle();

    if (existingAgencyError) {
      return NextResponse.json(
        { error: existingAgencyError.message },
        { status: 400 }
      );
    }

    if (existingAgency) {
      if (existingAgency.status !== "active") {
        const { data: reactivatedAgency, error: reactivateError } =
          await adminSupabase
            .from("crownlink_agencies")
            .update({
              status: "active",
            })
            .eq("id", existingAgency.id)
            .select("id")
            .single();

        if (reactivateError || !reactivatedAgency) {
          return NextResponse.json(
            {
              error:
                reactivateError?.message ||
                "The agent's agency could not be reactivated.",
            },
            { status: 400 }
          );
        }

        agencyId = reactivatedAgency.id;
      } else {
        agencyId = existingAgency.id;
      }
    } else {
      const { data: createdAgency, error: createAgencyError } =
        await adminSupabase
          .from("crownlink_agencies")
          .insert({
            name: agencyName,
            status: "active",
          })
          .select("id")
          .single();

      if (createAgencyError || !createdAgency) {
        return NextResponse.json(
          {
            error:
              createAgencyError?.message ||
              "The agent's agency could not be created.",
          },
          { status: 400 }
        );
      }

      agencyId = createdAgency.id;
    }

    const temporaryPassword = generateTemporaryPassword();

    const { data: createdUserData, error: createUserError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
        },
      });

    if (createUserError || !createdUserData.user) {
      return NextResponse.json(
        {
          error:
            createUserError?.message ||
            "Agent account could not be created.",
        },
        { status: 400 }
      );
    }

    const agentUserId = createdUserData.user.id;

    async function rollbackCreatedUser() {
      await adminSupabase.auth.admin.deleteUser(agentUserId);
    }

    const { error: roleError } = await adminSupabase
      .from("user_roles")
      .upsert(
        {
          user_id: agentUserId,
          role: "agent",
          status: "active",
          agency_id: agencyId,
        },
        {
          onConflict: "user_id",
        }
      );

    if (roleError) {
      await rollbackCreatedUser();

      return NextResponse.json(
        { error: roleError.message },
        { status: 400 }
      );
    }

    const { error: profileError } = await adminSupabase
      .from("crownlink_profiles")
      .upsert(
        {
          user_id: agentUserId,
          tiktok_username: tiktokUsername,
          display_name: displayName,
          agency_name: agencyName,
          diamond_level: 0,
          profile_status: "active",
        },
        {
          onConflict: "user_id",
        }
      );

    if (profileError) {
      await adminSupabase
        .from("user_roles")
        .delete()
        .eq("user_id", agentUserId);

      await rollbackCreatedUser();

      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }

    const { error: codeError } = await adminSupabase
      .from("crownlink_agent_codes")
      .insert({
        agent_user_id: agentUserId,
        code: registrationCode,
        status: "active",
      });

    if (codeError) {
      await adminSupabase
        .from("crownlink_profiles")
        .delete()
        .eq("user_id", agentUserId);

      await adminSupabase
        .from("user_roles")
        .delete()
        .eq("user_id", agentUserId);

      await rollbackCreatedUser();

      return NextResponse.json(
        { error: codeError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      agent: {
        userId: agentUserId,
        email,
        displayName,
        tiktokUsername,
        agencyId,
        agencyName,
        registrationCode,
      },
      temporaryPassword,
      message:
        "Agent created successfully. Share the temporary password with the agent so they can sign in.",
    });
  } catch (error) {
    console.error("Create Crown Link agent error:", error);

    return NextResponse.json(
      { error: "Something went wrong while creating the agent." },
      { status: 500 }
    );
  }
}
