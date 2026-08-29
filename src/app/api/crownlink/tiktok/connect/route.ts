import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/app/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL(
          "/crownlink/login",
          process.env.NEXT_PUBLIC_SITE_URL ||
            "https://royalsbloodline.com"
        )
      );
    }

    const clientKey = process.env.TIKTOK_CLIENT_KEY;

    if (!clientKey) {
      return NextResponse.json(
        { error: "Missing TIKTOK_CLIENT_KEY." },
        { status: 500 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://royalsbloodline.com";

    const redirectUri =
      `${siteUrl}/api/crownlink/tiktok/callback`;

    const state = randomBytes(32).toString("hex");

    const authUrl = new URL(
      "https://www.tiktok.com/v2/auth/authorize/"
    );

    authUrl.searchParams.set(
      "client_key",
      clientKey
    );

    authUrl.searchParams.set(
      "response_type",
      "code"
    );

    authUrl.searchParams.set(
      "scope",
      "user.info.basic,user.info.profile"
    );

    authUrl.searchParams.set(
      "redirect_uri",
      redirectUri
    );

    authUrl.searchParams.set(
      "state",
      state
    );

    const response =
      NextResponse.redirect(authUrl);

    response.cookies.set(
      "crownlink_tiktok_state",
      state,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 60,
        path: "/",
      }
    );

    return response;
  } catch (error) {
    console.error(
      "TikTok connect error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to start TikTok connection.",
      },
      { status: 500 }
    );
  }
}