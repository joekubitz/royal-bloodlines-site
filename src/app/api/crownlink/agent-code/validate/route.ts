import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

function normalizeCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
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

    const { data: creatorRole } = await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .single();

    if (
      !creatorRole ||
      creatorRole.role !== "creator" ||
      creatorRole.status !== "active"
    ) {
      return NextResponse.json(
        { error: "Active creator access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const code = normalizeCode(String(body.code ?? ""));

    if (!code) {
      return NextResponse.json({
        valid: true,
        agentUserId: null,
        agentDisplayName: null,
        agentAgencyName: null,
      });
    }

    const adminSupabase = createAdminClient();

    const { data: agentCode, error: codeError } =
      await adminSupabase
        .from("crownlink_agent_codes")
        .select("agent_user_id, status")
        .eq("code", code)
        .eq("status", "active")
        .maybeSingle();

    if (codeError) {
      console.error(
        "CROWN LINK AGENT CODE LOOKUP ERROR:",
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
          valid: false,
          error:
            "That agent registration code is invalid or inactive. Please check the code and try again.",
        },
        { status: 400 }
      );
    }

    const { data: agentRole, error: roleError } =
      await adminSupabase
        .from("user_roles")
        .select("role, status")
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
          valid: false,
          error:
            "That registration code is not connected to an active Crown Link agent.",
        },
        { status: 400 }
      );
    }

    const {
      data: agentProfile,
      error: agentProfileError,
    } = await adminSupabase
      .from("crownlink_profiles")
      .select("display_name, agency_name")
      .eq("user_id", agentCode.agent_user_id)
      .maybeSingle();

    if (agentProfileError) {
      console.error(
        "CROWN LINK AGENT PROFILE LOOKUP ERROR:",
        agentProfileError
      );

      return NextResponse.json(
        {
          error:
            "The connected agent profile could not be loaded.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      valid: true,
      agentUserId: agentCode.agent_user_id,
      agentDisplayName:
        agentProfile?.display_name || null,
      agentAgencyName:
        agentProfile?.agency_name || null,
    });
  } catch (error) {
    console.error(
      "CROWN LINK AGENT CODE VALIDATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while verifying the registration code.",
      },
      { status: 500 }
    );
  }
}
