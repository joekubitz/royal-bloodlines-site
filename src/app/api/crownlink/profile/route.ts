import { NextResponse } from "next/server";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UpdateProfileBody = {
  diamond_level?: number;
};

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization");

  // Native iOS / Android authentication
  if (authorization?.startsWith("Bearer ")) {
    const accessToken = authorization
      .slice("Bearer ".length)
      .trim();

    if (!accessToken) {
      return null;
    }

    const adminSupabase = createAdminClient();

    const {
      data: { user },
      error,
    } = await adminSupabase.auth.getUser(accessToken);

    if (error || !user) {
      return null;
    }

    return user;
  }

  // Website cookie authentication
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

async function getActiveCreator(userId: string) {
  const adminSupabase = createAdminClient();

  const { data: userRole, error } =
    await adminSupabase
      .from("user_roles")
      .select("role, status, agency_id")
      .eq("user_id", userId)
      .maybeSingle();

  if (
    error ||
    !userRole ||
    userRole.role !== "creator" ||
    userRole.status !== "active"
  ) {
    return null;
  }

  return userRole;
}

// MARK: - GET PROFILE

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated.",
        },
        { status: 401 }
      );
    }

    const userRole = await getActiveCreator(user.id);

    if (!userRole) {
      return NextResponse.json(
        {
          success: false,
          error: "Creator access required.",
        },
        { status: 403 }
      );
    }

    const adminSupabase = createAdminClient();

    // Load creator profile
    const { data: profile, error: profileError } =
      await adminSupabase
        .from("crownlink_profiles")
        .select(`
          id,
          display_name,
          tiktok_username,
          agency_name,
          diamond_level,
          profile_photo_url,
          tiktok_open_id,
          tiktok_connected_at,
          agent_user_id
        `)
        .eq("user_id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "NATIVE PROFILE LOAD ERROR:",
        profileError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to load creator profile.",
        },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: "Creator profile not found.",
        },
        { status: 404 }
      );
    }

    // Load assigned agency from role record
    let agency: {
      id: string;
      name: string;
      status: string;
    } | null = null;

    if (userRole.agency_id) {
      const { data: agencyData, error: agencyError } =
        await adminSupabase
          .from("crownlink_agencies")
          .select("id, name, status")
          .eq("id", userRole.agency_id)
          .maybeSingle();

      if (agencyError) {
        console.error(
          "NATIVE PROFILE AGENCY ERROR:",
          agencyError
        );
      } else {
        agency = agencyData;
      }
    }

    // Resolve connected agent
    let agent: {
      user_id: string;
      display_name: string | null;
    } | null = null;

    if (profile.agent_user_id) {
      const { data: agentProfile, error: agentError } =
        await adminSupabase
          .from("crownlink_profiles")
          .select("user_id, display_name")
          .eq("user_id", profile.agent_user_id)
          .maybeSingle();

      if (agentError) {
        console.error(
          "NATIVE PROFILE AGENT ERROR:",
          agentError
        );
      } else if (agentProfile) {
        agent = {
          user_id: agentProfile.user_id,
          display_name:
            agentProfile.display_name ||
            "Bloodline Arena Agent",
        };
      }
    }

    return NextResponse.json({
      success: true,

      profile: {
        id: profile.id,
        display_name: profile.display_name,
        tiktok_username: profile.tiktok_username,
        diamond_level: profile.diamond_level,
        profile_photo_url: profile.profile_photo_url,
        tiktok_connected: Boolean(
          profile.tiktok_open_id
        ),
        tiktok_connected_at:
          profile.tiktok_connected_at,
      },

      agency: agency
        ? {
            id: agency.id,
            name: agency.name,
          }
        : profile.agency_name
          ? {
              id: userRole.agency_id ?? "",
              name: profile.agency_name,
            }
          : null,

      agent,

      account: {
        email: user.email ?? null,
      },
    });
  } catch (error) {
    console.error(
      "NATIVE PROFILE API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load creator profile.",
      },
      { status: 500 }
    );
  }
}

// MARK: - UPDATE PROFILE

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated.",
        },
        { status: 401 }
      );
    }

    const userRole = await getActiveCreator(user.id);

    if (!userRole) {
      return NextResponse.json(
        {
          success: false,
          error: "Creator access required.",
        },
        { status: 403 }
      );
    }

    let body: UpdateProfileBody;

    try {
      body = (await request.json()) as UpdateProfileBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request.",
        },
        { status: 400 }
      );
    }

    const diamondLevel = Number(body.diamond_level);

    if (
      !Number.isFinite(diamondLevel) ||
      !Number.isInteger(diamondLevel) ||
      diamondLevel < 0 ||
      diamondLevel > 1000000000
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please enter a valid typical battle diamond count.",
        },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const {
      data: updatedProfile,
      error: updateError,
    } = await adminSupabase
      .from("crownlink_profiles")
      .update({
        diamond_level: diamondLevel,
      })
      .eq("user_id", user.id)
      .select("id, diamond_level")
      .maybeSingle();

    if (updateError) {
      console.error(
        "NATIVE PROFILE DIAMOND UPDATE ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Your typical battle diamonds could not be updated.",
        },
        { status: 500 }
      );
    }

    if (!updatedProfile) {
      return NextResponse.json(
        {
          success: false,
          error: "Creator profile not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Typical battle diamonds updated.",
      diamond_level: updatedProfile.diamond_level,
    });
  } catch (error) {
    console.error(
      "NATIVE PROFILE UPDATE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to update your typical battle diamonds.",
      },
      { status: 500 }
    );
  }
}
