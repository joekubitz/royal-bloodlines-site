import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export default async function CrownLinkAgentEventsPage() {
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
    !["agent", "admin"].includes(userRole.role) ||
    userRole.status !== "active"
  ) {
    redirect("/crownlink/login");
  }

  const adminSupabase = createAdminClient();

  const { data: creators, error: creatorsError } = await adminSupabase
    .from("crownlink_profiles")
    .select(`
      user_id,
      display_name,
      tiktok_username,
      diamond_level,
      profile_status
    `)
    .eq("agent_user_id", user.id)
    .eq("profile_status", "active");

  if (creatorsError) {
    console.error("CROWN LINK AGENT CREATORS ERROR:", creatorsError);
  }

  const creatorIds = creators?.map((creator) => creator.user_id) ?? [];

  let signups: {
    event_id: string;
    user_id: string;
    status: string;
  }[] = [];

  if (creatorIds.length > 0) {
    const { data, error } = await adminSupabase
      .from("crownlink_event_signups")
      .select(`
        event_id,
        user_id,
        status
      `)
      .in("user_id", creatorIds)
      .eq("status", "signed_up");

    if (error) {
      console.error("CROWN LINK AGENT SIGNUPS ERROR:", error);
    }

    signups = data ?? [];
  }

  const eventIds = Array.from(
    new Set(signups.map((signup) => signup.event_id))
  );

  let events: {
    id: string;
    name: string;
    description: string | null;
    prize_information: string | null;
    event_date: string;
    event_time: string;
    battle_interval_minutes: number | null;
    status: string;
  }[] = [];

  let eventDates: {
    id: string;
    event_id: string;
    event_date: string;
  }[] = [];

  let matches: {
    id: string;
    event_id: string;
    event_date_id: string;
    schedule_slot_id: string | null;
    creator_one_id: string;
    creator_two_id: string;
    status: string;
  }[] = [];

  let scheduleSlots: {
    id: string;
    event_id: string;
    event_date_id: string;
    slot_time: string;
  }[] = [];

  if (eventIds.length > 0) {
    const [
      { data: eventData, error: eventsError },
      { data: dateData, error: datesError },
      { data: matchData, error: matchesError },
      { data: slotData, error: slotsError },
    ] = await Promise.all([
      adminSupabase
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
        .in("id", eventIds)
        .order("event_date", { ascending: true }),

      adminSupabase
        .from("crownlink_event_dates")
        .select(`
          id,
          event_id,
          event_date
        `)
        .in("event_id", eventIds)
        .order("event_date", { ascending: true }),

      adminSupabase
        .from("crownlink_matches")
        .select(`
          id,
          event_id,
          event_date_id,
          schedule_slot_id,
          creator_one_id,
          creator_two_id,
          status
        `)
        .in("event_id", eventIds)
        .eq("status", "approved"),

      adminSupabase
        .from("crownlink_schedule_slots")
        .select(`
          id,
          event_id,
          event_date_id,
          slot_time
        `)
        .in("event_id", eventIds)
        .order("slot_time", { ascending: true }),
    ]);

    if (eventsError) {
      console.error("CROWN LINK AGENT EVENTS ERROR:", eventsError);
    }

    if (datesError) {
      console.error("CROWN LINK AGENT EVENT DATES ERROR:", datesError);
    }

    if (matchesError) {
      console.error("CROWN LINK AGENT MATCHES ERROR:", matchesError);
    }

    if (slotsError) {
      console.error("CROWN LINK AGENT SLOTS ERROR:", slotsError);
    }

    events = eventData ?? [];
    eventDates = dateData ?? [];
    matches = matchData ?? [];
    scheduleSlots = slotData ?? [];
  }

  const creatorMap = new Map(
    (creators ?? []).map((creator) => [creator.user_id, creator])
  );

  function formatDate(dateString: string) {
    return new Date(`${dateString}T12:00:00`).toLocaleDateString("en-US", {
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
        background:
          "radial-gradient(circle at top, #4b0d12 0%, #180607 35%, #050505 75%)",
        color: "white",
        padding: "40px 20px 60px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <Link
          href="/crownlink/agent"
          style={{
            color: "#d3a33c",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          ← Back to Agent Dashboard
        </Link>

        <div style={{ marginTop: 28, marginBottom: 30 }}>
          <p
            style={{
              margin: 0,
              color: "#d3a33c",
              letterSpacing: 4,
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            CROWN LINK
          </p>

          <h1
            style={{
              margin: "8px 0 0",
              fontSize: 40,
              fontWeight: 900,
            }}
          >
            Team Events & Schedules
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.6,
            }}
          >
            View the Crown Link events your creators are participating in and
            their approved battle schedules.
          </p>
        </div>

        {events.length === 0 ? (
          <div
            style={{
              padding: 24,
              borderRadius: 16,
              border: "1px solid rgba(211,163,60,0.2)",
              background: "rgba(20,10,10,0.75)",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            None of your creators are currently signed up for a Crown Link
            event.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 18 }}>
            {events.map((event) => {
              const eventSignups = signups.filter(
                (signup) => signup.event_id === event.id
              );

              const teamCreatorIds = new Set(
                eventSignups.map((signup) => signup.user_id)
              );

              const teamCreators = eventSignups
                .map((signup) => creatorMap.get(signup.user_id))
                .filter(Boolean);

              const requiredDates = eventDates.filter(
                (date) => date.event_id === event.id
              );

              const teamMatches = matches.filter(
                (match) =>
                  match.event_id === event.id &&
                  (teamCreatorIds.has(match.creator_one_id) ||
                    teamCreatorIds.has(match.creator_two_id))
              );

              return (
                <section
                  key={event.id}
                  style={{
                    padding: 24,
                    borderRadius: 18,
                    border: "1px solid rgba(211,163,60,0.2)",
                    background: "rgba(20,10,10,0.78)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "#d3a33c",
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing: 1.5,
                          textTransform: "uppercase",
                        }}
                      >
                        {event.status === "archived"
                          ? "Past Event"
                          : "Team Event"}
                      </p>

                      <h2
                        style={{
                          margin: "7px 0 0",
                          fontSize: 24,
                          fontWeight: 900,
                        }}
                      >
                        {event.name}
                      </h2>

                      <p
                        style={{
                          margin: "8px 0 0",
                          color: "rgba(255,255,255,0.48)",
                          fontSize: 13,
                        }}
                      >
                        {teamCreators.length} team creator
                        {teamCreators.length === 1 ? "" : "s"} participating
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 18,
                      padding: 16,
                      borderRadius: 14,
                      background: "rgba(211,163,60,0.045)",
                      border: "1px solid rgba(211,163,60,0.16)",
                    }}
                  >
                    <p style={labelStyle}>My Creators In This Event</p>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      {teamCreators.map((creator) =>
                        creator ? (
                          <span
                            key={creator.user_id}
                            style={{
                              padding: "7px 10px",
                              borderRadius: 999,
                              border:
                                "1px solid rgba(255,255,255,0.09)",
                              background: "rgba(0,0,0,0.22)",
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            @{creator.tiktok_username}
                          </span>
                        ) : null
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <p style={labelStyle}>Required Battle Dates</p>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      {requiredDates.map((date) => (
                        <span
                          key={date.id}
                          style={{
                            padding: "7px 10px",
                            borderRadius: 999,
                            border:
                              "1px solid rgba(211,163,60,0.16)",
                            background: "rgba(0,0,0,0.22)",
                            color: "rgba(255,255,255,0.78)",
                            fontSize: 12,
                          }}
                        >
                          {formatDate(date.event_date)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 22 }}>
                    <p style={labelStyle}>Team Battle Schedule</p>

                    {teamMatches.length === 0 ? (
                      <div
                        style={{
                          marginTop: 10,
                          padding: 14,
                          borderRadius: 12,
                          border:
                            "1px solid rgba(255,255,255,0.07)",
                          background: "rgba(0,0,0,0.18)",
                          color: "rgba(255,255,255,0.42)",
                          fontSize: 12,
                        }}
                      >
                        Battle times have not been posted yet.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gap: 9,
                          marginTop: 10,
                        }}
                      >
                        {teamMatches
                          .map((match) => {
                            const date = eventDates.find(
                              (item) => item.id === match.event_date_id
                            );

                            const slot = scheduleSlots.find(
                              (item) => item.id === match.schedule_slot_id
                            );

                            const creatorOne = creatorMap.get(
                              match.creator_one_id
                            );

                            const creatorTwo = creatorMap.get(
                              match.creator_two_id
                            );

                            const myCreator =
                              creatorOne || creatorTwo || null;

                            return {
                              match,
                              date,
                              slot,
                              myCreator,
                            };
                          })
                          .sort((a, b) => {
                            const dateCompare = (
                              a.date?.event_date || ""
                            ).localeCompare(b.date?.event_date || "");

                            if (dateCompare !== 0) {
                              return dateCompare;
                            }

                            return (
                              a.slot?.slot_time || ""
                            ).localeCompare(b.slot?.slot_time || "");
                          })
                          .map(({ match, date, slot, myCreator }) => (
                            <div
                              key={match.id}
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "minmax(150px,auto) minmax(110px,auto) minmax(0,1fr)",
                                gap: 14,
                                alignItems: "center",
                                padding: 14,
                                borderRadius: 12,
                                border:
                                  "1px solid rgba(255,255,255,0.07)",
                                background: "rgba(0,0,0,0.2)",
                              }}
                            >
                              <div>
                                <p style={labelStyle}>Date</p>
                                <p style={valueStyle}>
                                  {date
                                    ? formatDate(date.event_date)
                                    : "Date unavailable"}
                                </p>
                              </div>

                              <div>
                                <p style={labelStyle}>Time</p>
                                <p style={valueStyle}>
                                  {slot
                                    ? formatTime(slot.slot_time)
                                    : "TBD"}
                                </p>
                              </div>

                              <div>
                                <p style={labelStyle}>Creator</p>
                                <p style={valueStyle}>
                                  {myCreator
                                    ? `@${myCreator.tiktok_username}`
                                    : "Team Creator"}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

const labelStyle = {
  margin: 0,
  color: "rgba(255,255,255,0.36)",
  fontSize: 9,
  fontWeight: 900,
  textTransform: "uppercase" as const,
  letterSpacing: 1.2,
};

const valueStyle = {
  margin: "5px 0 0",
  color: "rgba(255,255,255,0.86)",
  fontSize: 12,
  fontWeight: 800,
};