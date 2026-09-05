import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export default async function CrownLinkMatchmakingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/crownlink/login");
  }

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role, status")
    .eq("user_id", user.id)
    .single();

  if (
    !userRole ||
    userRole.status !== "active" ||
    !["creator", "admin", "agent"].includes(userRole.role)
  ) {
    redirect("/crownlink/login");
  }

  const adminSupabase = createAdminClient();

  const today = new Date().toISOString().split("T")[0];

  const { data: events } = await adminSupabase
    .from("crownlink_events")
    .select(`
      id,
      name,
      event_date,
      event_time,
      status
    `)
    .eq("status", "active")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });

  const { data: signups } = await adminSupabase
    .from("crownlink_event_signups")
    .select(`
      event_id,
      status
    `)
    .eq("user_id", user.id);

  const { data: matches } = await adminSupabase
    .from("crownlink_matches")
    .select(`
      id,
      event_id,
      creator_one_id,
      creator_two_id,
      status
    `)
    .or(
      `creator_one_id.eq.${user.id},creator_two_id.eq.${user.id}`
    )
    .in("status", ["suggested", "approved"]);

  function formatDate(dateString: string) {
    const date = new Date(`${dateString}T12:00:00`);

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(timeString: string) {
    const [hourString, minuteString] = timeString.split(":");

    let hour = Number(hourString);
    const minute = minuteString || "00";

    const suffix = hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;

    return `${hour}:${minute} ${suffix}`;
  }

  function getStatus(eventId: string) {
    const signup = signups?.find(
      (item) =>
        item.event_id === eventId &&
        item.status === "signed_up"
    );

    const match = matches?.find(
      (item) => item.event_id === eventId
    );

    if (match?.status === "approved") {
      return {
        type: "matched",
        label: "Matched",
        description:
          "Your matchup has been approved and is available in My Battles.",
        color: "#d9b15c",
        background: "rgba(201,151,50,0.07)",
        border: "rgba(201,151,50,0.24)",
      };
    }

    if (match?.status === "suggested") {
      return {
        type: "review",
        label: "Match Awaiting Approval",
        description:
          "Crown Link found a potential matchup. An admin is reviewing it now.",
        color: "#e98322",
        background: "rgba(232,111,0,0.07)",
        border: "rgba(232,111,0,0.22)",
      };
    }

    if (signup) {
      return {
        type: "waiting",
        label: "Waiting for Match",
        description:
          "You are signed up and waiting for Crown Link matchmaking.",
        color: "#d9b15c",
        background: "rgba(201,151,50,0.055)",
        border: "rgba(201,151,50,0.18)",
      };
    }

    return {
      type: "none",
      label: "Not Signed Up",
      description:
        "Sign up for this event before matchmaking begins.",
      color: "rgba(247,241,232,0.45)",
      background: "rgba(255,255,255,0.025)",
      border: "rgba(255,255,255,0.07)",
    };
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        color: "#f7f1e8",
        background: `
          radial-gradient(circle at 14% 7%, rgba(88,7,12,0.42), transparent 30%),
          radial-gradient(circle at 88% 26%, rgba(116,22,0,0.10), transparent 30%),
          radial-gradient(circle at 50% 100%, rgba(66,5,9,0.15), transparent 38%),
          linear-gradient(180deg, #080808 0%, #040404 46%, #010101 100%)
        `,
        padding: "28px 20px 70px",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        {/* BACK */}
        <div style={{ marginBottom: 16 }}>
          <Link href="/crownlink" style={backButtonStyle}>
            <span style={{ fontSize: 15 }}>←</span>
            Back to Crown Link
          </Link>
        </div>

        {/* HEADER */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "24px 26px",
            borderRadius: 24,
            border: "1px solid rgba(201,151,50,0.2)",
            background: `
              linear-gradient(
                130deg,
                rgba(45,5,9,0.90),
                rgba(13,10,10,0.94) 52%,
                rgba(3,3,3,0.98)
              )
            `,
            boxShadow:
              "0 22px 55px rgba(0,0,0,0.48), 0 0 40px rgba(88,7,12,0.09)",
            marginBottom: 22,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 250,
              height: 250,
              borderRadius: "50%",
              background: "rgba(116,8,15,0.17)",
              filter: "blur(80px)",
              left: -100,
              top: -130,
            }}
          />

          <div
            style={{
              position: "absolute",
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: "rgba(232,111,0,0.055)",
              filter: "blur(65px)",
              right: -40,
              bottom: -100,
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
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(201,151,50,0.22)",
                background: "rgba(201,151,50,0.055)",
                marginBottom: 11,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#c99732",
                  boxShadow:
                    "0 0 10px rgba(201,151,50,0.5)",
                }}
              />

              <span
                style={{
                  color: "#d9b15c",
                  fontSize: 8,
                  fontWeight: 950,
                  letterSpacing: 2.1,
                  textTransform: "uppercase",
                }}
              >
                Crown Link · Battle Center
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                color: "#f9f4ed",
                fontSize: "clamp(30px,5vw,43px)",
                lineHeight: 1,
                fontWeight: 950,
                letterSpacing: -1.5,
              }}
            >
              Matchmaking
            </h1>

            <div
              style={{
                width: 60,
                height: 2,
                marginTop: 12,
                background:
                  "linear-gradient(90deg, #e86f00, #c99732, transparent)",
                boxShadow:
                  "0 0 10px rgba(232,111,0,0.2)",
              }}
            />

            <p
              style={{
                margin: "11px 0 0",
                maxWidth: 650,
                color: "rgba(247,241,232,0.42)",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              Follow your progress from event signup to your
              approved Crown Link matchup.
            </p>
          </div>
        </section>

        {/* MATCHMAKING SUMMARY */}
        {events && events.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 14,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <div>
              <p style={eyebrowStyle}>
                Your Match Status
              </p>

              <h2
                style={{
                  margin: "5px 0 0",
                  color: "#f9f4ed",
                  fontSize: 21,
                  fontWeight: 950,
                  letterSpacing: -0.5,
                }}
              >
                Active Events
              </h2>
            </div>

            <div
              style={{
                padding: "7px 11px",
                borderRadius: 999,
                border:
                  "1px solid rgba(201,151,50,0.17)",
                background:
                  "rgba(201,151,50,0.05)",
                color: "#d9b15c",
                fontSize: 9,
                fontWeight: 900,
              }}
            >
              {events.length}{" "}
              {events.length === 1
                ? "event"
                : "events"}
            </div>
          </div>
        )}

        {/* EVENTS */}
        {!events || events.length === 0 ? (
          <div style={emptyStateStyle}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                border:
                  "1px solid rgba(201,151,50,0.18)",
                background:
                  "rgba(201,151,50,0.045)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#c99732",
                fontSize: 18,
                marginBottom: 13,
              }}
            >
              ⚔
            </div>

            <p
              style={{
                margin: 0,
                color: "#f9f4ed",
                fontSize: 15,
                fontWeight: 900,
              }}
            >
              No Active Matchmaking
            </p>

            <p
              style={{
                margin: "7px 0 0",
                color:
                  "rgba(247,241,232,0.35)",
                fontSize: 12,
              }}
            >
              There are no upcoming Crown Link events
              right now.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 15,
            }}
          >
            {events.map((event, index) => {
              const status = getStatus(event.id);

              return (
                <article
                  key={event.id}
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    padding: 24,
                    borderRadius: 22,
                    border:
                      status.type === "matched"
                        ? "1px solid rgba(201,151,50,0.27)"
                        : "1px solid rgba(201,151,50,0.13)",
                    background:
                      status.type === "matched"
                        ? `
                          linear-gradient(
                            145deg,
                            rgba(43,5,9,0.68),
                            rgba(8,8,8,0.96) 55%,
                            rgba(4,4,4,0.98)
                          )
                        `
                        : `
                          linear-gradient(
                            145deg,
                            rgba(18,15,15,0.94),
                            rgba(5,5,5,0.97)
                          )
                        `,
                    boxShadow:
                      status.type === "matched"
                        ? "0 22px 50px rgba(0,0,0,0.42), 0 0 28px rgba(88,7,12,0.08)"
                        : "0 18px 42px rgba(0,0,0,0.32)",
                  }}
                >
                  {status.type === "matched" && (
                    <div
                      style={{
                        position: "absolute",
                        width: 180,
                        height: 180,
                        borderRadius: "50%",
                        right: -65,
                        top: -90,
                        background:
                          "rgba(232,111,0,0.055)",
                        filter: "blur(45px)",
                      }}
                    />
                  )}

                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 18,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        flex: "1 1 420px",
                      }}
                    >
                      <p style={eyebrowStyle}>
                        Event{" "}
                        {String(index + 1).padStart(
                          2,
                          "0"
                        )}
                      </p>

                      <h2
                        style={{
                          margin: "7px 0 0",
                          color: "#f9f4ed",
                          fontSize:
                            "clamp(21px,3vw,27px)",
                          fontWeight: 950,
                          letterSpacing: -0.7,
                        }}
                      >
                        {event.name}
                      </h2>

                      <p
                        style={{
                          margin: "9px 0 0",
                          color:
                            "rgba(247,241,232,0.38)",
                          fontSize: 12,
                        }}
                      >
                        {formatDate(event.event_date)}
                        {" · "}
                        <span
                          style={{
                            color: "#d9b15c",
                            fontWeight: 850,
                          }}
                        >
                          {formatTime(event.event_time)}
                        </span>
                      </p>
                    </div>

                    {/* STATUS BADGE */}
                    <span
                      style={{
                        padding: "7px 11px",
                        borderRadius: 999,
                        background:
                          status.background,
                        border: `1px solid ${status.border}`,
                        color: status.color,
                        fontSize: 8,
                        fontWeight: 950,
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                      }}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* STATUS PANEL */}
                  <div
                    style={{
                      position: "relative",
                      marginTop: 18,
                      padding: 17,
                      borderRadius: 16,
                      background:
                        status.background,
                      border: `1px solid ${status.border}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          flexShrink: 0,
                          borderRadius: 11,
                          border: `1px solid ${status.border}`,
                          background:
                            "rgba(0,0,0,0.24)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: status.color,
                          fontSize: 14,
                          fontWeight: 950,
                        }}
                      >
                        {status.type === "matched"
                          ? "✓"
                          : status.type === "review"
                            ? "⌛"
                            : status.type === "waiting"
                              ? "•••"
                              : "—"}
                      </div>

                      <div>
                        <p
                          style={{
                            margin: 0,
                            color: status.color,
                            fontSize: 9,
                            fontWeight: 950,
                            letterSpacing: 1.5,
                            textTransform:
                              "uppercase",
                          }}
                        >
                          {status.label}
                        </p>

                        <p
                          style={{
                            margin: "6px 0 0",
                            color:
                              "rgba(247,241,232,0.55)",
                            fontSize: 12,
                            lineHeight: 1.6,
                          }}
                        >
                          {status.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ACTION */}
                  {status.label ===
                    "Not Signed Up" && (
                    <div
                      style={{
                        marginTop: 16,
                      }}
                    >
                      <Link
                        href="/crownlink/events"
                        style={primaryButtonStyle}
                      >
                        View Events
                        <span>→</span>
                      </Link>
                    </div>
                  )}

                  {status.label === "Matched" && (
                    <div
                      style={{
                        marginTop: 16,
                      }}
                    >
                      <Link
                        href="/crownlink/battles"
                        style={primaryButtonStyle}
                      >
                        View My Battle
                        <span>→</span>
                      </Link>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* HOW IT WORKS */}
        <section
          style={{
            marginTop: 22,
            padding: 22,
            borderRadius: 20,
            border:
              "1px solid rgba(201,151,50,0.11)",
            background:
              "linear-gradient(145deg, rgba(15,13,13,0.88), rgba(5,5,5,0.94))",
          }}
        >
          <p style={eyebrowStyle}>
            Matchmaking Process
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 11,
              marginTop: 14,
            }}
          >
            <ProcessStep
              number="01"
              title="Sign Up"
              description="Join an active Crown Link event."
            />

            <ProcessStep
              number="02"
              title="Matchmaking"
              description="Crown Link builds compatible matchups."
            />

            <ProcessStep
              number="03"
              title="Approved"
              description="Your battle matchup is finalized."
            />

            <ProcessStep
              number="04"
              title="Battle"
              description="Your opponent appears in My Battles."
            />
          </div>
        </section>

        {/* FOOTER */}
        <footer
          style={{
            marginTop: 45,
            paddingTop: 17,
            borderTop:
              "1px solid rgba(201,151,50,0.09)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            color: "rgba(247,241,232,0.16)",
            fontSize: 8,
            fontWeight: 900,
            letterSpacing: 2.1,
            textTransform: "uppercase",
          }}
        >
          <span>Royals Bloodline</span>
          <span>Crown Link · Matchmaking</span>
        </footer>
      </div>
    </main>
  );
}

function ProcessStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        border:
          "1px solid rgba(255,255,255,0.05)",
        background: "rgba(0,0,0,0.28)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#c99732",
          fontSize: 8,
          fontWeight: 950,
          letterSpacing: 1.6,
        }}
      >
        {number}
      </p>

      <p
        style={{
          margin: "8px 0 0",
          color: "#f9f4ed",
          fontSize: 12,
          fontWeight: 900,
        }}
      >
        {title}
      </p>

      <p
        style={{
          margin: "5px 0 0",
          color: "rgba(247,241,232,0.31)",
          fontSize: 9,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    </div>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "#c99732",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: 2.1,
  textTransform: "uppercase" as const,
};

const backButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 11px",
  borderRadius: 999,
  border: "1px solid rgba(201,151,50,0.14)",
  background: "rgba(0,0,0,0.28)",
  color: "#d9b15c",
  textDecoration: "none",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: 0.5,
  textTransform: "uppercase" as const,
};

const primaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid rgba(232,111,0,0.34)",
  background:
    "linear-gradient(180deg, rgba(232,111,0,0.14), rgba(76,18,0,0.18))",
  color: "#e98322",
  textDecoration: "none",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: 0.6,
  textTransform: "uppercase" as const,
};

const emptyStateStyle = {
  padding: 26,
  borderRadius: 22,
  border: "1px dashed rgba(201,151,50,0.18)",
  background:
    "linear-gradient(145deg, rgba(18,15,15,0.88), rgba(5,5,5,0.95))",
  boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
};