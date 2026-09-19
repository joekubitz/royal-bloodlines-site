import { NextResponse } from "next/server";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UpdateProfileBody = {
  display_name?: string;
  tiktok_username?: string;
  diamond_level?: number;
  setup?: boolean;
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
          needs_setup: true,
        },
        { status: 404 }
      );
    }

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
      needs_setup: false,

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

// MARK: - UPDATE / SET UP PROFILE

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

    const adminSupabase = createAdminClient();

    /*
     * FIRST-TIME CREATOR PROFILE SETUP
     */
    if (body.setup === true) {
      if (!userRole.agency_id) {
        return NextResponse.json(
          {
            success: false,
            error:
              "No agency has been assigned to your account.",
          },
          { status: 400 }
        );
      }

      const displayName =
        typeof body.display_name === "string"
          ? body.display_name.trim()
          : "";

      const tiktokUsername =
        typeof body.tiktok_username === "string"
          ? body.tiktok_username
              .trim()
              .replace(/^@+/, "")
          : "";

      const diamondLevel = Number(body.diamond_level);

      if (!displayName) {
        return NextResponse.json(
          {
            success: false,
            error: "Please enter a display name.",
          },
          { status: 400 }
        );
      }

      if (!tiktokUsername) {
        return NextResponse.json(
          {
            success: false,
            error: "Please enter your TikTok username.",
          },
          { status: 400 }
        );
      }

      if (
        !Number.isFinite(diamondLevel) ||
        !Number.isInteger(diamondLevel) ||
        diamondLevel < 0 ||
        diamondLevel > 1000000000
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Please enter a valid diamond level.",
          },
          { status: 400 }
        );
      }

      const { data: agency, error: agencyError } =
        await adminSupabase
          .from("crownlink_agencies")
          .select("id, name, status")
          .eq("id", userRole.agency_id)
          .maybeSingle();

      if (
        agencyError ||
        !agency ||
        agency.status !== "active"
      ) {
        console.error(
          "NATIVE PROFILE SETUP AGENCY ERROR:",
          agencyError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Your assigned agency could not be verified.",
          },
          { status: 400 }
        );
      }

      const metadataAgentUserId =
        typeof user.user_metadata
          ?.crownlink_agent_user_id === "string"
          ? user.user_metadata
              .crownlink_agent_user_id
          : null;

      const {
        data: existingProfile,
        error: existingProfileError,
      } = await adminSupabase
        .from("crownlink_profiles")
        .select("agent_user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingProfileError) {
        console.error(
          "NATIVE PROFILE SETUP LOOKUP ERROR:",
          existingProfileError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Your creator profile could not be loaded.",
          },
          { status: 500 }
        );
      }

      const agentUserId =
        existingProfile?.agent_user_id ||
        metadataAgentUserId;

      const {
        data: savedProfile,
        error: saveError,
      } = await adminSupabase
        .from("crownlink_profiles")
        .upsert(
          {
            user_id: user.id,
            display_name: displayName,
            tiktok_username: tiktokUsername,
            agency_name: agency.name,
            diamond_level: diamondLevel,
            agent_user_id: agentUserId,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        )
        .select(`
          id,
          display_name,
          tiktok_username,
          diamond_level
        `)
        .single();

      if (saveError || !savedProfile) {
        console.error(
          "NATIVE PROFILE SETUP SAVE ERROR:",
          saveError
        );

        if (
          saveError?.message
            ?.toLowerCase()
            .includes("tiktok_username")
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "That TikTok username is already being used by another Bloodline Arena account.",
            },
            { status: 409 }
          );
        }

        return NextResponse.json(
          {
            success: false,
            error:
              "We couldn't save your profile. Please try again.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Creator profile created.",
        needs_setup: false,
        profile: savedProfile,
      });
    }

    /*
     * EXISTING CREATOR:
     * UPDATE TYPICAL BATTLE DIAMONDS
     */
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
        error: "Unable to update your creator profile.",
      },
      { status: 500 }
    );
  }
}