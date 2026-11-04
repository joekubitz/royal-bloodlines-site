
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import { sendApplePush } from "@/app/lib/apns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Authenticate using the website session.
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const db = createAdminClient();

    // Only administrators may use this test endpoint.
    const { data: role, error: roleError } = await db
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      roleError ||
      role?.role !== "admin" ||
      role.status !== "active"
    ) {
      return NextResponse.json(
        { success: false, error: "Forbidden." },
        { status: 403 }
      );
    }

    // Find only the signed-in admin's iOS devices.
    const { data: devices, error: deviceError } = await db
      .from("push_device_tokens")
      .select("token")
      .eq("user_id", user.id)
      .eq("platform", "ios")
      .eq("enabled", true);

    if (deviceError) {
      throw deviceError;
    }

    if (!devices?.length) {
      return NextResponse.json(
        {
          success: false,
          error: "No enabled iOS devices found for this account.",
        },
        { status: 404 }
      );
    }

    // For now, target the first registered iOS device.
    // The iPhone installed through Xcode uses sandbox APNs.
    const result = await sendApplePush({
      token: devices[0].token,
      title: "Royals Bloodline 🔔",
      body: "Your first iPhone push notification test!",
      environment: "sandbox",
    });

    return NextResponse.json({
      success: true,
      message: "APNs accepted the test notification.",
      apnsId: result.apnsId,
    });
  } catch (error) {
    console.error("TEST PUSH ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to send test notification. Check server logs.",
      },
      { status: 500 }
    );
  }
}
