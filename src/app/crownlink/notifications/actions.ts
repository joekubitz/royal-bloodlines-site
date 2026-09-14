"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You are no longer signed in.");
  }

  return user;
}

export async function markNotificationRead(
  notificationId: string
) {
  const user = await getCurrentUser();

  if (
    !notificationId ||
    !/^[0-9a-f-]{36}$/i.test(notificationId)
  ) {
    throw new Error("Invalid notification.");
  }

  const db = createAdminClient();

  const { error } = await db
    .from("crownlink_notifications")
    .update({
      is_read: true,
    })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    console.error(
      "MARK NOTIFICATION READ ERROR:",
      error
    );

    throw new Error(
      "The notification could not be updated."
    );
  }

  revalidatePath("/bloodline-arena");
  revalidatePath(
    "/bloodline-arena/notifications"
  );
}

export async function openNotification(
  notificationId: string,
  href: string | null
) {
  await markNotificationRead(
    notificationId
  );

  redirect(
    href || "/bloodline-arena/notifications"
  );
}

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();

  const db = createAdminClient();

  const { error } = await db
    .from("crownlink_notifications")
    .update({
      is_read: true,
    })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error(
      "MARK ALL NOTIFICATIONS READ ERROR:",
      error
    );

    throw new Error(
      "Your notifications could not be updated."
    );
  }

  revalidatePath("/bloodline-arena");
  revalidatePath(
    "/bloodline-arena/notifications"
  );
}