import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import { getEasternToday } from "@/app/lib/crownlink/time";

type ReminderType =
  | "battle_24_hour"
  | "battle_1_hour";

type CreatorProfile = {
  user_id: string;
  display_name: string | null;
  tiktok_username: string | null;
  discord_user_id: string | null;
};

function creatorName(
  profile: CreatorProfile | undefined
) {
  return (
    profile?.display_name?.trim() ||
    (profile?.tiktok_username
      ? `@${profile.tiktok_username}`
      : "Crown Link Creator")
  );
}

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T12:00:00Z`);

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTimeEST(timeString: string) {
  const [hourString, minuteString = "00"] =
    timeString.split(":");

  const hour = Number(hourString);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minuteString} ${suffix} EST`;
}

/*
 * Convert an America/New_York local date/time
 * into a real UTC Date without adding a package.
 *
 * Crown Link stores battle date + battle time
 * separately as Eastern wall-clock values.
 */
function easternDateTimeToUtc(
  dateString: string,
  timeString: string
) {
  const [year, month, day] =
    dateString.split("-").map(Number);

  const [hour, minute = 0, second = 0] =
    timeString.split(":").map(Number);

  /*
   * Start with the same wall-clock numbers in UTC,
   * then determine what New York displays at that
   * instant and correct the difference.
   */
  const initialUtc = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      second
    )
  );

  const formatter = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }
  );

  function partsFor(date: Date) {
    const parts = formatter.formatToParts(date);

    const value = (type: string) =>
      Number(
        parts.find(
          (part) => part.type === type
        )?.value ?? 0
      );

    return {
      year: value("year"),
      month: value("month"),
      day: value("day"),
      hour: value("hour"),
      minute: value("minute"),
      second: value("second"),
    };
  }

  const displayed = partsFor(initialUtc);

  const desiredAsUtc = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second
  );

  const displayedAsUtc = Date.UTC(
    displayed.year,
    displayed.month - 1,
    displayed.day,
    displayed.hour,
    displayed.minute,
    displayed.second
  );

  const corrected = new Date(
    initialUtc.getTime() +
      (desiredAsUtc - displayedAsUtc)
  );

  /*
   * One more correction handles DST boundary
   * edge cases more safely.
   */
  const correctedDisplayed =
    partsFor(corrected);

  const correctedDisplayedAsUtc =
    Date.UTC(
      correctedDisplayed.year,
      correctedDisplayed.month - 1,
      correctedDisplayed.day,
      correctedDisplayed.hour,
      correctedDisplayed.minute,
      correctedDisplayed.second
    );

  return new Date(
    corrected.getTime() +
      (desiredAsUtc -
        correctedDisplayedAsUtc)
  );
}

async function sendDiscordDm(
  discordUserId: string,
  content: string
) {
  const botToken =
    process.env.DISCORD_BOT_TOKEN;

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

  const channelData =
    await channelResponse.json();

  if (
    !channelResponse.ok ||
    !channelData?.id
  ) {
    throw new Error(
      channelData?.message ||
        "Could not open Discord DM."
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

  const messageData =
    await messageResponse.json();

  if (!messageResponse.ok) {
    throw new Error(
      messageData?.message ||
        "Could not send Discord DM."
    );
  }
}

async function isAuthorized(
  request: NextRequest
) {
  const cronSecret =
    process.env.CRON_SECRET;

  const authorization =
    request.headers.get("authorization");

  if (
    cronSecret &&
    authorization ===
      `Bearer ${cronSecret}`
  ) {
    return true;
  }

  /*
   * Also allow an active Crown Link admin
   * to run this route manually while testing
   * on localhost.
   */
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const adminSupabase =
    createAdminClient();

  const { data: role } =
    await adminSupabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

  return Boolean(
    role &&
      role.role === "admin" &&
      role.status === "active"
  );
}

function reminderForMinutes(
  minutesUntilBattle: number
): ReminderType | null {
  /*
   * The route is intended to run every
   * 10 minutes. These windows give enough
   * tolerance for normal cron delay while
   * the notification log prevents duplicates.
   */
  if (
    minutesUntilBattle >= 1410 &&
    minutesUntilBattle <= 1470
  ) {
    return "battle_24_hour";
  }

  if (
    minutesUntilBattle >= 45 &&
    minutesUntilBattle <= 75
  ) {
    return "battle_1_hour";
  }

  return null;
}

function buildMessage({
  type,
  eventName,
  opponentName,
  battleDate,
  battleTime,
}: {
  type: ReminderType;
  eventName: string;
  opponentName: string;
  battleDate: string;
  battleTime: string;
}) {
  const heading =
    type === "battle_24_hour"
      ? "👑 **Battle Reminder — Tomorrow!**"
      : "⏰ **Battle Starts in 1 Hour!**";

  return (
    `${heading}\n\n` +
    `**Event:** ${eventName}\n` +
    `**Opponent:** ${opponentName}\n` +
    `**Date:** ${formatDate(
      battleDate
    )}\n` +
    `**Time:** ${formatTimeEST(
      battleTime
    )}\n\n` +
    `Log in to Crown Link to view your battle details.\n` +
    `https://royalsbloodline.com/crownlink`
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    const authorized =
      await isAuthorized(request);

    if (!authorized) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const adminSupabase =
      createAdminClient();

    const today =
      getEasternToday();

    const {
      data: eventDates,
      error: eventDatesError,
    } = await adminSupabase
      .from("crownlink_event_dates")
      .select(
        "id, event_id, event_date"
      )
      .gte("event_date", today)
      .order("event_date", {
        ascending: true,
      });

    if (eventDatesError) {
      throw eventDatesError;
    }

    const upcomingDateIds =
      (eventDates ?? []).map(
        (row) => row.id
      );

    if (
      upcomingDateIds.length === 0
    ) {
      return NextResponse.json({
        success: true,
        checked: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
      });
    }

    const {
      data: matches,
      error: matchesError,
    } = await adminSupabase
      .from("crownlink_matches")
      .select(`
        id,
        event_id,
        event_date_id,
        schedule_slot_id,
        creator_one_id,
        creator_two_id,
        status
      `)
      .eq("status", "approved")
      .in(
        "event_date_id",
        upcomingDateIds
      );

    if (matchesError) {
      throw matchesError;
    }

    if (!matches?.length) {
      return NextResponse.json({
        success: true,
        checked: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
      });
    }

    const eventIds = Array.from(
      new Set(
        matches.map(
          (match) => match.event_id
        )
      )
    );

    const slotIds = Array.from(
      new Set(
        matches
          .map(
            (match) =>
              match.schedule_slot_id
          )
          .filter(Boolean)
      )
    ) as string[];

    const creatorIds = Array.from(
      new Set(
        matches.flatMap((match) => [
          match.creator_one_id,
          match.creator_two_id,
        ])
      )
    );

    const [
      eventsResponse,
      slotsResponse,
      profilesResponse,
    ] = await Promise.all([
      adminSupabase
        .from("crownlink_events")
        .select("id, name")
        .in("id", eventIds),

      slotIds.length
        ? adminSupabase
            .from(
              "crownlink_schedule_slots"
            )
            .select(
              "id, slot_time"
            )
            .in("id", slotIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      adminSupabase
        .from("crownlink_profiles")
        .select(`
          user_id,
          display_name,
          tiktok_username,
          discord_user_id
        `)
        .in("user_id", creatorIds),
    ]);

    if (eventsResponse.error) {
      throw eventsResponse.error;
    }

    if (slotsResponse.error) {
      throw slotsResponse.error;
    }

    if (profilesResponse.error) {
      throw profilesResponse.error;
    }

    const eventMap = new Map(
      (eventsResponse.data ?? []).map(
        (event) => [
          event.id,
          event,
        ]
      )
    );

    const dateMap = new Map(
      (eventDates ?? []).map(
        (eventDate) => [
          eventDate.id,
          eventDate,
        ]
      )
    );

    const slotMap = new Map(
      (slotsResponse.data ?? []).map(
        (slot) => [
          slot.id,
          slot,
        ]
      )
    );

    const profileMap = new Map(
      (
        (profilesResponse.data ??
          []) as CreatorProfile[]
      ).map((profile) => [
        profile.user_id,
        profile,
      ])
    );

    const now = new Date();

    let checked = 0;
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const match of matches) {
      const eventDate =
        match.event_date_id
          ? dateMap.get(
              match.event_date_id
            )
          : null;

      const slot =
        match.schedule_slot_id
          ? slotMap.get(
              match.schedule_slot_id
            )
          : null;

      if (
        !eventDate?.event_date ||
        !slot?.slot_time
      ) {
        skipped += 2;
        continue;
      }

      const battleAt =
        easternDateTimeToUtc(
          eventDate.event_date,
          slot.slot_time
        );

      const minutesUntilBattle =
        (battleAt.getTime() -
          now.getTime()) /
        60000;

      const reminderType =
        reminderForMinutes(
          minutesUntilBattle
        );

      if (!reminderType) {
        continue;
      }

      const event =
        eventMap.get(match.event_id);

      const creatorOne =
        profileMap.get(
          match.creator_one_id
        );

      const creatorTwo =
        profileMap.get(
          match.creator_two_id
        );

      const recipients = [
        {
          profile: creatorOne,
          opponent: creatorTwo,
        },
        {
          profile: creatorTwo,
          opponent: creatorOne,
        },
      ];

      for (const recipient of recipients) {
        checked += 1;

        const userId =
          recipient.profile?.user_id;

        const discordUserId =
          recipient.profile
            ?.discord_user_id
            ?.trim();

        if (
          !userId ||
          !discordUserId
        ) {
          skipped += 1;
          continue;
        }

        /*
         * Reserve the reminder before sending.
         * The unique constraint prevents two
         * overlapping cron invocations from
         * sending the same reminder twice.
         */
        const {
          data: reservation,
          error: reservationError,
        } = await adminSupabase
          .from(
            "crownlink_discord_notifications"
          )
          .insert({
            match_id: match.id,
            user_id: userId,
            notification_type:
              reminderType,
          })
          .select("id")
          .maybeSingle();

        if (reservationError) {
          /*
           * PostgreSQL unique violation:
           * this exact reminder was already
           * reserved/sent.
           */
          if (
            reservationError.code ===
            "23505"
          ) {
            skipped += 1;
            continue;
          }

          console.error(
            "CROWN LINK REMINDER RESERVATION ERROR:",
            reservationError
          );

          failed += 1;
          continue;
        }

        if (!reservation) {
          skipped += 1;
          continue;
        }

        try {
          await sendDiscordDm(
            discordUserId,
            buildMessage({
              type: reminderType,
              eventName:
                event?.name ||
                "Crown Link Event",
              opponentName:
                creatorName(
                  recipient.opponent
                ),
              battleDate:
                eventDate.event_date,
              battleTime:
                slot.slot_time,
            })
          );

          sent += 1;
        } catch (error) {
          failed += 1;

          console.error(
            "CROWN LINK BATTLE REMINDER SEND ERROR:",
            error
          );

          /*
           * Sending failed, so release the
           * reservation and allow a later cron
           * run to retry.
           */
          await adminSupabase
            .from(
              "crownlink_discord_notifications"
            )
            .delete()
            .eq(
              "id",
              reservation.id
            );
        }
      }
    }

    console.log(
      "CROWN LINK BATTLE REMINDERS:",
      {
        checked,
        sent,
        skipped,
        failed,
      }
    );

    return NextResponse.json({
      success: true,
      checked,
      sent,
      skipped,
      failed,
    });
  } catch (error) {
    console.error(
      "CROWN LINK BATTLE REMINDER ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected reminder error.",
      },
      { status: 500 }
    );
  }
}
