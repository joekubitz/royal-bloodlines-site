import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/supabase/admin";

function normalizeCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

export async function POST(request: Request) {
  const adminSupabase = createAdminClient();
  let createdUserId: string | null = null;

  try {
    const body = await request.json();

    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();

    const password = String(body.password ?? "");

    const registrationCode = normalizeCode(
      String(body.registrationCode ?? "")
    );

    if (!registrationCode) {
      return NextResponse.json(
        { error: "A registration code is required." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Your password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    /*
      Step 1:
      Validate the registration code.
    */
    const { data: agentCode, error: codeError } =
      await adminSupabase
        .from("crownlink_agent_codes")
        .select("agent_user_id, status")
        .eq("code", registrationCode)
        .eq("status", "active")
        .maybeSingle();

    if (codeError) {
      console.error(
        "CROWN LINK REGISTER CODE LOOKUP ERROR:",
        codeError
      );

      return NextResponse.json(
        {
          error:
            "The registration code could not be verified.",
        },
        { status: 500 }
      );
    }

    if (!agentCode) {
      return NextResponse.json(
        {
          error:
            "That registration code is invalid or inactive. Please check the code and try again.",
        },
        { status: 400 }
      );
    }

    /*
      Step 2:
      Verify the code belongs to an active agent.

      If the agent already has agency_id on user_roles,
      we will use it. If not, we fall back to the
      agent's Crown Link profile agency_name.
    */
    const { data: agentRole, error: roleError } =
      await adminSupabase
        .from("user_roles")
        .select("role, status, agency_id")
        .eq("user_id", agentCode.agent_user_id)
        .maybeSingle();

    if (
      roleError ||
      !agentRole ||
      agentRole.role !== "agent" ||
      agentRole.status !== "active"
    ) {
      return NextResponse.json(
        {
          error:
            "That registration code is not connected to an active Crown Link agent.",
        },
        { status: 400 }
      );
    }

    let agencyId: string | null =
      agentRole.agency_id ?? null;

    let agencyName: string | null = null;

    /*
      Step 3A:
      If the agent role already has agency_id,
      verify that agency is active.
    */
    if (agencyId) {
      const { data: agency, error: agencyError } =
        await adminSupabase
          .from("crownlink_agencies")
          .select("id, name, status")
          .eq("id", agencyId)
          .maybeSingle();

      if (
        agencyError ||
        !agency ||
        agency.status !== "active"
      ) {
        return NextResponse.json(
          {
            error:
              "The agent's assigned agency could not be verified. Please contact a Crown Link administrator.",
          },
          { status: 400 }
        );
      }

      agencyName = agency.name;
    }

    /*
      Step 3B:
      Older/current agent accounts may only have
      agency_name stored on crownlink_profiles.

      In that case, find the matching active agency
      and use its ID for the new creator.
    */
    if (!agencyId) {
      const {
        data: agentProfile,
        error: agentProfileError,
      } = await adminSupabase
        .from("crownlink_profiles")
        .select("agency_name")
        .eq("user_id", agentCode.agent_user_id)
        .maybeSingle();

      if (
        agentProfileError ||
        !agentProfile?.agency_name
      ) {
        return NextResponse.json(
          {
            error:
              "This agent does not have an agency assigned in Crown Link. Please contact an administrator.",
          },
          { status: 400 }
        );
      }

      const {
        data: matchingAgency,
        error: matchingAgencyError,
      } = await adminSupabase
        .from("crownlink_agencies")
        .select("id, name, status")
        .eq("name", agentProfile.agency_name)
        .eq("status", "active")
        .maybeSingle();

      if (
        matchingAgencyError ||
        !matchingAgency
      ) {
        console.error(
          "CROWN LINK REGISTER AGENCY LOOKUP ERROR:",
          matchingAgencyError
        );

        return NextResponse.json(
          {
            error:
              `The agent's agency "${agentProfile.agency_name}" is not connected to an active Crown Link agency. Please contact an administrator.`,
          },
          { status: 400 }
        );
      }

      agencyId = matchingAgency.id;
      agencyName = matchingAgency.name;
    }

    if (!agencyId || !agencyName) {
      return NextResponse.json(
        {
          error:
            "The creator's agency could not be determined from this registration code.",
        },
        { status: 400 }
      );
    }

    /*
      Step 4:
      Create the Supabase Auth account.

      We also save the agent and agency in user metadata
      so the relationship is available during onboarding.
    */
    const {
      data: createdUser,
      error: createUserError,
    } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        crownlink_agent_user_id:
          agentCode.agent_user_id,
        crownlink_registration_code:
          registrationCode,
        crownlink_agency_id: agencyId,
        crownlink_agency_name: agencyName,
      },
    });

    if (createUserError || !createdUser.user) {
      const message =
        createUserError?.message ||
        "The creator account could not be created.";

      return NextResponse.json(
        {
          error: message
            .toLowerCase()
            .includes("already")
            ? "An account already exists with that email address."
            : message,
        },
        { status: 400 }
      );
    }

    createdUserId = createdUser.user.id;

    /*
      Step 5:
      Create the active creator role AND assign the
      same agency as the agent tied to the code.
    */
    const { error: roleInsertError } =
      await adminSupabase
        .from("user_roles")
        .insert({
          user_id: createdUserId,
          role: "creator",
          status: "active",
          agency_id: agencyId,
        });

    if (roleInsertError) {
      await adminSupabase.auth.admin.deleteUser(
        createdUserId
      );

      return NextResponse.json(
        { error: roleInsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: createdUserId,
      agentUserId: agentCode.agent_user_id,
      agencyId,
      agencyName,
    });
  } catch (error) {
    console.error(
      "CROWN LINK CREATOR REGISTER ERROR:",
      error
    );

    if (createdUserId) {
      await adminSupabase.auth.admin.deleteUser(
        createdUserId
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while creating your Crown Link account.",
      },
      { status: 500 }
    );
  }
}
