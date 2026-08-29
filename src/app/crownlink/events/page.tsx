import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import EventSignupButton from "./EventSignupButton";

export default async function CrownLinkEventsPage() {
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

  const today = new Date().toISOString().split("T")[0];

  const { data: events, error: eventsError } = await supabase
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

  if (eventsError) {
    console.error(
      "CROWN LINK EVENTS ERROR:",
      eventsError
    );
  }

  const { data: signups } = await supabase
    .from("crownlink_event_signups")
    .select("event_id, status")
    .eq("user_id", user.id)
    .eq("status", "signed_up");

  const signedUpEventIds = new Set(
    signups?.map((signup) => signup.event_id) ?? []
  );

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
            Upcoming Events
          </h1>

          <p
            style={{
              marginTop: 10,
              color: "rgba(255,255,255,0.55)",
            }}
          >
            View upcoming Crown Link battle events and sign up.
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
              color: "rgba(255,255,255,0.5)",
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
            {events.map((event) => (
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
                <p
                  style={{
                    margin: 0,
                    color: "#d3a33c",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                  }}
                >
                  Upcoming Event
                </p>

                <h2
                  style={{
                    margin: "8px 0 0",
                    fontSize: 23,
                    fontWeight: 900,
                  }}
                >
                  {event.name}
                </h2>

                <p
                  style={{
                    margin: "10px 0 0",
                    color:
                      "rgba(255,255,255,0.55)",
                    fontSize: 14,
                  }}
                >
                  {formatDate(event.event_date)}
                  {" • "}
                  {formatTime(event.event_time)}
                </p>

                <EventSignupButton
                  eventId={event.id}
                  initiallySignedUp={signedUpEventIds.has(
                    event.id
                  )}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}