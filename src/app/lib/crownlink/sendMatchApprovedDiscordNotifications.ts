import { createAdminClient } from "@/app/supabase/admin";

type DiscordNotificationResult = {
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
};

type DiscordProfile = {
  user_id: string;
  display_name: string | null;
  tiktok_username: string | null;
  discord_user_id: string | null;
};

function creatorName(profile: DiscordProfile | undefined) {
  return (
    profile?.display_name?.trim() ||
    (profile?.tiktok_username
      ? `@${profile.tiktok_username}`
      : "Bloodline Arena Creator")
  );
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) {
    return "Date to be announced";
  }

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeString: string | null | undefined) {
  if (!timeString) {
    return "Time to be announced";
  }

  const [hourString, minuteString = "00"] =
    timeString.split(":");

  const parsedHour = Number(hourString);

  if (!Number.isFinite(parsedHour)) {
    return timeString;
  }

  const suffix = parsedHour >= 12 ? "PM" : "AM";
  const hour = parsedHour % 12 || 12;

  return `${hour}:${minuteString} ${suffix} EST`;
}

async function sendDiscordDm(
  discordUserId: string,
  content: string
) {
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!botToken) {
    throw new Error(
      "DISCORD_BOT_TOKEN is not configured."
    );
  }

  const channelResponse = await fetch(
    "https://discord.com/api/v10/users/@me/channels",
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient_id: discordUserId,
      }),
      cache: "no-store",
    }
  );

  const channelData = await channelResponse.json();

  if (!channelResponse.ok || !channelData?.id) {
    throw new Error(
      `Could not open Discord DM: ${
        channelData?.message ||
        channelResponse.statusText
      }`
    );
  }

  const messageResponse = await fetch(
    `https://discord.com/api/v10/channels/${channelData.id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
      }),
      cache: "no-store",
    }
  );

  const messageData = await messageResponse.json();

  if (!messageResponse.ok) {
    throw new Error(
      `Could not send Discord DM: ${
        messageData?.message ||
        messageResponse.statusText
      }`
    );
  }
}

export async function sendMatchApprovedDiscordNotifications(
  matchId: string
): Promise<DiscordNotificationResult> {
  const result: DiscordNotificationResult = {
    attempted: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    const adminSupabase = createAdminClient();

    const { data: match, error: matchError } =
      await adminSupabase
        .from("crownlink_matches")
        .select(`
          id,
          event_id,
          creator_one_id,
          creator_two_id,
          status,
          event_date_id,
          schedule_slot_id
        `)
        .eq("id", matchId)
        .maybeSingle();

    if (matchError || !match) {
      console.error(
        "DISCORD MATCH NOTIFICATION MATCH LOAD ERROR:",
        matchError
      );
      return result;
    }

    if (match.status !== "approved") {
      return result;
    }

    const [
      eventResponse,
      profilesResponse,
      eventDateResponse,
      slotResponse,
    ] = await Promise.all([
      adminSupabase
        .from("crownlink_events")
        .select(
          "id, name, event_date, event_time"
        )
        .eq("id", match.event_id)
        .maybeSingle(),

      adminSupabase
        .from("crownlink_profiles")
        .select(`
          user_id,
          display_name,
          tiktok_username,
          discord_user_id
        `)
        .in("user_id", [
          match.creator_one_id,
          match.creator_two_id,
        ]),

      match.event_date_id
        ? adminSupabase
            .from("crownlink_event_dates")
            .select("id, event_date")
            .eq("id", match.event_date_id)
            .maybeSingle()
        : Promise.resolve({
            data: null,
            error: null,
          }),

      match.schedule_slot_id
        ? adminSupabase
            .from("crownlink_schedule_slots")
            .select("id, slot_time")
            .eq("id", match.schedule_slot_id)
            .maybeSingle()
        : Promise.resolve({
            data: null,
            error: null,
          }),
    ]);

    if (eventResponse.error) {
      console.error(
        "DISCORD MATCH NOTIFICATION EVENT LOAD ERROR:",
        eventResponse.error
      );
    }

    if (profilesResponse.error) {
      console.error(
        "DISCORD MATCH NOTIFICATION PROFILE LOAD ERROR:",
        profilesResponse.error
      );
      return result;
    }

    const event = eventResponse.data;
    const eventDate = eventDateResponse.data;
    const slot = slotResponse.data;

    const profiles =
      (profilesResponse.data ??
        []) as DiscordProfile[];

    const profileMap = new Map(
      profiles.map((profile) => [
        profile.user_id,
        profile,
      ])
    );

    const creatorOne = profileMap.get(
      match.creator_one_id
    );

    const creatorTwo = profileMap.get(
      match.creator_two_id
    );

    const battleDate =
      eventDate?.event_date ||
      event?.event_date ||
      null;

    const battleTime =
      slot?.slot_time ||
      event?.event_time ||
      null;

    const eventName =
      event?.name?.trim() || "Bloodline Arena Event";

    const notifications = [
      {
        profile: creatorOne,
        opponent: creatorTwo,
      },
      {
        profile: creatorTwo,
        opponent: creatorOne,
      },
    ];

    for (const notification of notifications) {
      result.attempted += 1;

      const discordUserId =
        notification.profile?.discord_user_id?.trim();

      if (!discordUserId) {
        result.skipped += 1;
        continue;
      }

      const content =
        `👑 **You've Been Matched!**\n\n` +
        `**Event:** ${eventName}\n` +
        `**Opponent:** ${creatorName(
          notification.opponent
        )}\n` +
        `**Date:** ${formatDate(battleDate)}\n` +
        `**Time:** ${formatTime(battleTime)}\n\n` +
        `Log in to Bloodline Arena to view your battle details.\n` +
        `https://royalsbloodline.com/bloodline-arena`;

      try {
        await sendDiscordDm(
          discordUserId,
          content
        );
        result.sent += 1;
      } catch (error) {
        result.failed += 1;

        console.error(
          `DISCORD MATCH NOTIFICATION SEND ERROR (${notification.profile?.user_id}):`,
          error
        );
      }
    }

    return result;
  } catch (error) {
    console.error(
      "DISCORD MATCH NOTIFICATION ERROR:",
      error
    );

    return result;
  }
}
