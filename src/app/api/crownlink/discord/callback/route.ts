import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

const STATE_COOKIE = "crownlink_discord_oauth_state";

type DiscordTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type DiscordUser = {
  id?: string;
  username?: string;
  global_name?: string | null;
  discriminator?: string;
  avatar?: string | null;
};

function redirectWithCookieCleared(
  request: NextRequest,
  path: string
) {
  const response = NextResponse.redirect(
    new URL(path, request.url)
  );

  response.cookies.set(STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    const discordError = url.searchParams.get("error");
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    const savedState =
      request.cookies.get(STATE_COOKIE)?.value ?? "";

    if (discordError) {
      return redirectWithCookieCleared(
        request,
        `/crownlink?discord_error=${encodeURIComponent(
          discordError === "access_denied"
            ? "access_denied"
            : "discord_authorization_failed"
        )}`
      );
    }

    if (!code) {
      return redirectWithCookieCleared(
        request,
        "/crownlink?discord_error=missing_code"
      );
    }

    if (
      !returnedState ||
      !savedState ||
      returnedState !== savedState
    ) {
      return redirectWithCookieCleared(
        request,
        "/crownlink?discord_error=invalid_state"
      );
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return redirectWithCookieCleared(
        request,
        "/crownlink?discord_error=missing_configuration"
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return redirectWithCookieCleared(
        request,
        "/crownlink/login"
      );
    }

    const adminSupabase = createAdminClient();

    const { data: roleData, error: roleError } =
      await adminSupabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", user.id)
        .maybeSingle();

    if (
      roleError ||
      !roleData ||
      roleData.role !== "creator" ||
      roleData.status !== "active"
    ) {
      return redirectWithCookieCleared(
        request,
        "/crownlink?discord_error=invalid_creator_account"
      );
    }

    const redirectUri =
      `${url.origin}/api/crownlink/discord/callback`;

    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch(
      "https://discord.com/api/v10/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: tokenBody.toString(),
        cache: "no-store",
      }
    );

    const tokenData =
      (await tokenResponse.json()) as DiscordTokenResponse;

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error(
        "CROWN LINK DISCORD TOKEN EXCHANGE ERROR:",
        tokenData
      );

      return redirectWithCookieCleared(
        request,
        "/crownlink?discord_error=token_exchange_failed"
      );
    }

    const discordUserResponse = await fetch(
      "https://discord.com/api/v10/users/@me",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        cache: "no-store",
      }
    );

    const discordUser =
      (await discordUserResponse.json()) as DiscordUser;

    if (
      !discordUserResponse.ok ||
      !discordUser.id ||
      !discordUser.username
    ) {
      console.error(
        "CROWN LINK DISCORD USER FETCH ERROR:",
        discordUser
      );

      return redirectWithCookieCleared(
        request,
        "/crownlink?discord_error=profile_fetch_failed"
      );
    }

    const { data: duplicateProfile, error: duplicateError } =
      await adminSupabase
        .from("crownlink_profiles")
        .select("user_id")
        .eq("discord_user_id", discordUser.id)
        .neq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (duplicateError) {
      console.error(
        "CROWN LINK DISCORD DUPLICATE CHECK ERROR:",
        duplicateError
      );

      return redirectWithCookieCleared(
        request,
        "/crownlink?discord_error=profile_update_failed"
      );
    }

    if (duplicateProfile) {
      return redirectWithCookieCleared(
        request,
        "/crownlink?discord_error=discord_already_connected"
      );
    }

    const discordDisplayName =
      discordUser.global_name?.trim() ||
      discordUser.username.trim();

    const {
      data: updatedProfile,
      error: updateError,
    } = await adminSupabase
      .from("crownlink_profiles")
      .update({
        discord_user_id: discordUser.id,
        discord_username: discordDisplayName,
        discord_connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select("user_id")
      .maybeSingle();

    if (updateError) {
      console.error(
        "CROWN LINK DISCORD PROFILE UPDATE ERROR:",
        updateError
      );

      return redirectWithCookieCleared(
        request,
        "/crownlink?discord_error=profile_update_failed"
      );
    }

    if (!updatedProfile) {
      return redirectWithCookieCleared(
        request,
        "/crownlink?discord_error=missing_profile"
      );
    }

    return redirectWithCookieCleared(
      request,
      "/crownlink?discord_connected=1"
    );
  } catch (error) {
    console.error("CROWN LINK DISCORD CALLBACK ERROR:", error);

    return redirectWithCookieCleared(
      request,
      "/crownlink?discord_error=unexpected"
    );
  }
}
