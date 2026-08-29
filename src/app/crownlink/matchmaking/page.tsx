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
    !["creator", "admin"].includes(userRole.role)
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
    const [hourString, minuteString] =
      timeString.split(":");

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
        label: "Matched",
        description:
          "Your matchup has been approved and is available in My Battles.",
        color: "#b8f5c2",
        background: "rgba(60,180,90,0.12)",
        border: "rgba(80,210,110,0.25)",
      };
    }

    if (match?.status === "suggested") {
      return {
        label: "Match Awaiting Approval",
        description:
          "Crown Link found a potential matchup. An admin is reviewing it now.",
        color: "#d3a33c",
        background: "rgba(211,163,60,0.1)",
        border: "rgba(211,163,60,0.25)",
      };
    }

    if (signup) {
      return {
        label: "Waiting for Match",
        description:
          "You are signed up and waiting for Crown Link matchmaking.",
        color: "#d3a33c",
        background: "rgba(211,163,60,0.08)",
        border: "rgba(211,163,60,0.2)",
      };
    }

    return {
      label: "Not Signed Up",
      description:
        "Sign up for this event before matchmaking begins.",
      color: "rgba(255,255,255,0.55)",
      background: "rgba(255,255,255,0.04)",
      border: "rgba(255,255,255,0.08)",
    };
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #4b0d12 0%, #180607 35%, #050505 75%)",
        color: "white",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <Link
          href="/crownlink"
          style={{
            color: "#d3a33c",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          ← Back to Crown Link
        </Link>

        <div
          style={{
            marginTop: 28,
            marginBottom: 30,
          }}
        >
          <p
            style={{
              color: "#d3a33c",
              letterSpacing: 4,
              fontSize: 12,
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            CROWN LINK
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: 40,
              fontWeight: 900,
            }}
          >
            Matchmaking
          </h1>

          <p
            style={{
              marginTop: 10,
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Track your Crown Link matchmaking status.
          </p>
        </div>

        {!events || events.length === 0 ? (
          <div
            style={{
              padding: 26,
              borderRadius: 18,
              border:
                "1px solid rgba(211,163,60,0.2)",
              background:
                "rgba(20,10,10,0.75)",
              color:
                "rgba(255,255,255,0.5)",
            }}
          >
            No upcoming Crown Link events right now.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            {events.map((event) => {
              const status = getStatus(event.id);

              return (
                <div
                  key={event.id}
                  style={{
                    padding: 24,
                    borderRadius: 18,
                    border:
                      "1px solid rgba(211,163,60,0.2)",
                    background:
                      "rgba(20,10,10,0.78)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      gap: 20,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "#d3a33c",
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: 2,
                          textTransform:
                            "uppercase",
                        }}
                      >
                        Upcoming Event
                      </p>

                      <h2
                        style={{
                          margin: "8px 0 0",
                          fontSize: 22,
                          fontWeight: 900,
                        }}
                      >
                        {event.name}
                      </h2>

                      <p
                        style={{
                          margin: "9px 0 0",
                          color:
                            "rgba(255,255,255,0.5)",
                          fontSize: 13,
                        }}
                      >
                        {formatDate(
                          event.event_date
                        )}
                        {" • "}
                        {formatTime(
                          event.event_time
                        )}
                      </p>
                    </div>

                    <span
                      style={{
                        padding: "7px 11px",
                        borderRadius: 999,
                        background:
                          status.background,
                        border: `1px solid ${status.border}`,
                        color: status.color,
                        fontSize: 10,
                        fontWeight: 900,
                        letterSpacing: 1,
                        textTransform:
                          "uppercase",
                      }}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 18,
                      padding: 16,
                      borderRadius: 13,
                      background:
                        "rgba(255,255,255,0.03)",
                      border:
                        "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color:
                          "rgba(255,255,255,0.6)",
                        fontSize: 13,
                        lineHeight: 1.6,
                      }}
                    >
                      {status.description}
                    </p>
                  </div>

                  {status.label ===
                    "Not Signed Up" && (
                    <Link
                      href="/crownlink/events"
                      style={{
                        display:
                          "inline-block",
                        marginTop: 16,
                        padding:
                          "11px 16px",
                        borderRadius: 10,
                        background:
                          "linear-gradient(135deg, #d3a33c, #9e6f22)",
                        color: "#080503",
                        textDecoration:
                          "none",
                        fontWeight: 900,
                        fontSize: 13,
                      }}
                    >
                      View Events
                    </Link>
                  )}

                  {status.label ===
                    "Matched" && (
                    <Link
                      href="/crownlink/battles"
                      style={{
                        display:
                          "inline-block",
                        marginTop: 16,
                        padding:
                          "11px 16px",
                        borderRadius: 10,
                        background:
                          "linear-gradient(135deg, #d3a33c, #9e6f22)",
                        color: "#080503",
                        textDecoration:
                          "none",
                        fontWeight: 900,
                        fontSize: 13,
                      }}
                    >
                      View My Battle
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}