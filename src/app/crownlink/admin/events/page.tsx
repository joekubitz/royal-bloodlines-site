import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import AddEventForm from "./AddEventForm";
import RestoreSignupButton from "./RestoreSignupButton";
import AddEventDateForm from "./AddEventDateForm";
import RemoveEventDateButton from "./RemoveEventDateButton";
import RemoveSignupButton from "./RemoveSignupButton";
import DeleteEventButton from "./DeleteEventButton";
import ArchiveEventButton from "./ArchiveEventButton";

export default async function CrownLinkEventsAdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/crownlink/login");
  }

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role, status, can_manage_events")
    .eq("user_id", user.id)
    .single();

  const canAccessEvents =
    userRole?.status === "active" &&
    (userRole.role === "admin" ||
      userRole.can_manage_events === true);

  if (!canAccessEvents) {
    redirect("/crownlink");
  }

  const adminSupabase = createAdminClient();

  const { data: events, error: eventsError } =
    await adminSupabase
      .from("crownlink_events")
      .select(`
        id,
        name,
        event_date,
        event_time,
        status,
        battle_interval_minutes,
        created_at
      `)
      .eq("status", "active")
      .order("event_date", {
        ascending: true,
      })
      .order("event_time", {
        ascending: true,
      });

  if (eventsError) {
    console.error(
      "ADMIN EVENTS ERROR:",
      eventsError
    );
  }

  const { data: eventDates, error: eventDatesError } =
    await adminSupabase
      .from("crownlink_event_dates")
      .select(`
        id,
        event_id,
        event_date
      `)
      .order("event_date", { ascending: true });

  if (eventDatesError) {
    console.error(
      "ADMIN EVENT DATES ERROR:",
      eventDatesError
    );
  }

  const { data: scheduleSlots, error: scheduleSlotsError } =
    await adminSupabase
      .from("crownlink_schedule_slots")
      .select(`
        id,
        event_id,
        event_date_id,
        slot_time
      `)
      .order("slot_time", { ascending: true });

  if (scheduleSlotsError) {
    console.error(
      "ADMIN SCHEDULE SLOTS ERROR:",
      scheduleSlotsError
    );
  }

  /*
   * Load active AND admin-removed signups.
   *
   * Normal creator cancellations stay hidden
   * from this admin management list.
   */
  const { data: signups, error: signupsError } =
    await adminSupabase
      .from("crownlink_event_signups")
      .select(`
        id,
        event_id,
        user_id,
        status,
        created_at
      `)
      .in("status", [
        "signed_up",
        "removed",
      ]);

  if (signupsError) {
    console.error(
      "ADMIN EVENT SIGNUPS ERROR:",
      signupsError
    );
  }

  const { data: profiles, error: profilesError } =
    await adminSupabase
      .from("crownlink_profiles")
      .select(`
        user_id,
        display_name,
        tiktok_username,
        diamond_level
      `);

  if (profilesError) {
    console.error(
      "ADMIN PROFILE ERROR:",
      profilesError
    );
  }

  const { data: roles, error: rolesError } =
    await adminSupabase
      .from("user_roles")
      .select(`
        user_id,
        agency_id
      `)
      .eq("role", "creator");

  if (rolesError) {
    console.error(
      "ADMIN CREATOR ROLE ERROR:",
      rolesError
    );
  }

  const { data: agencies, error: agenciesError } =
    await adminSupabase
      .from("crownlink_agencies")
      .select(`
        id,
        name
      `);

  if (agenciesError) {
    console.error(
      "ADMIN AGENCY ERROR:",
      agenciesError
    );
  }

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.user_id,
      profile,
    ])
  );

  const roleMap = new Map(
    (roles ?? []).map((role) => [
      role.user_id,
      role,
    ])
  );

  const agencyMap = new Map(
    (agencies ?? []).map((agency) => [
      agency.id,
      agency.name,
    ])
  );

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
    const minute = minuteString || "00";

    const suffix =
      hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;

    return `${hour}:${minute} ${suffix}`;
  }

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
        padding: "28px 20px 70px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {/* BACK */}
        <div style={{ marginBottom: 16 }}>
          <Link
            href="/crownlink/admin"
            style={backButtonStyle}
          >
            <span style={{ fontSize: 14 }}>
              ←
            </span>
            Admin Center
          </Link>
        </div>

        {/* HEADER */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "24px 27px",
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
              width: 250,
              height: 250,
              borderRadius: "50%",
              background:
                "rgba(110,7,14,0.18)",
              filter: "blur(80px)",
              left: -100,
              top: -140,
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
                gap: 7,
                padding: "5px 9px",
                borderRadius: 999,
                border:
                  "1px solid rgba(201,151,50,0.20)",
                background:
                  "rgba(201,151,50,0.045)",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#c99732",
                  boxShadow:
                    "0 0 8px rgba(201,151,50,0.55)",
                }}
              />

              <span style={eyebrowStyle}>
                Crown Link · Battle Operations
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                color: "#f9f4ed",
                fontSize:
                  "clamp(30px,5vw,42px)",
                fontWeight: 950,
                letterSpacing: -1.4,
                lineHeight: 1,
              }}
            >
              Events
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
              Create Crown Link events, set
              required battle dates, and manage
              creator participation.
            </p>
          </div>
        </section>

        {/* CREATE EVENT */}
        <section
          style={{
            padding: 22,
            borderRadius: 20,
            border:
              "1px solid rgba(201,151,50,0.14)",
            background:
              "linear-gradient(145deg, rgba(20,16,16,0.94), rgba(5,5,5,0.97))",
            boxShadow:
              "0 18px 40px rgba(0,0,0,0.28)",
            marginBottom: 30,
          }}
        >
          <SectionHeading
            eyebrow="Event Setup"
            title="Create Event"
            description="Start a new Crown Link battle event."
          />

          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop:
                "1px solid rgba(201,151,50,0.08)",
            }}
          >
            <AddEventForm />
          </div>
        </section>

        {/* CURRENT EVENTS HEADER */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div>
            <p style={sectionEyebrowStyle}>
              Active Battle Events
            </p>

            <h2
              style={{
                margin: "5px 0 0",
                color: "#f9f4ed",
                fontSize: 22,
                fontWeight: 950,
                letterSpacing: -0.5,
              }}
            >
              Current Events
            </h2>
          </div>

          <div style={countPillStyle}>
            {events?.length ?? 0}{" "}
            {(events?.length ?? 0) === 1
              ? "event"
              : "events"}
          </div>
        </div>

        {!events ||
        events.length === 0 ? (
          <div style={emptyStateStyle}>
            No active Crown Link events have
            been created yet.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            {events.map((event) => {
              const eventRequiredDates =
                eventDates?.filter(
                  (eventDate) =>
                    eventDate.event_id ===
                    event.id
                ) ?? [];

              const eventScheduleSlots =
                scheduleSlots?.filter(
                  (slot) =>
                    slot.event_id === event.id
                ) ?? [];

              const eventSignups =
                signups?.filter(
                  (signup) =>
                    signup.event_id ===
                    event.id
                ) ?? [];

              const activeSignups =
                eventSignups.filter(
                  (signup) =>
                    signup.status ===
                    "signed_up"
                );

              const removedSignups =
                eventSignups.filter(
                  (signup) =>
                    signup.status ===
                    "removed"
                );

              return (
                <article
                  key={event.id}
                  style={{
                    overflow: "hidden",
                    borderRadius: 22,
                    border:
                      "1px solid rgba(201,151,50,0.17)",
                    background:
                      "linear-gradient(145deg, rgba(18,14,14,0.96), rgba(4,4,4,0.98))",
                    boxShadow:
                      "0 20px 45px rgba(0,0,0,0.34)",
                  }}
                >
                  {/* EVENT SUMMARY */}
                  <div
                    style={{
                      position: "relative",
                      padding: 22,
                      background: `
                        linear-gradient(
                          135deg,
                          rgba(48,5,9,0.52),
                          rgba(7,7,7,0.72) 60%,
                          rgba(3,3,3,0.88)
                        )
                      `,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        width: 160,
                        height: 160,
                        right: -50,
                        top: -80,
                        borderRadius: "50%",
                        background:
                          "rgba(232,111,0,0.045)",
                        filter: "blur(42px)",
                      }}
                    />

                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "flex-start",
                        gap: 18,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          flex: "1 1 360px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={activeBadgeStyle}
                          >
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius:
                                  "50%",
                                background:
                                  "#c99732",
                              }}
                            />
                            Active
                          </span>

                          <span
                            style={{
                              color:
                                "rgba(247,241,232,0.22)",
                              fontSize: 8,
                              fontWeight: 900,
                              letterSpacing: 1.2,
                              textTransform:
                                "uppercase",
                            }}
                          >
                            Crown Link Event
                          </span>
                        </div>

                        <h3
                          style={{
                            margin:
                              "10px 0 0",
                            color: "#f9f4ed",
                            fontSize:
                              "clamp(21px,3vw,28px)",
                            lineHeight: 1.05,
                            fontWeight: 950,
                            letterSpacing:
                              -0.7,
                          }}
                        >
                          {event.name}
                        </h3>

                        <p
                          style={{
                            margin:
                              "9px 0 0",
                            color:
                              "rgba(247,241,232,0.42)",
                            fontSize: 11,
                          }}
                        >
                          {formatDate(
                            event.event_date
                          )}
                          {" · "}
                          <span
                            style={{
                              color:
                                "#d9b15c",
                              fontWeight: 900,
                            }}
                          >
                            {formatTime(
                              event.event_time
                            )}
                          </span>
                          {" · "}
                          Every{" "}
                          {event.battle_interval_minutes ??
                            10}{" "}
                          minutes
                        </p>
                      </div>

                      {/* SUMMARY STATS */}
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <SummaryStat
                          value={String(
                            activeSignups.length
                          )}
                          label="Signed Up"
                          featured
                        />

                        <SummaryStat
                          value={String(
                            eventRequiredDates.length
                          )}
                          label="Dates"
                        />

                        <SummaryStat
                          value={String(
                            eventScheduleSlots.length
                          )}
                          label="Slots"
                        />

                        {removedSignups.length >
                          0 && (
                          <SummaryStat
                            value={String(
                              removedSignups.length
                            )}
                            label="Removed"
                            danger
                          />
                        )}
                      </div>
                    </div>

                    {/* EVENT ACTIONS */}
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        justifyContent:
                          "flex-end",
                        alignItems: "center",
                        gap: 9,
                        flexWrap: "wrap",
                        marginTop: 17,
                        paddingTop: 15,
                        borderTop:
                          "1px solid rgba(201,151,50,0.08)",
                      }}
                    >
                      <ArchiveEventButton
                        eventId={event.id}
                        eventName={event.name}
                      />

                      <div
                        style={{
                          paddingLeft: 9,
                          borderLeft:
                            "1px solid rgba(255,100,100,0.12)",
                        }}
                      >
                        <DeleteEventButton
                          eventId={event.id}
                          eventName={event.name}
                        />
                      </div>
                    </div>
                  </div>

                  {/* EVENT CONFIGURATION */}
                  <div
                    style={{
                      padding: 22,
                      borderTop:
                        "1px solid rgba(201,151,50,0.08)",
                    }}
                  >
                    <SectionHeading
                      eyebrow="Event Configuration"
                      title="Required Battle Dates"
                      description="Every signed-up creator battles once on each required date."
                    />

                    <div
                      style={{
                        marginTop: 15,
                      }}
                    >
                      <AddEventDateForm
                        eventId={event.id}
                      />
                    </div>

                    {eventRequiredDates.length ===
                    0 ? (
                      <p
                        style={mutedMessageStyle}
                      >
                        No required battle dates
                        have been added yet.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gap: 8,
                          marginTop: 15,
                        }}
                      >
                        {eventRequiredDates.map(
                          (requiredDate) => (
                            <div
                              key={
                                requiredDate.id
                              }
                              style={{
                                padding:
                                  "11px 13px",
                                borderRadius: 12,
                                background:
                                  "rgba(201,151,50,0.045)",
                                border:
                                  "1px solid rgba(201,151,50,0.14)",
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
                              <div
                                style={{
                                  display:
                                    "flex",
                                  alignItems:
                                    "center",
                                  gap: 9,
                                }}
                              >
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius:
                                      "50%",
                                    background:
                                      "#c99732",
                                  }}
                                />

                                <span
                                  style={{
                                    color:
                                      "#d9b15c",
                                    fontSize: 11,
                                    fontWeight: 900,
                                  }}
                                >
                                  {formatDate(
                                    requiredDate.event_date
                                  )}
                                </span>
                              </div>

                              <RemoveEventDateButton
                                eventDateId={
                                  requiredDate.id
                                }
                              />
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* AUTOMATIC SCHEDULE */}
                  <div
                    style={{
                      padding: 22,
                      borderTop:
                        "1px solid rgba(201,151,50,0.08)",
                      background:
                        "rgba(0,0,0,0.16)",
                    }}
                  >
                    <SectionHeading
                      eyebrow="Automatic Scheduling"
                      title="Battle Times"
                      description={`Starts at ${formatTime(
                        event.event_time
                      )} with battles every ${
                        event.battle_interval_minutes ??
                        10
                      } minutes.`}
                    />

                    {eventRequiredDates.length ===
                    0 ? (
                      <p
                        style={mutedMessageStyle}
                      >
                        Add a required battle
                        date to generate schedule
                        times.
                      </p>
                    ) : activeSignups.length ===
                      0 ? (
                      <p
                        style={mutedMessageStyle}
                      >
                        Schedule times will
                        appear when creators sign
                        up.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gap: 15,
                          marginTop: 16,
                        }}
                      >
                        {eventRequiredDates.map(
                          (requiredDate) => {
                            const dateSlots =
                              eventScheduleSlots.filter(
                                (slot) =>
                                  slot.event_date_id ===
                                  requiredDate.id
                              );

                            return (
                              <div
                                key={
                                  requiredDate.id
                                }
                                style={{
                                  padding: 14,
                                  borderRadius: 14,
                                  border:
                                    "1px solid rgba(255,255,255,0.05)",
                                  background:
                                    "rgba(255,255,255,0.018)",
                                }}
                              >
                                <p
                                  style={{
                                    margin:
                                      "0 0 10px",
                                    color:
                                      "rgba(249,244,237,0.7)",
                                    fontSize: 10,
                                    fontWeight: 900,
                                  }}
                                >
                                  {formatDate(
                                    requiredDate.event_date
                                  )}
                                </p>

                                {dateSlots.length ===
                                0 ? (
                                  <p
                                    style={{
                                      margin: 0,
                                      color:
                                        "rgba(247,241,232,0.28)",
                                      fontSize: 10,
                                    }}
                                  >
                                    No automatic
                                    times generated
                                    yet.
                                  </p>
                                ) : (
                                  <div
                                    style={{
                                      display:
                                        "flex",
                                      gap: 7,
                                      flexWrap:
                                        "wrap",
                                    }}
                                  >
                                    {dateSlots.map(
                                      (slot) => (
                                        <span
                                          key={
                                            slot.id
                                          }
                                          style={
                                            scheduleTimeStyle
                                          }
                                        >
                                          {formatTime(
                                            slot.slot_time
                                          )}
                                        </span>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}

                    {activeSignups.length > 0 &&
                      activeSignups.length %
                        2 !==
                        0 && (
                        <div
                          style={{
                            marginTop: 14,
                            padding:
                              "11px 13px",
                            borderRadius: 12,
                            background:
                              "rgba(111,13,17,0.18)",
                            border:
                              "1px solid rgba(180,65,65,0.22)",
                            display: "flex",
                            gap: 9,
                            alignItems:
                              "flex-start",
                          }}
                        >
                          <span
                            style={{
                              color:
                                "#d88b8b",
                              fontSize: 12,
                            }}
                          >
                            !
                          </span>

                          <p
                            style={{
                              margin: 0,
                              color:
                                "rgba(245,180,180,0.72)",
                              fontSize: 10,
                              fontWeight: 800,
                              lineHeight: 1.5,
                            }}
                          >
                            Odd creator count:
                            one creator will
                            remain unmatched
                            until another creator
                            signs up.
                          </p>
                        </div>
                      )}
                  </div>

                  {/* CREATOR SIGNUPS */}
                  <div
                    style={{
                      padding: 22,
                      borderTop:
                        "1px solid rgba(201,151,50,0.08)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems:
                          "flex-end",
                        justifyContent:
                          "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        marginBottom: 14,
                      }}
                    >
                      <div>
                        <p
                          style={
                            sectionEyebrowStyle
                          }
                        >
                          Participation
                        </p>

                        <h4
                          style={{
                            margin:
                              "5px 0 0",
                            color:
                              "#f9f4ed",
                            fontSize: 17,
                            fontWeight: 950,
                          }}
                        >
                          Creator Signups
                        </h4>
                      </div>

                      <span
                        style={
                          countPillStyle
                        }
                      >
                        {
                          activeSignups.length
                        }{" "}
                        active
                      </span>
                    </div>

                    {eventSignups.length ===
                    0 ? (
                      <p
                        style={{
                          margin: 0,
                          color:
                            "rgba(247,241,232,0.3)",
                          fontSize: 11,
                        }}
                      >
                        No creators have signed
                        up yet.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gap: 9,
                        }}
                      >
                        {eventSignups.map(
                          (signup) => {
                            const profile =
                              profileMap.get(
                                signup.user_id
                              );

                            const role =
                              roleMap.get(
                                signup.user_id
                              );

                            const agencyName =
                              role?.agency_id
                                ? agencyMap.get(
                                    role.agency_id
                                  ) ??
                                  "Unknown Agency"
                                : "No Agency";

                            const creatorName =
                              profile?.display_name?.trim() ||
                              (profile?.tiktok_username
                                ? `@${profile.tiktok_username}`
                                : "Creator");

                            const isRemoved =
                              signup.status ===
                              "removed";

                            return (
                              <div
                                key={
                                  signup.id
                                }
                                style={{
                                  padding:
                                    "14px 15px",
                                  borderRadius: 14,
                                  background:
                                    isRemoved
                                      ? "linear-gradient(145deg, rgba(75,8,12,0.18), rgba(8,8,8,0.72))"
                                      : "rgba(255,255,255,0.022)",
                                  border:
                                    isRemoved
                                      ? "1px solid rgba(180,65,65,0.18)"
                                      : "1px solid rgba(255,255,255,0.055)",
                                  display: "flex",
                                  justifyContent:
                                    "space-between",
                                  alignItems:
                                    "center",
                                  gap: 15,
                                  flexWrap:
                                    "wrap",
                                  opacity:
                                    isRemoved
                                      ? 0.72
                                      : 1,
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      display:
                                        "flex",
                                      gap: 8,
                                      alignItems:
                                        "center",
                                      flexWrap:
                                        "wrap",
                                    }}
                                  >
                                    <p
                                      style={{
                                        margin: 0,
                                        color:
                                          "#f9f4ed",
                                        fontSize: 13,
                                        fontWeight: 900,
                                      }}
                                    >
                                      {
                                        creatorName
                                      }
                                    </p>

                                    {isRemoved && (
                                      <span
                                        style={
                                          removedBadgeStyle
                                        }
                                      >
                                        Removed
                                      </span>
                                    )}
                                  </div>

                                  {profile?.tiktok_username && (
                                    <p
                                      style={{
                                        margin:
                                          "4px 0 0",
                                        color:
                                          "rgba(247,241,232,0.31)",
                                        fontSize: 10,
                                      }}
                                    >
                                      @
                                      {
                                        profile.tiktok_username
                                      }
                                    </p>
                                  )}

                                  <p
                                    style={{
                                      margin:
                                        "5px 0 0",
                                      color:
                                        "#c99732",
                                      fontSize: 9,
                                      fontWeight: 850,
                                    }}
                                  >
                                    {
                                      agencyName
                                    }
                                  </p>
                                </div>

                                <div
                                  style={{
                                    display:
                                      "flex",
                                    alignItems:
                                      "center",
                                    gap: 14,
                                    flexWrap:
                                      "wrap",
                                  }}
                                >
                                  <div
                                    style={{
                                      textAlign:
                                        "right",
                                    }}
                                  >
                                    <p
                                      style={{
                                        margin: 0,
                                        color:
                                          "rgba(247,241,232,0.24)",
                                        fontSize: 7,
                                        fontWeight: 900,
                                        letterSpacing: 1,
                                        textTransform:
                                          "uppercase",
                                      }}
                                    >
                                      Typical
                                      Diamonds
                                    </p>

                                    <p
                                      style={{
                                        margin:
                                          "4px 0 0",
                                        color:
                                          "#d9b15c",
                                        fontSize: 14,
                                        fontWeight: 950,
                                      }}
                                    >
                                      {(
                                        profile?.diamond_level ??
                                        0
                                      ).toLocaleString()}
                                    </p>
                                  </div>

                                  {isRemoved ? (
                                    <RestoreSignupButton
                                      signupId={
                                        signup.id
                                      }
                                    />
                                  ) : (
                                    <RemoveSignupButton
                                      signupId={
                                        signup.id
                                      }
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer
          style={{
            marginTop: 45,
            paddingTop: 17,
            borderTop:
              "1px solid rgba(201,151,50,0.08)",
            display: "flex",
            justifyContent:
              "space-between",
            gap: 12,
            flexWrap: "wrap",
            color:
              "rgba(247,241,232,0.14)",
            fontSize: 8,
            fontWeight: 900,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          <span>Royals Bloodline</span>
          <span>
            Crown Link · Event Management
          </span>
        </footer>
      </div>
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p style={sectionEyebrowStyle}>
        {eyebrow}
      </p>

      <h3
        style={{
          margin: "5px 0 0",
          color: "#f9f4ed",
          fontSize: 17,
          fontWeight: 950,
          letterSpacing: -0.3,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: "6px 0 0",
          color:
            "rgba(247,241,232,0.29)",
          fontSize: 10,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    </div>
  );
}

function SummaryStat({
  value,
  label,
  featured = false,
  danger = false,
}: {
  value: string;
  label: string;
  featured?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        minWidth: 74,
        padding: "9px 11px",
        borderRadius: 12,
        textAlign: "center",
        border: danger
          ? "1px solid rgba(180,65,65,0.18)"
          : featured
            ? "1px solid rgba(201,151,50,0.20)"
            : "1px solid rgba(255,255,255,0.06)",
        background: danger
          ? "rgba(95,10,15,0.12)"
          : featured
            ? "rgba(201,151,50,0.05)"
            : "rgba(0,0,0,0.26)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: danger
            ? "#d88b8b"
            : featured
              ? "#d9b15c"
              : "#f9f4ed",
          fontSize: 17,
          fontWeight: 950,
        }}
      >
        {value}
      </p>

      <p
        style={{
          margin: "3px 0 0",
          color:
            "rgba(247,241,232,0.25)",
          fontSize: 7,
          fontWeight: 900,
          letterSpacing: 0.8,
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
    </div>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "#d9b15c",
  fontSize: 7,
  fontWeight: 950,
  letterSpacing: 1.8,
  textTransform: "uppercase" as const,
};

const sectionEyebrowStyle = {
  margin: 0,
  color: "#c99732",
  fontSize: 7,
  fontWeight: 950,
  letterSpacing: 1.9,
  textTransform: "uppercase" as const,
};

const backButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "7px 10px",
  borderRadius: 999,
  border:
    "1px solid rgba(201,151,50,0.13)",
  background: "rgba(0,0,0,0.28)",
  color: "#d9b15c",
  textDecoration: "none",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: 0.5,
  textTransform: "uppercase" as const,
};

const countPillStyle = {
  padding: "6px 10px",
  borderRadius: 999,
  border:
    "1px solid rgba(201,151,50,0.14)",
  background:
    "rgba(201,151,50,0.04)",
  color: "#d9b15c",
  fontSize: 8,
  fontWeight: 900,
};

const activeBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 8px",
  borderRadius: 999,
  border:
    "1px solid rgba(201,151,50,0.18)",
  background:
    "rgba(201,151,50,0.045)",
  color: "#d9b15c",
  fontSize: 7,
  fontWeight: 950,
  letterSpacing: 1.1,
  textTransform: "uppercase" as const,
};

const removedBadgeStyle = {
  padding: "4px 7px",
  borderRadius: 999,
  border:
    "1px solid rgba(180,65,65,0.2)",
  background: "rgba(95,10,15,0.14)",
  color: "#d88b8b",
  fontSize: 7,
  fontWeight: 950,
  letterSpacing: 0.9,
  textTransform: "uppercase" as const,
};

const scheduleTimeStyle = {
  padding: "7px 10px",
  borderRadius: 999,
  border:
    "1px solid rgba(201,151,50,0.14)",
  background:
    "rgba(201,151,50,0.04)",
  color: "#d9b15c",
  fontSize: 9,
  fontWeight: 900,
};

const mutedMessageStyle = {
  margin: "14px 0 0",
  color: "rgba(247,241,232,0.27)",
  fontSize: 10,
};

const emptyStateStyle = {
  padding: 22,
  borderRadius: 18,
  border:
    "1px dashed rgba(201,151,50,0.16)",
  background:
    "rgba(10,8,8,0.72)",
  color: "rgba(247,241,232,0.32)",
  fontSize: 11,
};