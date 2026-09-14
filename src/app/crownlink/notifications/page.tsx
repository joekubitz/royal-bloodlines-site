import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

import {
  markAllNotificationsRead,
  openNotification,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(
  dateString: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(new Date(dateString));
}

function getNotificationIcon(
  type: string
) {
  switch (type) {
    case "support_reply":
      return "?";

    case "battle_assigned":
      return "⚔";

    case "battle_changed":
      return "↻";

    case "battle_cancelled":
      return "×";

    case "announcement":
      return "✦";

    case "event":
    case "new_event":
      return "◇";

    default:
      return "!";
  }
}

function getTypeLabel(
  type: string
) {
  switch (type) {
    case "support_reply":
      return "Support";

    case "battle_assigned":
      return "Battle Assigned";

    case "battle_changed":
      return "Battle Update";

    case "battle_cancelled":
      return "Battle Cancelled";

    case "announcement":
      return "Announcement";

    case "event":
    case "new_event":
      return "Event";

    default:
      return "Notification";
  }
}

export default async function NotificationsPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userRole } =
    await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

  if (
    !userRole ||
    userRole.status !== "active" ||
    ![
      "creator",
      "agent",
      "admin",
    ].includes(userRole.role)
  ) {
    redirect("/portal");
  }

  const db =
    createAdminClient();

  const {
    data: notifications,
    error,
  } = await db
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
    console.error(
      "NOTIFICATION CENTER LOAD ERROR:",
      error
    );
  }

  const notificationList =
    notifications ?? [];

  const unreadCount =
    notificationList.filter(
      (notification) =>
        !notification.is_read
    ).length;

  return (
    <main
      style={{
        minHeight: "100vh",
        color: "#f7f1e8",
        background: `
          radial-gradient(
            circle at 14% 7%,
            rgba(88,7,12,0.42),
            transparent 30%
          ),
          radial-gradient(
            circle at 88% 26%,
            rgba(116,22,0,0.10),
            transparent 30%
          ),
          linear-gradient(
            180deg,
            #080808 0%,
            #040404 46%,
            #010101 100%
          )
        `,
        padding:
          "30px 20px 70px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "flex-end",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 22,
          }}
        >
          <div>
            <Link
              href="/bloodline-arena"
              style={{
                color: "#d9b15c",
                fontSize: 10,
                fontWeight: 950,
                textDecoration: "none",
                textTransform:
                  "uppercase",
                letterSpacing: 1.5,
              }}
            >
              ← Bloodline Arena
            </Link>

            <p
              style={{
                margin:
                  "24px 0 0",
                color: "#c99732",
                fontSize: 9,
                fontWeight: 950,
                letterSpacing: 2.5,
                textTransform:
                  "uppercase",
              }}
            >
              Notification Center
            </p>

            <h1
              style={{
                margin:
                  "7px 0 0",
                fontSize:
                  "clamp(30px,5vw,44px)",
                fontWeight: 950,
                letterSpacing: -1.5,
              }}
            >
              Your Notifications
            </h1>

            <p
              style={{
                margin:
                  "8px 0 0",
                color:
                  "rgba(247,241,232,0.42)",
                fontSize: 13,
              }}
            >
              {unreadCount > 0
                ? `${unreadCount} unread ${
                    unreadCount === 1
                      ? "notification"
                      : "notifications"
                  }`
                : "You're all caught up."}
            </p>
          </div>

          {unreadCount > 0 && (
            <form
              action={
                markAllNotificationsRead
              }
            >
              <button
                type="submit"
                style={{
                  cursor: "pointer",
                  padding:
                    "11px 16px",
                  borderRadius: 999,
                  border:
                    "1px solid rgba(201,151,50,0.25)",
                  background:
                    "rgba(201,151,50,0.07)",
                  color:
                    "#d9b15c",
                  fontSize: 10,
                  fontWeight: 950,
                  textTransform:
                    "uppercase",
                }}
              >
                Mark All Read
              </button>
            </form>
          )}
        </div>

        <section
          style={{
            overflow: "hidden",
            borderRadius: 26,
            border:
              "1px solid rgba(201,151,50,0.14)",
            background:
              "linear-gradient(145deg, rgba(18,15,15,0.94), rgba(5,5,5,0.98))",
          }}
        >
          {notificationList.length ===
          0 ? (
            <div
              style={{
                padding:
                  "70px 25px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  margin:
                    "0 auto 16px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  border:
                    "1px solid rgba(201,151,50,0.22)",
                  background:
                    "rgba(201,151,50,0.06)",
                  color:
                    "#d9b15c",
                  fontSize: 20,
                }}
              >
                ✓
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                }}
              >
                No notifications
              </h2>

              <p
                style={{
                  margin:
                    "8px 0 0",
                  color:
                    "rgba(247,241,232,0.38)",
                  fontSize: 12,
                }}
              >
                Updates about
                battles, support,
                events, and agency
                announcements will
                appear here.
              </p>
            </div>
          ) : (
            notificationList.map(
              (
                notification,
                index
              ) => (
                <form
                  key={
                    notification.id
                  }
                  action={async () => {
                    "use server";

                    await openNotification(
                      notification.id,
                      notification.href
                    );
                  }}
                >
                  <button
                    type="submit"
                    style={{
                      appearance:
                        "none",
                      width: "100%",
                      textAlign:
                        "left",
                      cursor:
                        "pointer",
                      color:
                        "#f7f1e8",
                      background:
                        notification.is_read
                          ? "transparent"
                          : "linear-gradient(90deg, rgba(116,22,0,0.16), rgba(232,111,0,0.035), transparent)",
                      border: "none",
                      borderTop:
                        index === 0
                          ? "none"
                          : "1px solid rgba(255,255,255,0.055)",
                      padding:
                        "20px 22px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 15,
                        alignItems:
                          "flex-start",
                      }}
                    >
                      <div
                        style={{
                          flex:
                            "0 0 auto",
                          width: 44,
                          height: 44,
                          borderRadius:
                            14,
                          border:
                            notification.is_read
                              ? "1px solid rgba(255,255,255,0.08)"
                              : "1px solid rgba(232,111,0,0.28)",
                          background:
                            notification.is_read
                              ? "rgba(255,255,255,0.025)"
                              : "rgba(232,111,0,0.09)",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          color:
                            notification.is_read
                              ? "rgba(247,241,232,0.42)"
                              : "#e98322",
                          fontSize: 18,
                          fontWeight:
                            950,
                        }}
                      >
                        {getNotificationIcon(
                          notification.type
                        )}
                      </div>

                      <div
                        style={{
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "space-between",
                            gap: 14,
                            flexWrap:
                              "wrap",
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              color:
                                notification.is_read
                                  ? "rgba(217,177,92,0.55)"
                                  : "#d9b15c",
                              fontSize: 8,
                              fontWeight:
                                950,
                              letterSpacing:
                                1.5,
                              textTransform:
                                "uppercase",
                            }}
                          >
                            {getTypeLabel(
                              notification.type
                            )}
                            {!notification.is_read &&
                              " · New"}
                          </p>

                          <span
                            style={{
                              color:
                                "rgba(247,241,232,0.27)",
                              fontSize:
                                9,
                            }}
                          >
                            {formatDate(
                              notification.created_at
                            )}
                          </span>
                        </div>

                        <h3
                          style={{
                            margin:
                              "6px 0 0",
                            fontSize:
                              15,
                            fontWeight:
                              notification.is_read
                                ? 750
                                : 950,
                            color:
                              notification.is_read
                                ? "rgba(247,241,232,0.68)"
                                : "#f9f4ed",
                          }}
                        >
                          {
                            notification.title
                          }
                        </h3>

                        <p
                          style={{
                            margin:
                              "6px 0 0",
                            color:
                              "rgba(247,241,232,0.40)",
                            fontSize:
                              11,
                            lineHeight:
                              1.55,
                          }}
                        >
                          {
                            notification.message
                          }
                        </p>

                        <p
                          style={{
                            margin:
                              "11px 0 0",
                            color:
                              "#d9b15c",
                            fontSize:
                              9,
                            fontWeight:
                              950,
                            textTransform:
                              "uppercase",
                          }}
                        >
                          Open →
                        </p>
                      </div>

                      {!notification.is_read && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius:
                              "50%",
                            background:
                              "#e86f00",
                            boxShadow:
                              "0 0 12px rgba(232,111,0,0.55)",
                            flex:
                              "0 0 auto",
                            marginTop:
                              8,
                          }}
                        />
                      )}
                    </div>
                  </button>
                </form>
              )
            )
          )}
        </section>
      </div>
    </main>
  );
}