"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

type Audience =
  | "everyone"
  | "creators"
  | "agents"
  | "agency";

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "You are no longer signed in."
    );
  }

  const { data: roleRow, error: roleError } =
    await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

  if (
    roleError ||
    !roleRow ||
    roleRow.role !== "admin" ||
    roleRow.status !== "active"
  ) {
    throw new Error(
      "Admin access required."
    );
  }

  return user;
}

async function getRecipients({
  db,
  audience,
  agencyId,
}: {
  db: ReturnType<
    typeof createAdminClient
  >;
  audience: Audience;
  agencyId: string | null;
}) {
  if (audience === "agency") {
    if (!agencyId) {
      throw new Error(
        "An agency is required."
      );
    }

    const {
      data,
      error,
    } = await db
      .from("user_roles")
      .select(
        "user_id, role, agency_id"
      )
      .eq("status", "active")
      .eq("agency_id", agencyId);

    if (error) {
      console.error(
        "AGENCY RECIPIENT QUERY ERROR:",
        error
      );

      throw new Error(
        `Could not load agency recipients: ${error.message}`
      );
    }

    return data ?? [];
  }

  if (audience === "creators") {
    const {
      data,
      error,
    } = await db
      .from("user_roles")
      .select(
        "user_id, role, agency_id"
      )
      .eq("status", "active")
      .eq("role", "creator");

    if (error) {
      console.error(
        "CREATOR RECIPIENT QUERY ERROR:",
        error
      );

      throw new Error(
        `Could not load creator recipients: ${error.message}`
      );
    }

    return data ?? [];
  }

  if (audience === "agents") {
    const {
      data,
      error,
    } = await db
      .from("user_roles")
      .select(
        "user_id, role, agency_id"
      )
      .eq("status", "active")
      .eq("role", "agent");

    if (error) {
      console.error(
        "AGENT RECIPIENT QUERY ERROR:",
        error
      );

      throw new Error(
        `Could not load agent recipients: ${error.message}`
      );
    }

    return data ?? [];
  }

  const {
    data,
    error,
  } = await db
    .from("user_roles")
    .select(
      "user_id, role, agency_id"
    )
    .eq("status", "active");

  if (error) {
    console.error(
      "EVERYONE RECIPIENT QUERY ERROR:",
      error
    );

    throw new Error(
      `Could not load recipients: ${error.message}`
    );
  }

  return data ?? [];
}

async function sendDiscordDM({
  discordUserId,
  title,
  message,
  href,
}: {
  discordUserId: string;
  title: string;
  message: string;
  href: string;
}) {
  const token =
    process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    return {
      success: false,
      reason:
        "DISCORD_BOT_TOKEN is missing.",
    };
  }

  try {
    const channelResponse =
      await fetch(
        "https://discord.com/api/v10/users/@me/channels",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bot ${token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            recipient_id:
              discordUserId,
          }),
          cache: "no-store",
          signal:
            AbortSignal.timeout(
              10000
            ),
        }
      );

    if (!channelResponse.ok) {
      const text =
        await channelResponse.text();

      console.error(
        "DISCORD CHANNEL ERROR:",
        channelResponse.status,
        text
      );

      return {
        success: false,
        reason:
          `Discord channel request returned ${channelResponse.status}.`,
      };
    }

    const channel =
      await channelResponse.json();

    if (!channel?.id) {
      return {
        success: false,
        reason:
          "Discord did not return a DM channel.",
      };
    }

    const fullUrl =
      href.startsWith("http")
        ? href
        : `https://royalsbloodline.com${href}`;

    const content = [
      "**Royals Bloodline Announcement**",
      "",
      `**${title}**`,
      message,
      "",
      `View on Bloodline Arena: ${fullUrl}`,
    ].join("\n");

    const messageResponse =
      await fetch(
        `https://discord.com/api/v10/channels/${channel.id}/messages`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bot ${token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            content,
            allowed_mentions: {
              parse: [],
            },
          }),
          cache: "no-store",
          signal:
            AbortSignal.timeout(
              10000
            ),
        }
      );

    if (!messageResponse.ok) {
      const text =
        await messageResponse.text();

      console.error(
        "DISCORD MESSAGE ERROR:",
        messageResponse.status,
        text
      );

      return {
        success: false,
        reason:
          `Discord message returned ${messageResponse.status}.`,
      };
    }

    return {
      success: true,
      reason: null,
    };
  } catch (error) {
    console.error(
      "DISCORD ANNOUNCEMENT ERROR:",
      error
    );

    return {
      success: false,
      reason:
        error instanceof Error
          ? error.message
          : "Unknown Discord error.",
    };
  }
}

export async function createAnnouncement(
  formData: FormData
) {
  const user =
    await requireAdmin();

  const db =
    createAdminClient();

  const title = String(
    formData.get("title") || ""
  ).trim();

  const message = String(
    formData.get("message") || ""
  ).trim();

  const audience = String(
    formData.get("audience") ||
      "everyone"
  ) as Audience;

  const agencyIdRaw = String(
    formData.get("agency_id") || ""
  ).trim();

  const hrefRaw = String(
    formData.get("href") || ""
  ).trim();

  const sendNotification =
    formData.get(
      "send_notification"
    ) === "on";

  const sendDiscord =
    formData.get(
      "send_discord"
    ) === "on";

  if (
    !title ||
    title.length > 150
  ) {
    throw new Error(
      "Title must be between 1 and 150 characters."
    );
  }

  if (
    !message ||
    message.length > 5000
  ) {
    throw new Error(
      "Message must be between 1 and 5000 characters."
    );
  }

  if (
    ![
      "everyone",
      "creators",
      "agents",
      "agency",
    ].includes(audience)
  ) {
    throw new Error(
      "Invalid audience."
    );
  }

  if (
    audience === "agency" &&
    !agencyIdRaw
  ) {
    throw new Error(
      "Choose an agency."
    );
  }

  const agencyId =
    audience === "agency"
      ? agencyIdRaw
      : null;

  const href =
    hrefRaw ||
    "/bloodline-arena/notifications";

  /*
   * STEP 1:
   * Load recipients BEFORE
   * publishing the announcement.
   *
   * This prevents us from storing an
   * announcement for an audience that
   * resolves to nobody without knowing.
   */
  const recipients =
    await getRecipients({
      db,
      audience,
      agencyId,
    });

  const uniqueUserIds =
    Array.from(
      new Set(
        recipients
          .map(
            (recipient) =>
              recipient.user_id
          )
          .filter(Boolean)
      )
    );

  if (
    uniqueUserIds.length === 0
  ) {
    throw new Error(
      "No active users were found for the selected audience."
    );
  }

  /*
   * STEP 2:
   * Create announcement.
   */
  const {
    data: announcement,
    error: announcementError,
  } = await db
    .from(
      "crownlink_announcements"
    )
    .insert({
      title,
      message,
      created_by: user.id,
      audience,
      agency_id: agencyId,
      href,
      send_notification:
        sendNotification,
      send_discord:
        sendDiscord,
      status: "published",
      published_at:
        new Date().toISOString(),
    })
    .select("id")
    .single();

  if (
    announcementError ||
    !announcement
  ) {
    console.error(
      "CREATE ANNOUNCEMENT ERROR:",
      announcementError
    );

    throw new Error(
      announcementError?.message ||
        "The announcement could not be created."
    );
  }

  let websiteNotificationCount =
    0;

  let discordSentCount = 0;

  let discordSkippedCount = 0;

  let discordFailedCount = 0;

  /*
   * STEP 3:
   * Website notifications.
   */
  if (sendNotification) {
    const rows =
      uniqueUserIds.map(
        (userId) => ({
          user_id: userId,
          type: "announcement",
          title,
          message,
          href,
          is_read: false,
        })
      );

    const {
      data: insertedNotifications,
      error:
        notificationError,
    } = await db
      .from(
        "crownlink_notifications"
      )
      .insert(rows)
      .select("id");

    if (notificationError) {
      console.error(
        "ANNOUNCEMENT NOTIFICATION INSERT ERROR:",
        notificationError
      );

      throw new Error(
        `The announcement was saved, but website notifications failed: ${notificationError.message}`
      );
    }

    websiteNotificationCount =
      insertedNotifications?.length ??
      0;
  }

  /*
   * STEP 4:
   * Discord DMs.
   */
  if (sendDiscord) {
    const {
      data: profiles,
      error: profileError,
    } = await db
      .from(
        "crownlink_profiles"
      )
      .select(
        "user_id, discord_user_id"
      )
      .in(
        "user_id",
        uniqueUserIds
      );

    if (profileError) {
      console.error(
        "DISCORD PROFILE LOAD ERROR:",
        profileError
      );

      throw new Error(
        `Announcement published, but Discord profiles could not be loaded: ${profileError.message}`
      );
    }

    const discordMap =
      new Map(
        (profiles ?? []).map(
          (profile) => [
            profile.user_id,
            profile.discord_user_id,
          ]
        )
      );

    for (
      const userId
      of uniqueUserIds
    ) {
      const discordUserId =
        discordMap.get(userId);

      if (!discordUserId) {
        discordSkippedCount++;
        continue;
      }

      const result =
        await sendDiscordDM({
          discordUserId,
          title,
          message,
          href,
        });

      if (result.success) {
        discordSentCount++;
      } else {
        discordFailedCount++;

        console.error(
          `DISCORD ANNOUNCEMENT FAILED FOR USER ${userId}:`,
          result.reason
        );
      }
    }
  }

  revalidatePath(
    "/bloodline-arena/admin/announcements"
  );

  revalidatePath(
    "/bloodline-arena"
  );

  revalidatePath(
    "/bloodline-arena/notifications"
  );

  return {
    success: true,
    announcementId:
      announcement.id,

    recipientCount:
      uniqueUserIds.length,

    websiteNotificationCount,

    discordSentCount,
    discordSkippedCount,
    discordFailedCount,
  };
}