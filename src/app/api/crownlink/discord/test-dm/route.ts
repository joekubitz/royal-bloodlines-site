import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

const TEST_DISCORD_USER_ID = "1262207450103414815";

export async function POST() {
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

    const adminSupabase = createAdminClient();

    const { data: userRole } = await adminSupabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

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

    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken) {
      return NextResponse.json(
        { error: "DISCORD_BOT_TOKEN is not configured." },
        { status: 500 }
      );
    }

    // Open a DM channel with the Discord user.
    const dmResponse = await fetch(
      "https://discord.com/api/v10/users/@me/channels",
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_id: TEST_DISCORD_USER_ID,
        }),
      }
    );

    const dmData = await dmResponse.json();

    if (!dmResponse.ok) {
      console.error("Discord DM channel error:", dmData);

      return NextResponse.json(
        {
          error: "Could not open Discord DM.",
          discord: dmData,
        },
        { status: dmResponse.status }
      );
    }

    // Send the test message.
    const messageResponse = await fetch(
      `https://discord.com/api/v10/channels/${dmData.id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content:
            "👑 **Bloodline Arena Test Notification**\n\n" +
            "Your Discord account is successfully connected to the Bloodline Arena notification system.\n\n" +
            "Future battle notifications will be sent here.",
        }),
      }
    );

    const messageData = await messageResponse.json();

    if (!messageResponse.ok) {
      console.error("Discord message error:", messageData);

      return NextResponse.json(
        {
          error: "Discord DM channel opened, but the message could not be sent.",
          discord: messageData,
        },
        { status: messageResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test Discord DM sent successfully.",
    });
  } catch (error) {
    console.error("BLOODLINE ARENA DISCORD TEST ERROR:", error);

    return NextResponse.json(
      { error: "Something went wrong sending the Discord test DM." },
      { status: 500 }
    );
  }
}