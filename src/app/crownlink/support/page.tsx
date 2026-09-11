"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/app/supabase/client";
import CreatorTicketConversation from "./CreatorTicketConversation";

const categories = [
  "Account / Login",
  "Battle Issue",
  "Event Issue",
  "Matchmaking Issue",
  "Discord Notification",
  "Profile Issue",
  "Website Bug",
  "Other",
];

type Ticket = {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export default function CrownLinkSupportPage() {
  const supabase = createClient();

  const [category, setCategory] = useState(categories[0]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [loadingTickets, setLoadingTickets] =
    useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    setLoadingTickets(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setCurrentUserId(null);
      setTickets([]);
      setLoadingTickets(false);
      return;
    }

    setCurrentUserId(user.id);

    // Mark all unread support notifications as read
    // when the creator opens the Support page.
    const { error: notificationError } = await supabase
      .from("crownlink_notifications")
      .update({
        is_read: true,
      })
      .eq("user_id", user.id)
      .eq("type", "support_reply")
      .eq("is_read", false);

    if (notificationError) {
      console.error(
        "Could not mark support notifications as read:",
        notificationError
      );
    }

    const { data, error: ticketError } = await supabase
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
        created_at,
        updated_at,
        resolved_at
        `
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (ticketError) {
      console.error(
        "Support ticket load error:",
        ticketError
      );

      setTickets([]);
      setLoadingTickets(false);
      return;
    }

    setTickets(data ?? []);
    setLoadingTickets(false);
  }

  async function submitTicket(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSubmitting(true);
    setSuccess("");
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(
          "You must be logged in to submit a support request."
        );
        return;
      }

      if (!subject.trim()) {
        setError("Please enter a subject.");
        return;
      }

      if (!message.trim()) {
        setError(
          "Please explain what you need help with."
        );
        return;
      }

      const { error: insertError } = await supabase
        .from("crownlink_support_tickets")
        .insert({
          user_id: user.id,
          category,
          subject: subject.trim(),
          message: message.trim(),
        });

      if (insertError) {
        console.error(insertError);

        setError(
          "Your support request could not be submitted."
        );
        return;
      }

      setSubject("");
      setMessage("");
      setCategory(categories[0]);

      setSuccess(
        "Your support request was submitted successfully. You can track it below."
      );

      await loadTickets();
    } catch (err) {
      console.error(err);

      setError(
        "Something went wrong while submitting your request."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        color: "#f7f1e8",
        background: `
          radial-gradient(circle at 14% 7%, rgba(88, 7, 12, 0.42), transparent 30%),
          radial-gradient(circle at 88% 26%, rgba(116, 22, 0, 0.10), transparent 30%),
          radial-gradient(circle at 50% 100%, rgba(66, 5, 9, 0.15), transparent 38%),
          linear-gradient(180deg, #080808 0%, #040404 46%, #010101 100%)
        `,
        padding: "30px 20px 70px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <Link
            href="/bloodline-arena"
            prefetch={false}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              color: "#d9b15c",
              textDecoration: "none",
              fontSize: 10,
              fontWeight: 950,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            ← Back to Bloodline Arena
          </Link>
        </div>

        {/* HEADER */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "30px 28px",
            borderRadius: 28,
            border:
              "1px solid rgba(201,151,50,0.22)",
            background:
              "linear-gradient(135deg, rgba(45,5,9,0.94), rgba(12,10,10,0.96) 50%, rgba(3,3,3,0.98))",
            boxShadow:
              "0 30px 70px rgba(0,0,0,0.58), 0 0 55px rgba(88,7,12,0.12)",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 260,
              height: 260,
              borderRadius: "50%",
              right: -80,
              top: -130,
              background:
                "rgba(232,111,0,0.08)",
              filter: "blur(70px)",
            }}
          />

          <div style={{ position: "relative" }}>
            <p style={eyebrowStyle}>
              Royals Bloodline
            </p>

            <h1
              style={{
                margin: "8px 0 0",
                fontSize: "clamp(32px,5vw,48px)",
                lineHeight: 1,
                fontWeight: 950,
                letterSpacing: -2,
                color: "#f9f4ed",
              }}
            >
              Support
            </h1>

            <p
              style={{
                margin: "12px 0 0",
                color:
                  "rgba(247,241,232,0.48)",
                maxWidth: 620,
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              Submit a support request, track its
              status, and chat directly with the
              support team.
            </p>
          </div>
        </section>

        {/* NEW REQUEST */}
        <section
          style={{
            padding: 28,
            borderRadius: 26,
            border:
              "1px solid rgba(201,151,50,0.14)",
            background:
              "linear-gradient(145deg, rgba(18,15,15,0.94), rgba(5,5,5,0.97))",
            boxShadow:
              "0 24px 55px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <p style={eyebrowStyle}>
              Help Center
            </p>

            <h2
              style={{
                margin: "7px 0 0",
                color: "#f9f4ed",
                fontSize: 25,
                fontWeight: 950,
                letterSpacing: -0.7,
              }}
            >
              Submit a Support Request
            </h2>

            <p
              style={{
                margin: "8px 0 0",
                color:
                  "rgba(247,241,232,0.4)",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              Your account information is
              automatically attached to your
              request.
            </p>
          </div>

          {success && (
            <div
              style={{
                marginBottom: 20,
                padding: "15px 17px",
                borderRadius: 16,
                border:
                  "1px solid rgba(34,197,94,0.22)",
                background:
                  "rgba(34,197,94,0.08)",
                color: "#86efac",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              {success}
            </div>
          )}

          {error && (
            <div
              style={{
                marginBottom: 20,
                padding: "15px 17px",
                borderRadius: 16,
                border:
                  "1px solid rgba(239,68,68,0.25)",
                background:
                  "rgba(239,68,68,0.08)",
                color: "#fca5a5",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={submitTicket}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
              }}
            >
              <FormField label="Issue Type">
                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
                  style={inputStyle}
                >
                  {categories.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Subject">
                <input
                  type="text"
                  value={subject}
                  onChange={(event) =>
                    setSubject(event.target.value)
                  }
                  placeholder="Short description of the issue"
                  maxLength={120}
                  style={inputStyle}
                />
              </FormField>
            </div>

            <div style={{ marginTop: 16 }}>
              <FormField label="What happened?">
                <textarea
                  value={message}
                  onChange={(event) =>
                    setMessage(event.target.value)
                  }
                  placeholder="Explain the issue, what you were trying to do, and what happened instead..."
                  rows={8}
                  maxLength={4000}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    minHeight: 180,
                    lineHeight: 1.6,
                  }}
                />
              </FormField>
            </div>

            <div
              style={{
                marginTop: 22,
                paddingTop: 20,
                borderTop:
                  "1px solid rgba(201,151,50,0.09)",
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color:
                    "rgba(247,241,232,0.28)",
                  fontSize: 10,
                  lineHeight: 1.6,
                  maxWidth: 470,
                }}
              >
                Please do not submit passwords or
                other sensitive information.
              </p>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "12px 18px",
                  borderRadius: 999,
                  border:
                    "1px solid rgba(232,111,0,0.4)",
                  background: submitting
                    ? "rgba(232,111,0,0.08)"
                    : "linear-gradient(180deg, rgba(232,111,0,0.18), rgba(76,18,0,0.26))",
                  color: submitting
                    ? "#9f7655"
                    : "#e98322",
                  fontSize: 10,
                  fontWeight: 950,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  cursor: submitting
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Request"}
              </button>
            </div>
          </form>
        </section>

        {/* MY TICKETS */}
        <section style={{ marginTop: 30 }}>
          <p style={eyebrowStyle}>
            Your Requests
          </p>

          <h2
            style={{
              margin: "7px 0 0",
              color: "#f9f4ed",
              fontSize: 25,
              fontWeight: 950,
            }}
          >
            My Support Requests
          </h2>

          <p
            style={{
              margin: "8px 0 18px",
              color:
                "rgba(247,241,232,0.4)",
              fontSize: 11,
              lineHeight: 1.6,
            }}
          >
            Track your open requests and reply to
            support.
          </p>

          {loadingTickets ? (
            <TicketEmpty text="Loading your support requests..." />
          ) : tickets.length === 0 ? (
            <TicketEmpty text="You haven't submitted any support requests yet." />
          ) : (
            <div
              style={{
                display: "grid",
                gap: 14,
              }}
            >
              {tickets.map((ticket) => (
                <article
                  key={ticket.id}
                  id={`ticket-${ticket.id}`}
                  style={{
                    padding: 20,
                    borderRadius: 20,
                    border:
                      "1px solid rgba(201,151,50,0.12)",
                    background:
                      "linear-gradient(145deg, rgba(18,15,15,0.94), rgba(5,5,5,0.97))",
                    boxShadow:
                      "0 15px 34px rgba(0,0,0,0.27)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      gap: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          gap: 7,
                          flexWrap: "wrap",
                          marginBottom: 10,
                        }}
                      >
                        <StatusBadge
                          status={ticket.status}
                        />

                        <span
                          style={categoryBadgeStyle}
                        >
                          {ticket.category}
                        </span>
                      </div>

                      <h3
                        style={{
                          margin: 0,
                          color: "#f9f4ed",
                          fontSize: 17,
                          fontWeight: 950,
                        }}
                      >
                        {ticket.subject}
                      </h3>
                    </div>

                    <span
                      style={{
                        color:
                          "rgba(247,241,232,0.24)",
                        fontSize: 8,
                      }}
                    >
                      {new Date(
                        ticket.created_at
                      ).toLocaleString()}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      padding: 14,
                      borderRadius: 14,
                      background:
                        "rgba(0,0,0,0.25)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color:
                          "rgba(247,241,232,0.6)",
                        fontSize: 11,
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {ticket.message}
                    </p>
                  </div>

                  <CreatorTicketConversation
                    ticketId={ticket.id}
                    ticketOwnerUserId={
                      currentUserId ??
                      ticket.user_id
                    }
                  />
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          marginBottom: 8,
          color: "#d9b15c",
          fontSize: 9,
          fontWeight: 950,
          letterSpacing: 1.5,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>

      {children}
    </label>
  );
}

function TicketEmpty({
  text,
}: {
  text: string;
}) {
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 18,
        border:
          "1px solid rgba(201,151,50,0.1)",
        background:
          "rgba(0,0,0,0.2)",
        color:
          "rgba(247,241,232,0.35)",
        fontSize: 11,
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: Ticket["status"];
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
        letterSpacing: 0.7,
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "#c99732",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: 2.5,
  textTransform: "uppercase" as const,
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
  textTransform: "uppercase" as const,
  letterSpacing: 0.7,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  borderRadius: 14,
  border:
    "1px solid rgba(201,151,50,0.15)",
  background:
    "rgba(0,0,0,0.32)",
  color: "#f9f4ed",
  padding: "13px 14px",
  outline: "none",
  fontSize: 13,
};