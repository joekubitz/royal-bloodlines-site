import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import TicketControls from "./TicketControls";
import TicketConversation from "./TicketConversation";

export default async function SupportAdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/bloodline-arena/login");
  }

  // Check the dedicated support-admin allow-list
  const { data: supportAdmin } = await supabase
    .from("crownlink_support_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!supportAdmin) {
    redirect("/bloodline-arena");
  }

  const adminSupabase = createAdminClient();

  // Load support tickets
  const { data: tickets, error } = await adminSupabase
    .from("crownlink_support_tickets")
    .select(
      `
      id,
      user_id,
      category,
      subject,
      message,
      status,
      priority,
      admin_notes,
      created_at,
      updated_at,
      resolved_at
      `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Support ticket load error:", error);
  }

  const ticketList = tickets ?? [];

  // Load unread creator messages
  const { data: unreadMessages, error: unreadError } =
    await adminSupabase
      .from("crownlink_support_messages")
      .select("id, ticket_id")
      .eq("sender_type", "creator")
      .eq("read_by_support", false);

  if (unreadError) {
    console.error(
      "Unread support message load error:",
      unreadError
    );
  }

  const unreadMessageList = unreadMessages ?? [];

  // Count unread messages per ticket
  const unreadByTicket = new Map<string, number>();

  for (const message of unreadMessageList) {
    const current =
      unreadByTicket.get(message.ticket_id) ?? 0;

    unreadByTicket.set(
      message.ticket_id,
      current + 1
    );
  }

  const unreadReplyCount =
    unreadMessageList.length;

  const unreadTicketCount =
    unreadByTicket.size;

  // Get emails for ticket submitters
  const userIds = [
    ...new Set(
      ticketList.map(
        (ticket) => ticket.user_id
      )
    ),
  ];

  const emailMap =
    new Map<string, string>();

  if (userIds.length > 0) {
    const {
      data: { users },
    } =
      await adminSupabase.auth.admin.listUsers(
        {
          page: 1,
          perPage: 1000,
        }
      );

    for (const account of users) {
      if (userIds.includes(account.id)) {
        emailMap.set(
          account.id,
          account.email ??
            "Unknown email"
        );
      }
    }
  }

  const openCount =
    ticketList.filter(
      (ticket) =>
        ticket.status === "open"
    ).length;

  const progressCount =
    ticketList.filter(
      (ticket) =>
        ticket.status === "in_progress"
    ).length;

  const resolvedCount =
    ticketList.filter(
      (ticket) =>
        ticket.status === "resolved"
    ).length;

  return (
    <main
      style={{
        minHeight: "100vh",
        color: "#f7f1e8",
        background: `
          radial-gradient(circle at 12% 4%, rgba(88,7,12,0.40), transparent 27%),
          radial-gradient(circle at 92% 32%, rgba(116,22,0,0.08), transparent 28%),
          linear-gradient(180deg, #080808 0%, #040404 48%, #010101 100%)
        `,
        padding:
          "28px 20px 70px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {/* TOP NAV */}
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <Link
            href="/bloodline-arena/admin"
            style={backButtonStyle}
          >
            ← Admin Center
          </Link>

          <Link
            href="/bloodline-arena"
            style={secondaryButtonStyle}
          >
            Creator View
          </Link>
        </div>

        {/* HEADER */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "26px 28px",
            borderRadius: 24,
            border:
              "1px solid rgba(201,151,50,0.19)",
            background: `
              linear-gradient(
                130deg,
                rgba(48,5,9,0.90),
                rgba(14,10,10,0.95) 53%,
                rgba(3,3,3,0.98)
              )
            `,
            boxShadow:
              "0 22px 55px rgba(0,0,0,0.45)",
            marginBottom: 22,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 260,
              height: 260,
              borderRadius: "50%",
              background:
                "rgba(110,7,14,0.18)",
              filter: "blur(80px)",
              left: -100,
              top: -140,
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <p style={eyebrowStyle}>
                Bloodline Arena · Support
              </p>

              {unreadReplyCount > 0 && (
                <span
                  style={
                    headerUnreadBadgeStyle
                  }
                >
                  {unreadReplyCount} New{" "}
                  {unreadReplyCount === 1
                    ? "Reply"
                    : "Replies"}
                </span>
              )}
            </div>

            <h1
              style={{
                margin: "7px 0 0",
                color: "#f9f4ed",
                fontSize:
                  "clamp(30px,5vw,42px)",
                fontWeight: 950,
                letterSpacing: -1.4,
                lineHeight: 1,
              }}
            >
              Support Tickets
            </h1>

            <div
              style={{
                width: 58,
                height: 2,
                marginTop: 11,
                background:
                  "linear-gradient(90deg, #e86f00, #c99732, transparent)",
              }}
            />

            <p
              style={{
                margin: "10px 0 0",
                maxWidth: 650,
                color:
                  "rgba(247,241,232,0.4)",
                fontSize: 11,
                lineHeight: 1.6,
              }}
            >
              Review, manage, and
              reply to support requests
              submitted through Bloodline
              Link.
            </p>

            {unreadReplyCount > 0 && (
              <p
                style={{
                  margin:
                    "10px 0 0",
                  color: "#fca5a5",
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                {unreadTicketCount}{" "}
                {unreadTicketCount === 1
                  ? "ticket has"
                  : "tickets have"}{" "}
                unread creator{" "}
                {unreadReplyCount === 1
                  ? "reply"
                  : "replies"}.
              </p>
            )}
          </div>
        </section>

        {/* STATS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <StatCard
            label="Open"
            value={openCount}
            color="#f87171"
          />

          <StatCard
            label="In Progress"
            value={progressCount}
            color="#fb923c"
          />

          <StatCard
            label="Resolved"
            value={resolvedCount}
            color="#86efac"
          />

          <StatCard
            label="Unread Replies"
            value={unreadReplyCount}
            color={
              unreadReplyCount > 0
                ? "#fca5a5"
                : "#86efac"
            }
          />

          <StatCard
            label="Total Tickets"
            value={ticketList.length}
            color="#d9b15c"
          />
        </div>

        {/* TICKETS */}
        {ticketList.length === 0 ? (
          <section
            style={{
              padding: 32,
              borderRadius: 22,
              border:
                "1px solid rgba(201,151,50,0.12)",
              background:
                "linear-gradient(145deg, rgba(18,15,15,0.94), rgba(5,5,5,0.97))",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                margin: "0 auto",
                borderRadius: 15,
                border:
                  "1px solid rgba(201,151,50,0.17)",
                background:
                  "rgba(201,151,50,0.04)",
                color: "#c99732",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                fontSize: 20,
              }}
            >
              ✓
            </div>

            <h2
              style={{
                margin: "15px 0 0",
                color: "#f9f4ed",
                fontSize: 20,
                fontWeight: 950,
              }}
            >
              No Support Tickets
            </h2>

            <p
              style={{
                margin:
                  "7px auto 0",
                color:
                  "rgba(247,241,232,0.35)",
                fontSize: 11,
                lineHeight: 1.6,
              }}
            >
              Nothing needs your
              attention right now.
            </p>
          </section>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 13,
            }}
          >
            {ticketList.map(
              (ticket) => {
                const email =
                  emailMap.get(
                    ticket.user_id
                  ) ??
                  "Unknown user";

                const unreadCount =
                  unreadByTicket.get(
                    ticket.id
                  ) ?? 0;

                const hasUnread =
                  unreadCount > 0;

                return (
                  <article
                    key={ticket.id}
                    style={{
                      padding: 20,
                      borderRadius: 20,
                      border: hasUnread
                        ? "1px solid rgba(239,68,68,0.35)"
                        : "1px solid rgba(201,151,50,0.12)",
                      background:
                        hasUnread
                          ? "linear-gradient(145deg, rgba(48,10,12,0.92), rgba(10,5,5,0.98))"
                          : "linear-gradient(145deg, rgba(18,15,15,0.94), rgba(5,5,5,0.97))",
                      boxShadow:
                        hasUnread
                          ? "0 15px 38px rgba(120,10,15,0.16)"
                          : "0 15px 34px rgba(0,0,0,0.27)",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "flex-start",
                        gap: 16,
                        flexWrap:
                          "wrap",
                      }}
                    >
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
                            gap: 7,
                            flexWrap:
                              "wrap",
                            marginBottom:
                              10,
                            alignItems:
                              "center",
                          }}
                        >
                          {hasUnread && (
                            <span
                              style={
                                newReplyBadgeStyle
                              }
                            >
                              ● New Reply
                              {unreadCount >
                              1
                                ? ` (${unreadCount})`
                                : ""}
                            </span>
                          )}

                          <StatusBadge
                            status={
                              ticket.status
                            }
                          />

                          <PriorityBadge
                            priority={
                              ticket.priority
                            }
                          />

                          <span
                            style={
                              categoryBadgeStyle
                            }
                          >
                            {
                              ticket.category
                            }
                          </span>
                        </div>

                        <h2
                          style={{
                            margin: 0,
                            color:
                              "#f9f4ed",
                            fontSize: 18,
                            fontWeight:
                              950,
                          }}
                        >
                          {
                            ticket.subject
                          }
                        </h2>

                        <p
                          style={{
                            margin:
                              "6px 0 0",
                            color:
                              "#d9b15c",
                            fontSize: 10,
                            fontWeight:
                              800,
                          }}
                        >
                          {email}
                        </p>
                      </div>

                      <p
                        style={{
                          margin: 0,
                          color:
                            "rgba(247,241,232,0.25)",
                          fontSize: 9,
                        }}
                      >
                        {new Date(
                          ticket.created_at
                        ).toLocaleString()}
                      </p>
                    </div>

                    {/* USER MESSAGE */}
                    <div
                      style={{
                        marginTop: 16,
                        padding: 16,
                        borderRadius: 14,
                        background:
                          "rgba(0,0,0,0.28)",
                        border:
                          "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          color:
                            "rgba(247,241,232,0.68)",
                          fontSize: 12,
                          lineHeight: 1.7,
                          whiteSpace:
                            "pre-wrap",
                        }}
                      >
                        {
                          ticket.message
                        }
                      </p>
                    </div>

                    {/* CURRENT ADMIN NOTES */}
                    {ticket.admin_notes && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: 14,
                          borderRadius:
                            14,
                          border:
                            "1px solid rgba(201,151,50,0.12)",
                          background:
                            "rgba(201,151,50,0.035)",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            color:
                              "#c99732",
                            fontSize: 8,
                            fontWeight:
                              950,
                            letterSpacing:
                              1.5,
                            textTransform:
                              "uppercase",
                          }}
                        >
                          Current Admin
                          Notes
                        </p>

                        <p
                          style={{
                            margin:
                              "7px 0 0",
                            color:
                              "rgba(247,241,232,0.55)",
                            fontSize: 11,
                            lineHeight:
                              1.6,
                            whiteSpace:
                              "pre-wrap",
                          }}
                        >
                          {
                            ticket.admin_notes
                          }
                        </p>
                      </div>
                    )}

                    {/* TICKET INFO */}
                    <div
                      style={{
                        marginTop: 15,
                        paddingTop: 14,
                        borderTop:
                          "1px solid rgba(201,151,50,0.07)",
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        gap: 12,
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <span
                        style={{
                          color:
                            "rgba(247,241,232,0.18)",
                          fontSize: 8,
                          fontWeight:
                            800,
                        }}
                      >
                        Ticket{" "}
                        {ticket.id
                          .slice(0, 8)
                          .toUpperCase()}
                      </span>

                      {ticket.resolved_at && (
                        <span
                          style={{
                            color:
                              "rgba(134,239,172,0.55)",
                            fontSize:
                              8,
                            fontWeight:
                              800,
                          }}
                        >
                          Resolved{" "}
                          {new Date(
                            ticket.resolved_at
                          ).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* MANAGEMENT CONTROLS */}
                    <TicketControls
                      ticketId={
                        ticket.id
                      }
                      initialStatus={
                        ticket.status
                      }
                      initialPriority={
                        ticket.priority
                      }
                      initialAdminNotes={
                        ticket.admin_notes
                      }
                    />

                    {/* CREATOR / SUPPORT CONVERSATION */}
                    <TicketConversation
                      ticketId={
                        ticket.id
                      }
                      ticketOwnerUserId={
                        ticket.user_id
                      }
                    />
                  </article>
                );
              }
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 17,
        border:
          "1px solid rgba(201,151,50,0.11)",
        background:
          "linear-gradient(145deg, rgba(17,14,14,0.93), rgba(5,5,5,0.96))",
      }}
    >
      <p
        style={{
          margin: 0,
          color:
            "rgba(247,241,232,0.3)",
          fontSize: 8,
          fontWeight: 950,
          letterSpacing: 1.5,
          textTransform:
            "uppercase",
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: "7px 0 0",
          color,
          fontSize: 28,
          fontWeight: 950,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  let label = "Open";
  let color = "#fca5a5";
  let background =
    "rgba(239,68,68,0.08)";
  let border =
    "rgba(239,68,68,0.20)";

  if (status === "in_progress") {
    label = "In Progress";
    color = "#fdba74";
    background =
      "rgba(249,115,22,0.08)";
    border =
      "rgba(249,115,22,0.20)";
  }

  if (status === "resolved") {
    label = "Resolved";
    color = "#86efac";
    background =
      "rgba(34,197,94,0.08)";
    border =
      "rgba(34,197,94,0.20)";
  }

  return (
    <span
      style={{
        padding: "5px 8px",
        borderRadius: 999,
        border: `1px solid ${border}`,
        background,
        color,
        fontSize: 8,
        fontWeight: 950,
        textTransform:
          "uppercase",
        letterSpacing: 0.7,
      }}
    >
      {label}
    </span>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: string;
}) {
  let color = "#d9b15c";
  let background =
    "rgba(201,151,50,0.04)";
  let border =
    "rgba(201,151,50,0.14)";

  if (priority === "low") {
    color = "#93c5fd";
    background =
      "rgba(59,130,246,0.07)";
    border =
      "rgba(59,130,246,0.18)";
  }

  if (priority === "high") {
    color = "#fdba74";
    background =
      "rgba(249,115,22,0.08)";
    border =
      "rgba(249,115,22,0.20)";
  }

  if (priority === "urgent") {
    color = "#fca5a5";
    background =
      "rgba(239,68,68,0.09)";
    border =
      "rgba(239,68,68,0.23)";
  }

  const label =
    priority
      .charAt(0)
      .toUpperCase() +
    priority.slice(1);

  return (
    <span
      style={{
        padding: "5px 8px",
        borderRadius: 999,
        border: `1px solid ${border}`,
        background,
        color,
        fontSize: 8,
        fontWeight: 950,
        textTransform:
          "uppercase",
        letterSpacing: 0.7,
      }}
    >
      {label} Priority
    </span>
  );
}

const newReplyBadgeStyle = {
  padding: "5px 9px",
  borderRadius: 999,
  border:
    "1px solid rgba(239,68,68,0.32)",
  background:
    "rgba(239,68,68,0.12)",
  color: "#fca5a5",
  fontSize: 8,
  fontWeight: 950,
  textTransform:
    "uppercase" as const,
  letterSpacing: 0.7,
};

const headerUnreadBadgeStyle = {
  padding: "5px 9px",
  borderRadius: 999,
  border:
    "1px solid rgba(239,68,68,0.28)",
  background:
    "rgba(239,68,68,0.10)",
  color: "#fca5a5",
  fontSize: 8,
  fontWeight: 950,
  textTransform:
    "uppercase" as const,
  letterSpacing: 0.7,
};

const categoryBadgeStyle = {
  padding: "5px 8px",
  borderRadius: 999,
  border:
    "1px solid rgba(255,255,255,0.06)",
  background:
    "rgba(255,255,255,0.025)",
  color:
    "rgba(247,241,232,0.45)",
  fontSize: 8,
  fontWeight: 900,
  textTransform:
    "uppercase" as const,
  letterSpacing: 0.7,
};

const eyebrowStyle = {
  margin: 0,
  color: "#d9b15c",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: 2,
  textTransform:
    "uppercase" as const,
};

const backButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "8px 11px",
  borderRadius: 999,
  border:
    "1px solid rgba(201,151,50,0.22)",
  background:
    "rgba(201,151,50,0.05)",
  color: "#d9b15c",
  textDecoration: "none",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: 0.5,
  textTransform:
    "uppercase" as const,
};

const secondaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 11px",
  borderRadius: 999,
  border:
    "1px solid rgba(201,151,50,0.12)",
  background:
    "rgba(0,0,0,0.28)",
  color: "#d9b15c",
  textDecoration: "none",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: 0.5,
  textTransform:
    "uppercase" as const,
};