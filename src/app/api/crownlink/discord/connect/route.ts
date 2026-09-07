import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

const STATE_COOKIE = "crownlink_discord_oauth_state";

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.DISCORD_CLIENT_ID;

    if (!clientId) {
      return NextResponse.json(
        { error: "DISCORD_CLIENT_ID is not configured." },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/crownlink/login", request.url)
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
      return NextResponse.redirect(
        new URL("/crownlink?discord_error=invalid_creator_account", request.url)
      );
    }

    const origin = new URL(request.url).origin;
    const redirectUri =
      `${origin}/api/crownlink/discord/callback`;

    const state = crypto.randomUUID();

    const authorizeUrl = new URL(
      "https://discord.com/oauth2/authorize"
    );

    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", "identify");
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("prompt", "consent");

    const response = NextResponse.redirect(authorizeUrl);

    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: origin.startsWith("https://"),
      path: "/",
      maxAge: 60 * 10,
    });

    return response;
  } catch (error) {
    console.error("CROWN LINK DISCORD CONNECT ERROR:", error);

    return NextResponse.redirect(
      new URL(
        "/crownlink?discord_error=unexpected",
        request.url
      )
    );
  }
}
