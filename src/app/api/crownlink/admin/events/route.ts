
import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import { sendApplePush } from "@/app/lib/apns";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// =====================================================
// SEND NEW EVENT PUSH NOTIFICATIONS
// =====================================================

async function notifyCreatorsAboutEvent(
  eventId: string,
  eventName: string
) {
  const db = createAdminClient();

  // Find all active creators.
  const { data: creators, error: creatorsError } = await db
    .from("user_roles")
    .select("user_id")
    .eq("role", "creator")
    .eq("status", "active");

  if (creatorsError) {
    console.error(
      "EVENT PUSH CREATOR LOOKUP ERROR:",
      creatorsError
    );
    return;
  }

  const creatorIds = [
    ...new Set(
      (creators ?? []).map((creator) => creator.user_id)
    ),
  ];

  if (creatorIds.length === 0) {
    console.log("EVENT PUSH: No active creators found.");
    return;
  }

  // Find enabled iOS devices belonging to creators.
  const { data: devices, error: devicesError } = await db
    .from("push_device_tokens")
    .select("user_id, token, platform")
    .eq("platform", "ios")
    .eq("enabled", true)
    .in("user_id", creatorIds);

  if (devicesError) {
    console.error(
      "EVENT PUSH DEVICE LOOKUP ERROR:",
      devicesError
    );
    return;
  }

  if (!devices || devices.length === 0) {
    console.log(
      "EVENT PUSH: No enabled creator iOS devices found."
    );
    return;
  }

  const title = "New Battle Available! ⚔️";

  const body =
    `${eventName} is now open for registration! ` +
    "Open Royals Bloodline to sign up.";

  // Deliver notifications in small batches.
  const batchSize = 10;

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < devices.length; i += batchSize) {
    const batch = devices.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map((device) =>
        sendApplePush({
          token: device.token,
          title,
          body,
          environment: "production",
        })
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        sent++;
      } else {
        failed++;

        console.error(
          "EVENT PUSH DELIVERY ERROR:",
          result.reason
        );
      }
    }
  }

  console.log("EVENT PUSH RESULTS:", {
    eventId,
    eventName,
    recipients: devices.length,
    sent,
    failed,
  });
}

// =====================================================
// CREATE EVENT
// =====================================================

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Authenticate the user.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    // Check event management permissions.
    const adminSupabase = createAdminClient();

    const { data: userRole, error: roleError } =
      await adminSupabase
        .from("user_roles")
        .select("role, status, can_manage_events")
        .eq("user_id", user.id)
        .maybeSingle();

    if (roleError) {
      console.error(
        "EVENT ROLE LOOKUP ERROR:",
        roleError
      );

      return NextResponse.json(
        { error: "Unable to verify permissions." },
        { status: 500 }
      );
    }

    const canManageEvents =
      userRole?.status === "active" &&
      (
        userRole.role === "admin" ||
        userRole.can_manage_events === true
      );

    if (!canManageEvents) {
      return NextResponse.json(
        {
          error: "Event management access required.",
        },
        { status: 403 }
      );
    }

    // =================================================
    // VALIDATE EVENT INFORMATION
    // =================================================

    const body = await request.json();

    const name = String(body.name ?? "").trim();

    const description = String(
      body.description ?? ""
    ).trim();

    const prizeInformation = String(
      body.prizeInformation ?? ""
    ).trim();

    const eventDate = String(
      body.eventDate ?? ""
    ).trim();

    const eventTime = String(
      body.eventTime ?? ""
    ).trim();

    const battleIntervalMinutes = Number(
      body.battleIntervalMinutes
    );

    if (!name) {
      return NextResponse.json(
        { error: "Event name is required." },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { error: "Event description is required." },
        { status: 400 }
      );
    }

    if (!eventDate) {
      return NextResponse.json(
        { error: "Event date is required." },
        { status: 400 }
      );
    }

    if (!eventTime) {
      return NextResponse.json(
        { error: "First battle time is required." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(battleIntervalMinutes) ||
      battleIntervalMinutes <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Battle interval must be at least 1 minute.",
        },
        { status: 400 }
      );
    }

    // =================================================
    // CREATE MAIN EVENT
    // =================================================

    const {
      data: event,
      error: createEventError,
    } = await adminSupabase
      .from("crownlink_events")
      .insert({
        name,
        description,
        prize_information: prizeInformation || null,
        event_date: eventDate,
        event_time: eventTime,
        battle_interval_minutes:
          battleIntervalMinutes,
        status: "active",
        created_by: user.id,
      })
      .select()
      .single();

    if (createEventError || !event) {
      console.error(
        "CREATE BLOODLINE ARENA EVENT ERROR:",
        createEventError
      );

      return NextResponse.json(
        {
          error:
            createEventError?.message ??
            "The event could not be created.",
        },
        { status: 500 }
      );
    }

    // =================================================
    // CREATE FIRST REQUIRED EVENT DATE
    // =================================================

    const { error: createDateError } =
      await adminSupabase
        .from("crownlink_event_dates")
        .insert({
          event_id: event.id,
          event_date: eventDate,
        });

    if (createDateError) {
      console.error(
        "CREATE BLOODLINE ARENA EVENT DATE ERROR:",
        createDateError
      );

      // Remove the incomplete event.
      const { error: cleanupError } =
        await adminSupabase
          .from("crownlink_events")
          .delete()
          .eq("id", event.id);

      if (cleanupError) {
        console.error(
          "EVENT CREATION CLEANUP ERROR:",
          cleanupError
        );
      }

      return NextResponse.json(
        {
          error:
            "The event could not be completed because its first event date could not be created.",
        },
        { status: 500 }
      );
    }

    // =================================================
    // NOTIFY CREATORS THAT REGISTRATION IS OPEN
    // =================================================

    try {
      await notifyCreatorsAboutEvent(
        event.id,
        event.name
      );
    } catch (pushError) {
      // Notification failure must not prevent
      // successful event creation.
      console.error(
        "EVENT PUSH NOTIFICATION ERROR:",
        pushError
      );
    }

    // =================================================
    // RETURN SUCCESS
    // =================================================

    return NextResponse.json({
      success: true,
      event,
    });

  } catch (error) {
    console.error(
      "CREATE BLOODLINE ARENA EVENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}
