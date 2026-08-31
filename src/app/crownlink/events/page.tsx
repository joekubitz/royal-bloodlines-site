import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import EventSignupButton from "./EventSignupButton";
import EventUnavailableTimesSelector from "./EventUnavailableTimesSelector";

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

  const adminSupabase = createAdminClient();

  const today = new Date()
    .toISOString()
    .split("T")[0];

  /*
   * Load active Crown Link events.
   *
   * event_time is now treated as the
   * FIRST battle time.
   *
   * battle_interval_minutes controls
   * how far apart each battle begins.
   */
  const {
    data: events,
    error: eventsError,
  } = await adminSupabase
    .from("crownlink_events")
    .select(`
      id,
      name,
      description,
      prize_information,
      event_date,
      event_time,
      battle_interval_minutes,
      status
    `)
    .eq("status", "active")
    .gte("event_date", today)
    .order("event_date", {
      ascending: true,
    })
    .order("event_time", {
      ascending: true,
    });

  if (eventsError) {
    console.error(
      "CROWN LINK EVENTS ERROR:",
      eventsError
    );
  }

  /*
   * Load all required dates.
   */
  const {
    data: eventDates,
    error: eventDatesError,
  } = await adminSupabase
    .from("crownlink_event_dates")
    .select(`
      id,
      event_id,
      event_date
    `)
    .gte("event_date", today)
    .order("event_date", {
      ascending: true,
    });

  if (eventDatesError) {
    console.error(
      "CROWN LINK EVENT DATES ERROR:",
      eventDatesError
    );
  }

  /*
   * Load this creator's active event
   * signups.
   */
  const {
    data: signups,
    error: signupsError,
  } = await adminSupabase
    .from("crownlink_event_signups")
    .select(`
      event_id,
      status
    `)
    .eq("user_id", user.id)
    .eq("status", "signed_up");

  if (signupsError) {
    console.error(
      "CROWN LINK EVENT SIGNUPS ERROR:",
      signupsError
    );
  }

  const signedUpEventIds = new Set(
    signups?.map(
      (signup) => signup.event_id
    ) ?? []
  );

  /*
   * Load ONLY this creator's blocked
   * times.
   */
  const {
    data: unavailableTimes,
    error: unavailableTimesError,
  } = await adminSupabase
    .from(
      "crownlink_event_unavailable_times"
    )
    .select(`
      id,
      event_id,
      event_date_id,
      blocked_time
    `)
    .eq("user_id", user.id)
    .order("blocked_time", {
      ascending: true,
    });

  if (unavailableTimesError) {
    console.error(
      "CROWN LINK UNAVAILABLE TIMES ERROR:",
      unavailableTimesError
    );
  }
  /*
   * Load the real automatically
   * generated schedule times.
   */
  const {
    data: scheduleSlots,
    error: scheduleSlotsError,
  } = await adminSupabase
    .from("crownlink_schedule_slots")
    .select(`
      id,
      event_id,
      event_date_id,
      slot_time
    `)
    .order("slot_time", {
      ascending: true,
    });

  if (scheduleSlotsError) {
    console.error(
      "CROWN LINK SCHEDULE SLOTS ERROR:",
      scheduleSlotsError
    );
  }
  function formatDate(dateString: string) {
    const date = new Date(
      `${dateString}T12:00:00`
    );

    return date.toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    );
  }

  function formatTime(timeString: string) {
    const [hourString, minuteString] =
      timeString.split(":");

    let hour = Number(hourString);

    const minute =
      minuteString || "00";

    const suffix =
      hour >= 12 ? "PM" : "AM";

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
              color:
                "rgba(255,255,255,0.55)",
              lineHeight: 1.6,
            }}
          >
            View upcoming Crown Link
            events, sign up for the full
            event, and mark any specific
            battle times you cannot make.
          </p>
        </div>

        {!events ||
        events.length === 0 ? (
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
            No upcoming Crown Link events
            right now.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            {events.map((event) => {
              const requiredDates =
                eventDates?.filter(
                  (requiredDate) =>
                    requiredDate.event_id ===
                    event.id
                ) ?? [];

              const eventUnavailableTimes =
                unavailableTimes?.filter(
                  (item) =>
                    item.event_id ===
                    event.id
                ) ?? [];

              const eventScheduleSlots =
                scheduleSlots?.filter(
                  (slot) =>
                    slot.event_id ===
                    event.id
                ) ?? [];

              const isSignedUp =
                signedUpEventIds.has(
                  event.id
                );

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
                      margin:
                        "8px 0 0",
                      fontSize: 23,
                      fontWeight: 900,
                    }}
                  >
                    {event.name}
                  </h2>

                  <p
                    style={{
                      margin:
                        "10px 0 0",
                      color:
                        "rgba(255,255,255,0.55)",
                      fontSize: 14,
                    }}
                  >
                    First battle at{" "}
                    {formatTime(
                      event.event_time
                    )}
                    {" • "}
                    Every{" "}
                    {event.battle_interval_minutes ??
                      10}{" "}
                    minutes
                  </p>

                  <div
                    style={{
                      marginTop: 18,
                      padding: 16,
                      borderRadius: 14,
                      background:
                        "rgba(211,163,60,0.045)",
                      border:
                        "1px solid rgba(211,163,60,0.16)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color:
                          "#d3a33c",
                        fontSize: 10,
                        fontWeight: 900,
                        letterSpacing: 1.5,
                        textTransform:
                          "uppercase",
                      }}
                    >
                      Required Battle Dates
                    </p>

                    {requiredDates.length ===
                    0 ? (
                      <p
                        style={{
                          margin:
                            "9px 0 0",
                          color:
                            "rgba(255,255,255,0.4)",
                          fontSize: 13,
                        }}
                      >
                        Required dates have
                        not been posted yet.
                      </p>
                    ) : (
                      <div
                        style={{
                          display:
                            "flex",
                          flexWrap:
                            "wrap",
                          gap: 8,
                          marginTop: 12,
                        }}
                      >
                        {requiredDates.map(
                          (
                            requiredDate
                          ) => (
                            <div
                              key={
                                requiredDate.id
                              }
                              style={{
                                padding:
                                  "8px 11px",
                                borderRadius:
                                  999,
                                background:
                                  "rgba(0,0,0,0.22)",
                                border:
                                  "1px solid rgba(211,163,60,0.18)",
                                color:
                                  "rgba(255,255,255,0.8)",
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              {formatDate(
                                requiredDate.event_date
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}

                    <p
                      style={{
                        margin:
                          "12px 0 0",
                        color:
                          "rgba(255,255,255,0.38)",
                        fontSize: 11,
                        lineHeight: 1.5,
                      }}
                    >
                      Signing up means you
                      are committing to one
                      battle on every
                      required date.
                    </p>
                  </div>

                  {event.description && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: 16,
                        borderRadius: 14,
                        background:
                          "rgba(255,255,255,0.035)",
                        border:
                          "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          color:
                            "rgba(255,255,255,0.4)",
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing: 1.5,
                          textTransform:
                            "uppercase",
                        }}
                      >
                        About This Event
                      </p>

                      <p
                        style={{
                          margin:
                            "8px 0 0",
                          color:
                            "rgba(255,255,255,0.78)",
                          fontSize: 14,
                          lineHeight: 1.6,
                          whiteSpace:
                            "pre-wrap",
                        }}
                      >
                        {event.description}
                      </p>
                    </div>
                  )}

                  {event.prize_information && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: 16,
                        borderRadius: 14,
                        background:
                          "rgba(211,163,60,0.06)",
                        border:
                          "1px solid rgba(211,163,60,0.18)",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          color:
                            "#d3a33c",
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing: 1.5,
                          textTransform:
                            "uppercase",
                        }}
                      >
                        🏆 Prizes
                      </p>

                      <p
                        style={{
                          margin:
                            "8px 0 0",
                          color:
                            "rgba(255,255,255,0.85)",
                          fontSize: 14,
                          lineHeight: 1.6,
                          whiteSpace:
                            "pre-wrap",
                        }}
                      >
                        {
                          event.prize_information
                        }
                      </p>
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 18,
                    }}
                  >
                    <EventSignupButton
                      eventId={event.id}
                      initiallySignedUp={
                        isSignedUp
                      }
                    />
                  </div>

                  <EventUnavailableTimesSelector
                    eventId={event.id}
                    isSignedUp={
                      isSignedUp
                    }
                    requiredDates={
                      requiredDates
                    }
                    scheduleSlots={
                      eventScheduleSlots
                    }
                    unavailableTimes={
                      eventUnavailableTimes
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}