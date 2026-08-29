import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/crownlink/login", request.url)
      );
    }

    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

    if (!clientKey || !clientSecret) {
      return NextResponse.json(
        {
          error: "TikTok client credentials are not configured.",
        },
        { status: 500 }
      );
    }

    const code = request.nextUrl.searchParams.get("code");
    const returnedState = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");
    const errorDescription =
      request.nextUrl.searchParams.get("error_description");

    if (error) {
      console.error(
        "TikTok authorization error:",
        error,
        errorDescription
      );

      return NextResponse.redirect(
        new URL(
          `/crownlink/profile/setup?tiktok_error=${encodeURIComponent(
            errorDescription || error
          )}`,
          request.url
        )
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL(
          "/crownlink/profile/setup?tiktok_error=missing_code",
          request.url
        )
      );
    }

    const storedState =
      request.cookies.get("crownlink_tiktok_state")?.value;

    if (
      !returnedState ||
      !storedState ||
      returnedState !== storedState
    ) {
      return NextResponse.redirect(
        new URL(
          "/crownlink/profile/setup?tiktok_error=invalid_state",
          request.url
        )
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://royalsbloodline.com";

    const redirectUri =
      `${siteUrl}/api/crownlink/tiktok/callback`;

    const tokenResponse = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error(
        "TikTok token exchange failed:",
        tokenData
      );

      return NextResponse.redirect(
        new URL(
          "/crownlink/profile/setup?tiktok_error=token_exchange_failed",
          request.url
        )
      );
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(
        new URL(
          "/crownlink/profile/setup?tiktok_error=missing_access_token",
          request.url
        )
      );
    }

    const profileResponse = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,username",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const profileData = await profileResponse.json();

    if (!profileResponse.ok) {
      console.error(
        "TikTok profile fetch failed:",
        profileData
      );

      return NextResponse.redirect(
        new URL(
          "/crownlink/profile/setup?tiktok_error=profile_fetch_failed",
          request.url
        )
      );
    }

    const tiktokUser = profileData?.data?.user;

    if (!tiktokUser?.open_id) {
      return NextResponse.redirect(
        new URL(
          "/crownlink/profile/setup?tiktok_error=missing_profile",
          request.url
        )
      );
    }

    if (!tiktokUser?.username) {
      console.error(
        "TikTok username missing from profile response:",
        profileData
      );

      return NextResponse.redirect(
        new URL(
          "/crownlink/profile/setup?tiktok_error=missing_username",
          request.url
        )
      );
    }

    const cleanUsername = String(tiktokUser.username)
      .trim()
      .replace(/^@/, "");

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, status, agency_id")
      .eq("user_id", user.id)
      .single();

    if (
      roleError ||
      !roleData ||
      roleData.role !== "creator" ||
      roleData.status !== "active"
    ) {
      return NextResponse.redirect(
        new URL(
          "/crownlink/profile/setup?tiktok_error=invalid_creator_account",
          request.url
        )
      );
    }

    if (!roleData.agency_id) {
      return NextResponse.redirect(
        new URL(
          "/crownlink/profile/setup?tiktok_error=missing_agency",
          request.url
        )
      );
    }

    const { data: agency, error: agencyError } = await supabase
      .from("crownlink_agencies")
      .select("name, status")
      .eq("id", roleData.agency_id)
      .single();

    if (
      agencyError ||
      !agency ||
      agency.status !== "active"
    ) {
      return NextResponse.redirect(
        new URL(
          "/crownlink/profile/setup?tiktok_error=invalid_agency",
          request.url
        )
      );
    }

    const { data: existingTikTokProfile } = await supabase
      .from("crownlink_profiles")
      .select("user_id")
      .eq("tiktok_open_id", tiktokUser.open_id)
      .neq("user_id", user.id)
      .maybeSingle();

    if (existingTikTokProfile) {
      return NextResponse.redirect(
        new URL(
          "/crownlink/profile/setup?tiktok_error=tiktok_already_connected",
          request.url
        )
      );
    }

    const { data: existingUsernameProfile } = await supabase
      .from("crownlink_profiles")
      .select("user_id")
      .eq("tiktok_username", cleanUsername)
      .neq("user_id", user.id)
      .maybeSingle();

    if (existingUsernameProfile) {
      return NextResponse.redirect(
        new URL(
          "/crownlink/profile/setup?tiktok_error=username_already_connected",
          request.url
        )
      );
    }

    const { data: existingProfile } = await supabase
      .from("crownlink_profiles")
      .select("id, diamond_level")
      .eq("user_id", user.id)
      .maybeSingle();

    const profileDataToSave = {
      user_id: user.id,
      tiktok_open_id: tiktokUser.open_id,
      tiktok_username: cleanUsername,
      display_name: tiktokUser.display_name || null,
      profile_photo_url: tiktokUser.avatar_url || null,
      tiktok_profile_url:
        `https://www.tiktok.com/@${cleanUsername}`,
      agency_name: agency.name,
      tiktok_connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingProfile) {
      const { error: updateError } = await supabase
        .from("crownlink_profiles")
        .update(profileDataToSave)
        .eq("user_id", user.id);

      if (updateError) {
        console.error(
          "TikTok profile update failed:",
          updateError
        );

        return NextResponse.redirect(
          new URL(
            "/crownlink/profile/setup?tiktok_error=profile_update_failed",
            request.url
          )
        );
      }
    } else {
      const { error: insertError } = await supabase
        .from("crownlink_profiles")
        .insert({
          ...profileDataToSave,
          diamond_level: 0,
        });

      if (insertError) {
        console.error(
          "TikTok profile creation failed:",
          insertError
        );

        return NextResponse.redirect(
          new URL(
            "/crownlink/profile/setup?tiktok_error=profile_creation_failed",
            request.url
          )
        );
      }
    }

    const response = NextResponse.redirect(
      new URL(
        "/crownlink/profile/setup?tiktok_connected=1",
        request.url
      )
    );

    response.cookies.set("crownlink_tiktok_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("TikTok callback error:", error);

    return NextResponse.redirect(
      new URL(
        "/crownlink/profile/setup?tiktok_error=unexpected",
        request.url
      )
    );
  }
}