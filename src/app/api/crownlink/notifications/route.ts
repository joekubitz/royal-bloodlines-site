import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type NotificationActionBody = {
  action?: "mark_read" | "mark_all_read";
  notification_id?: string;
};

async function getAuthenticatedUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  // Native app authentication
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice(7).trim();

    if (!token) {
      return null;
    }

    const db = createAdminClient();

    const {
      data: { user },
      error,
    } = await db.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return user;
  }

  // Website cookie authentication
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}

async function checkUserAccess(userId: string) {
  const db = createAdminClient();

  const { data: userRole, error } = await db
    .from("user_roles")
    .select("role, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !userRole) {
    return false;
  }

  return (
    userRole.status === "active" &&
    ["creator", "agent", "admin"].includes(userRole.role)
  );
}

// MARK: - GET NOTIFICATIONS

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const hasAccess = await checkUserAccess(user.id);

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "You do not have access to notifications.",
        },
        { status: 403 }
      );
    }

    const db = createAdminClient();

    const { data: notifications, error } = await db
      .from("crownlink_notifications")
      .select(`
        id,
        type,
        title,
        message,
        href,
        is_read,
        created_at
      `)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (error) {
      console.error("NATIVE NOTIFICATIONS LOAD ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Notifications could not be loaded.",
        },
        { status: 500 }
      );
    }

    const notificationList = notifications ?? [];

    const unreadCount = notificationList.filter(
      (notification) => !notification.is_read
    ).length;

    return NextResponse.json({
      success: true,
      unread_count: unreadCount,
      notifications: notificationList,
    });
  } catch (error) {
    console.error("NATIVE NOTIFICATIONS GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Something went wrong loading notifications.",
      },
      { status: 500 }
    );
  }
}

// MARK: - UPDATE NOTIFICATIONS

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const hasAccess = await checkUserAccess(user.id);

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "You do not have access to notifications.",
        },
        { status: 403 }
      );
    }

    const body =
      (await request.json()) as NotificationActionBody;

    const db = createAdminClient();

    // MARK ONE NOTIFICATION READ

    if (body.action === "mark_read") {
      const notificationId = body.notification_id?.trim();

      if (
        !notificationId ||
        !/^[0-9a-f-]{36}$/i.test(notificationId)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid notification.",
          },
          { status: 400 }
        );
      }

      const { error } = await db
        .from("crownlink_notifications")
        .update({
          is_read: true,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (error) {
        console.error(
          "NATIVE MARK NOTIFICATION READ ERROR:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            error: "The notification could not be updated.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
      });
    }

    // MARK ALL NOTIFICATIONS READ

    if (body.action === "mark_all_read") {
      const { error } = await db
        .from("crownlink_notifications")
        .update({
          is_read: true,
        })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error(
          "NATIVE MARK ALL NOTIFICATIONS READ ERROR:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            error: "Your notifications could not be updated.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid notification action.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("NATIVE NOTIFICATIONS POST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Something went wrong updating notifications.",
      },
      { status: 500 }
    );
  }
}
