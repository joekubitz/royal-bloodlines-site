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
    !["creator", "agent", "admin"].includes(userRole.role)
  ) {
    redirect("/crownlink/login");
  }

  const adminSupabase = createAdminClient();

  const today = new Date().toISOString().split("T")[0];

  /*
   * Load active Crown Link events.
   *
   * event_time is now treated as the
   * FIRST battle time.
   *
   * battle_interval_minutes controls
   * how far apart each battle begins.
   */
  const { data: events, error: eventsError } = await adminSupabase
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
    console.error("CROWN LINK EVENTS ERROR:", eventsError);
  }

  /*
   * Load all required dates.
   */
  const { data: eventDates, error: eventDatesError } =
    await adminSupabase
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
  const { data: signups, error: signupsError } =
    await adminSupabase
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
    signups?.map((signup) => signup.event_id) ?? []
  );

  /*
   * Load ONLY this creator's blocked
   * times.
   */
  const {
    data: unavailableTimes,
    error: unavailableTimesError,
  } = await adminSupabase
    .from("crownlink_event_unavailable_times")
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
  const { data: scheduleSlots, error: scheduleSlotsError } =
    await adminSupabase
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
        {/* TOP NAVIGATION */}
        <div
          style={{
            marginBottom: 16,
          }}
        >
          <Link href="/crownlink" style={backButtonStyle}>
            <span
              style={{
                fontSize: 15,
                lineHeight: 1,
              }}
            >
              ←
            </span>

            <span>Back to Crown Link</span>
          </Link>
        </div>

        {/* COMPACT PAGE HEADER */}
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
              pointerEvents: "none",
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
              pointerEvents: "none",
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
                  boxShadow: "0 0 10px rgba(201,151,50,0.5)",
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
              Upcoming Events
            </h1>

            <div
              style={{
                width: 60,
                height: 2,
                marginTop: 12,
                background:
                  "linear-gradient(90deg, #e86f00, #c99732, transparent)",
                boxShadow: "0 0 10px rgba(232,111,0,0.2)",
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
              Sign up for upcoming Crown Link events and mark any
              battle times you cannot make.
            </p>
          </div>
        </section>

        {/* EVENT COUNT */}
        {events && events.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#c99732",
                  fontSize: 8,
                  fontWeight: 950,
                  letterSpacing: 2.2,
                  textTransform: "uppercase",
                }}
              >
                Available Now
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
                Event Lineup
              </h2>
            </div>

            <div
              style={{
                padding: "7px 11px",
                borderRadius: 999,
                border: "1px solid rgba(201,151,50,0.17)",
                background: "rgba(201,151,50,0.05)",
                color: "#d9b15c",
                fontSize: 9,
                fontWeight: 900,
              }}
            >
              {events.length}{" "}
              {events.length === 1 ? "event" : "events"}
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
                border: "1px solid rgba(201,151,50,0.18)",
                background: "rgba(201,151,50,0.045)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#c99732",
                fontSize: 18,
                marginBottom: 13,
              }}
            >
              ♛
            </div>

            <p
              style={{
                margin: 0,
                color: "#f9f4ed",
                fontSize: 15,
                fontWeight: 900,
              }}
            >
              No Upcoming Events
            </p>

            <p
              style={{
                margin: "7px 0 0",
                color: "rgba(247,241,232,0.35)",
                fontSize: 12,
                lineHeight: 1.55,
              }}
            >
              There are no active Crown Link events available right
              now.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            {events.map((event, index) => {
              const requiredDates =
                eventDates?.filter(
                  (requiredDate) =>
                    requiredDate.event_id === event.id
                ) ?? [];

              const eventUnavailableTimes =
                unavailableTimes?.filter(
                  (item) => item.event_id === event.id
                ) ?? [];

              const eventScheduleSlots =
                scheduleSlots?.filter(
                  (slot) => slot.event_id === event.id
                ) ?? [];

              const isSignedUp = signedUpEventIds.has(event.id);

              return (
                <article
                  key={event.id}
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    padding: 26,
                    borderRadius: 24,
                    border: isSignedUp
                      ? "1px solid rgba(201,151,50,0.28)"
                      : "1px solid rgba(201,151,50,0.13)",
                    background: isSignedUp
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
                    boxShadow: isSignedUp
                      ? "0 22px 50px rgba(0,0,0,0.42), 0 0 28px rgba(88,7,12,0.08)"
                      : "0 20px 45px rgba(0,0,0,0.34)",
                  }}
                >
                  {isSignedUp && (
                    <div
                      style={{
                        position: "absolute",
                        width: 180,
                        height: 180,
                        borderRadius: "50%",
                        right: -60,
                        top: -80,
                        background: "rgba(232,111,0,0.055)",
                        filter: "blur(45px)",
                        pointerEvents: "none",
                      }}
                    />
                  )}

                  {/* EVENT HEADER */}
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
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 9,
                          flexWrap: "wrap",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            color: "#c99732",
                            fontSize: 8,
                            fontWeight: 950,
                            letterSpacing: 2.1,
                            textTransform: "uppercase",
                          }}
                        >
                          Event {String(index + 1).padStart(2, "0")}
                        </p>

                        {isSignedUp && (
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "5px 8px",
                              borderRadius: 999,
                              border:
                                "1px solid rgba(201,151,50,0.2)",
                              background:
                                "rgba(201,151,50,0.055)",
                              color: "#d9b15c",
                              fontSize: 7,
                              fontWeight: 950,
                              letterSpacing: 1.3,
                              textTransform: "uppercase",
                            }}
                          >
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background: "#c99732",
                                boxShadow:
                                  "0 0 8px rgba(201,151,50,0.5)",
                              }}
                            />

                            Registered
                          </div>
                        )}
                      </div>

                      <h2
                        style={{
                          margin: "8px 0 0",
                          color: "#f9f4ed",
                          fontSize: "clamp(22px,3vw,29px)",
                          lineHeight: 1.05,
                          fontWeight: 950,
                          letterSpacing: -0.8,
                        }}
                      >
                        {event.name}
                      </h2>

                      <p
                        style={{
                          margin: "10px 0 0",
                          color: "rgba(247,241,232,0.38)",
                          fontSize: 12,
                          lineHeight: 1.5,
                        }}
                      >
                        First battle begins at{" "}
                        <span
                          style={{
                            color: "#d9b15c",
                            fontWeight: 900,
                          }}
                        >
                          {formatTime(event.event_time)}
                        </span>
                        {" · "}
                        Battles every{" "}
                        <span
                          style={{
                            color: "#d9b15c",
                            fontWeight: 900,
                          }}
                        >
                          {event.battle_interval_minutes ?? 10} minutes
                        </span>
                      </p>
                    </div>

                    <div
                      style={{
                        width: 44,
                        height: 44,
                        flexShrink: 0,
                        borderRadius: 14,
                        border: "1px solid rgba(201,151,50,0.18)",
                        background: "rgba(201,151,50,0.04)",
                        color: isSignedUp ? "#e86f00" : "#c99732",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 19,
                      }}
                    >
                      ♛
                    </div>
                  </div>

                  {/* REQUIRED DATES */}
                  <div
                    style={{
                      position: "relative",
                      marginTop: 20,
                      padding: 17,
                      borderRadius: 17,
                      background:
                        "linear-gradient(145deg, rgba(38,5,8,0.28), rgba(0,0,0,0.32))",
                      border: "1px solid rgba(201,151,50,0.13)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "#c99732",
                        fontSize: 8,
                        fontWeight: 950,
                        letterSpacing: 1.8,
                        textTransform: "uppercase",
                      }}
                    >
                      Required Battle Dates
                    </p>

                    {requiredDates.length === 0 ? (
                      <p
                        style={{
                          margin: "9px 0 0",
                          color: "rgba(247,241,232,0.34)",
                          fontSize: 12,
                        }}
                      >
                        Required dates have not been posted yet.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          marginTop: 12,
                        }}
                      >
                        {requiredDates.map((requiredDate) => (
                          <div
                            key={requiredDate.id}
                            style={{
                              padding: "8px 11px",
                              borderRadius: 999,
                              background: "rgba(0,0,0,0.34)",
                              border:
                                "1px solid rgba(201,151,50,0.16)",
                              color: "rgba(249,244,237,0.76)",
                              fontSize: 11,
                              fontWeight: 800,
                            }}
                          >
                            {formatDate(requiredDate.event_date)}
                          </div>
                        ))}
                      </div>
                    )}

                    <p
                      style={{
                        margin: "12px 0 0",
                        color: "rgba(247,241,232,0.29)",
                        fontSize: 10,
                        lineHeight: 1.5,
                      }}
                    >
                      Signing up commits you to one battle on every
                      required date.
                    </p>
                  </div>

                  {/* EVENT DETAILS */}
                  {(event.description || event.prize_information) && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          event.description &&
                          event.prize_information
                            ? "repeat(auto-fit, minmax(260px, 1fr))"
                            : "1fr",
                        gap: 12,
                        marginTop: 12,
                      }}
                    >
                      {event.description && (
                        <div style={informationPanelStyle}>
                          <p style={informationLabelStyle}>
                            About This Event
                          </p>

                          <p style={informationTextStyle}>
                            {event.description}
                          </p>
                        </div>
                      )}

                      {event.prize_information && (
                        <div
                          style={{
                            ...informationPanelStyle,
                            border:
                              "1px solid rgba(201,151,50,0.17)",
                            background:
                              "linear-gradient(145deg, rgba(201,151,50,0.045), rgba(0,0,0,0.25))",
                          }}
                        >
                          <p
                            style={{
                              ...informationLabelStyle,
                              color: "#c99732",
                            }}
                          >
                            Prize Information
                          </p>

                          <p
                            style={{
                              ...informationTextStyle,
                              color: "rgba(249,244,237,0.82)",
                            }}
                          >
                            {event.prize_information}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SIGNUP */}
                  <div
                    style={{
                      position: "relative",
                      marginTop: 18,
                      paddingTop: 18,
                      borderTop: "1px solid rgba(201,151,50,0.09)",
                    }}
                  >
                    <EventSignupButton
                      eventId={event.id}
                      initiallySignedUp={isSignedUp}
                    />
                  </div>

                  {/* UNAVAILABLE TIMES */}
                  <div
                    style={{
                      position: "relative",
                    }}
                  >
                    <EventUnavailableTimesSelector
                      eventId={event.id}
                      isSignedUp={isSignedUp}
                      requiredDates={requiredDates}
                      scheduleSlots={eventScheduleSlots}
                      unavailableTimes={eventUnavailableTimes}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* FOOTER */}
        <footer
          style={{
            marginTop: 45,
            paddingTop: 17,
            borderTop: "1px solid rgba(201,151,50,0.09)",
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
          <span>Crown Link · Events</span>
        </footer>
      </div>
    </main>
  );
}

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

const emptyStateStyle = {
  padding: 26,
  borderRadius: 22,
  border: "1px dashed rgba(201,151,50,0.18)",
  background:
    "linear-gradient(145deg, rgba(18,15,15,0.88), rgba(5,5,5,0.95))",
  boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
};

const informationPanelStyle = {
  padding: 16,
  borderRadius: 16,
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.055)",
};

const informationLabelStyle = {
  margin: 0,
  color: "rgba(247,241,232,0.31)",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: 1.7,
  textTransform: "uppercase" as const,
};

const informationTextStyle = {
  margin: "8px 0 0",
  color: "rgba(247,241,232,0.7)",
  fontSize: 12,
  lineHeight: 1.65,
  whiteSpace: "pre-wrap" as const,
};