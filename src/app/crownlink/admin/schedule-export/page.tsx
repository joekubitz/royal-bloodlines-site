import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import DownloadScheduleImage from "./DownloadScheduleImage";
import DownloadSchedulePdf from "./DownloadSchedulePdf";

type PageProps = {
  searchParams: Promise<{
    eventId?: string;
    dateId?: string;
  }>;
};

export default async function CrownLinkScheduleExportPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const selectedEventId = params.eventId ?? "";
  const selectedDateId = params.dateId ?? "";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/crownlink/login");
  }

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role, status, can_export_schedule")
    .eq("user_id", user.id)
    .single();

  const canExportSchedule =
    userRole?.status === "active" &&
    (userRole.role === "admin" ||
      userRole.can_export_schedule === true);

  if (!canExportSchedule) {
    redirect("/crownlink");
  }

  const adminSupabase = createAdminClient();

  const { data: events } = await adminSupabase
    .from("crownlink_events")
    .select(`
      id,
      name,
      event_date,
      event_time,
      status
    `)
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });

  const eventIds = (events ?? []).map((event) => event.id);

  let eventDates: {
    id: string;
    event_id: string;
    event_date: string;
  }[] = [];

  if (eventIds.length > 0) {
    const { data } = await adminSupabase
      .from("crownlink_event_dates")
      .select(`
        id,
        event_id,
        event_date
      `)
      .in("event_id", eventIds)
      .order("event_date", { ascending: true });

    eventDates = data ?? [];
  }

  const selectedEvent =
    (events ?? []).find(
      (event) => event.id === selectedEventId
    ) ?? null;

  const availableDates = selectedEvent
    ? eventDates.filter(
        (date) => date.event_id === selectedEvent.id
      )
    : [];

  const selectedDate =
    availableDates.find(
      (date) => date.id === selectedDateId
    ) ?? null;

  let matches: {
    id: string;
    creator_one_id: string;
    creator_two_id: string;
    schedule_slot_id: string | null;
  }[] = [];

  let scheduleSlots: {
    id: string;
    slot_time: string;
  }[] = [];

  let profiles: {
    user_id: string;
    display_name: string | null;
    tiktok_username: string;
  }[] = [];

  if (selectedEvent && selectedDate) {
    const { data: matchData } = await adminSupabase
      .from("crownlink_matches")
      .select(`
        id,
        creator_one_id,
        creator_two_id,
        schedule_slot_id
      `)
      .eq("event_id", selectedEvent.id)
      .eq("event_date_id", selectedDate.id)
      .eq("status", "approved");

    matches = matchData ?? [];

    const slotIds = Array.from(
      new Set(
        matches
          .map((match) => match.schedule_slot_id)
          .filter(Boolean)
      )
    ) as string[];

    if (slotIds.length > 0) {
      const { data } = await adminSupabase
        .from("crownlink_schedule_slots")
        .select(`
          id,
          slot_time
        `)
        .in("id", slotIds)
        .order("slot_time", { ascending: true });

      scheduleSlots = data ?? [];
    }

    const creatorIds = Array.from(
      new Set(
        matches.flatMap((match) => [
          match.creator_one_id,
          match.creator_two_id,
        ])
      )
    );

    if (creatorIds.length > 0) {
      const { data } = await adminSupabase
        .from("crownlink_profiles")
        .select(`
          user_id,
          display_name,
          tiktok_username
        `)
        .in("user_id", creatorIds);

      profiles = data ?? [];
    }
  }

  const slotMap = new Map(
    scheduleSlots.map((slot) => [slot.id, slot])
  );

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.user_id,
      profile,
    ])
  );

  const sortedMatches = [...matches].sort((a, b) => {
    const aTime = a.schedule_slot_id
      ? slotMap.get(a.schedule_slot_id)?.slot_time ??
        "99:99:99"
      : "99:99:99";

    const bTime = b.schedule_slot_id
      ? slotMap.get(b.schedule_slot_id)?.slot_time ??
        "99:99:99"
      : "99:99:99";

    return aTime.localeCompare(bTime);
  });

  function creatorLabel(userId: string) {
    const profile = profileMap.get(userId);

    if (profile?.tiktok_username) {
      return `@${profile.tiktok_username}`;
    }

    return (
      profile?.display_name?.trim() || "Creator"
    );
  }

  function formatDate(dateString: string) {
    const date = new Date(
      `${dateString}T12:00:00`
    );

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
              Schedule Export
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
              Build a shareable nightly battle
              schedule and export it as an image
              or PDF.
            </p>
          </div>
        </section>

        {/* SCHEDULE BUILDER */}
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
            marginBottom: 25,
          }}
        >
          <div>
            <p style={sectionEyebrowStyle}>
              Export Builder
            </p>

            <h2
              style={{
                margin: "5px 0 0",
                color: "#f9f4ed",
                fontSize: 18,
                fontWeight: 950,
              }}
            >
              Choose Schedule
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                color:
                  "rgba(247,241,232,0.29)",
                fontSize: 10,
                lineHeight: 1.5,
              }}
            >
              Select an event first, then choose
              the required battle date you want
              to export.
            </p>
          </div>

          <form
            method="GET"
            style={{
              marginTop: 17,
              paddingTop: 17,
              borderTop:
                "1px solid rgba(201,151,50,0.08)",
              display: "grid",
              gap: 13,
            }}
          >
            <label style={labelStyle}>
              <span style={fieldLabelStyle}>
                Event
              </span>

              <select
                name="eventId"
                defaultValue={selectedEventId}
                style={selectStyle}
              >
                <option value="">
                  Choose an event
                </option>

                {(events ?? []).map((event) => (
                  <option
                    key={event.id}
                    value={event.id}
                  >
                    {event.name}
                  </option>
                ))}
              </select>
            </label>

            {selectedEvent && (
              <label style={labelStyle}>
                <span style={fieldLabelStyle}>
                  Battle Date
                </span>

                <select
                  name="dateId"
                  defaultValue={selectedDateId}
                  style={selectStyle}
                >
                  <option value="">
                    Choose a battle date
                  </option>

                  {availableDates.map((date) => (
                    <option
                      key={date.id}
                      value={date.id}
                    >
                      {formatDate(
                        date.event_date
                      )}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="submit"
              style={{
                marginTop: 2,
                padding: "12px 16px",
                borderRadius: 11,
                border:
                  "1px solid rgba(232,111,0,0.38)",
                background:
                  "linear-gradient(135deg, #e86f00, #a93e00)",
                color: "#fff8ef",
                fontSize: 10,
                fontWeight: 950,
                letterSpacing: 0.7,
                textTransform: "uppercase",
                cursor: "pointer",
                boxShadow:
                  "0 10px 24px rgba(232,111,0,0.12)",
              }}
            >
              Preview Schedule
            </button>
          </form>
        </section>

        {/* NO DATE SELECTED */}
        {selectedEvent && !selectedDate && (
          <div style={infoStateStyle}>
            <div
              style={infoIconStyle}
            >
              ↓
            </div>

            <div>
              <p
                style={{
                  margin: 0,
                  color: "#f9f4ed",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                Choose a battle date
              </p>

              <p
                style={{
                  margin: "4px 0 0",
                  color:
                    "rgba(247,241,232,0.28)",
                  fontSize: 9,
                }}
              >
                Select one of the required dates
                above to build the nightly
                schedule.
              </p>
            </div>
          </div>
        )}

        {selectedEvent && selectedDate && (
          <>
            {/* EXPORT TOOLBAR */}
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <div>
                <p style={sectionEyebrowStyle}>
                  Schedule Preview
                </p>

                <p
                  style={{
                    margin: "4px 0 0",
                    color:
                      "rgba(247,241,232,0.34)",
                    fontSize: 9,
                  }}
                >
                  {sortedMatches.length}{" "}
                  {sortedMatches.length === 1
                    ? "battle"
                    : "battles"}{" "}
                  scheduled
                </p>
              </div>

              {sortedMatches.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "flex-end",
                    gap: 9,
                    flexWrap: "wrap",
                  }}
                >
                  <DownloadScheduleImage
                    targetId="crownlink-schedule-export-card"
                    eventName={
                      selectedEvent.name
                    }
                    dateLabel={
                      selectedDate.event_date
                    }
                  />

                  <DownloadSchedulePdf
                    targetId="crownlink-schedule-export-card"
                    eventName={
                      selectedEvent.name
                    }
                    dateLabel={
                      selectedDate.event_date
                    }
                  />
                </div>
              )}
            </div>

            {/* IMPORTANT:
                Keep this ID unchanged.
                Both export components target it.
            */}
            <section
              id="crownlink-schedule-export-card"
              style={{
                overflow: "hidden",
                borderRadius: 22,
                border:
                  "1px solid rgba(201,151,50,0.25)",
                background:
                  "linear-gradient(180deg, #180707 0%, #0b0808 43%, #050505 100%)",
                boxShadow:
                  "0 24px 70px rgba(0,0,0,0.48)",
              }}
            >
              {/* EXPORT CARD HEADER */}
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  padding:
                    "28px 24px 23px",
                  textAlign: "center",
                  borderBottom:
                    "1px solid rgba(201,151,50,0.16)",
                  background: `
                    radial-gradient(circle at 50% -70%, rgba(130,17,12,0.55), transparent 55%),
                    linear-gradient(180deg, rgba(48,5,9,0.78), rgba(13,7,7,0.58))
                  `,
                }}
              >
                <div
                  style={{
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      margin: "0 auto 10px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border:
                        "1px solid rgba(201,151,50,0.25)",
                      background:
                        "rgba(201,151,50,0.055)",
                      color: "#d9b15c",
                      fontSize: 15,
                    }}
                  >
                    ♛
                  </div>

                  <p
                    style={{
                      margin: 0,
                      color: "#d9b15c",
                      fontSize: 8,
                      fontWeight: 950,
                      letterSpacing: 2.8,
                      textTransform:
                        "uppercase",
                    }}
                  >
                    Crown Link
                  </p>

                  <h2
                    style={{
                      margin: "9px 0 0",
                      color: "#f9f4ed",
                      fontSize:
                        "clamp(23px,4vw,30px)",
                      fontWeight: 950,
                      letterSpacing: -0.6,
                    }}
                  >
                    {selectedEvent.name}
                  </h2>

                  <p
                    style={{
                      margin: "7px 0 0",
                      color:
                        "rgba(247,241,232,0.52)",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {formatDate(
                      selectedDate.event_date
                    )}
                  </p>

                  <div
                    style={{
                      display: "inline-flex",
                      marginTop: 11,
                      padding: "5px 9px",
                      borderRadius: 999,
                      border:
                        "1px solid rgba(201,151,50,0.13)",
                      background:
                        "rgba(201,151,50,0.035)",
                      color:
                        "rgba(217,177,92,0.72)",
                      fontSize: 7,
                      fontWeight: 900,
                      letterSpacing: 1,
                      textTransform:
                        "uppercase",
                    }}
                  >
                    Official Battle Schedule
                  </div>
                </div>
              </div>

              {sortedMatches.length === 0 ? (
                <div
                  style={{
                    padding: "34px 25px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#f9f4ed",
                      fontSize: 13,
                      fontWeight: 900,
                    }}
                  >
                    No approved battles
                  </p>

                  <p
                    style={{
                      margin: "6px 0 0",
                      color:
                        "rgba(247,241,232,0.28)",
                      fontSize: 10,
                    }}
                  >
                    No approved battles are
                    scheduled for this date.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    padding: 20,
                    display: "grid",
                    gap: 9,
                  }}
                >
                  {sortedMatches.map(
                    (match, index) => {
                      const slot =
                        match.schedule_slot_id
                          ? slotMap.get(
                              match.schedule_slot_id
                            )
                          : null;

                      return (
                        <div
                          key={match.id}
                          style={{
                            minHeight: 64,
                            padding:
                              "12px 14px",
                            borderRadius: 13,
                            background:
                              index % 2 === 0
                                ? "rgba(255,255,255,0.028)"
                                : "rgba(201,151,50,0.022)",
                            border:
                              "1px solid rgba(255,255,255,0.055)",
                            display: "grid",
                            gridTemplateColumns:
                              "80px minmax(0, 1fr)",
                            gap: 14,
                            alignItems:
                              "center",
                          }}
                        >
                          {/* TIME */}
                          <div
                            style={{
                              alignSelf:
                                "stretch",
                              display: "flex",
                              flexDirection:
                                "column",
                              justifyContent:
                                "center",
                              paddingRight: 12,
                              borderRight:
                                "1px solid rgba(201,151,50,0.10)",
                            }}
                          >
                            <span
                              style={{
                                color:
                                  "rgba(247,241,232,0.18)",
                                fontSize: 6,
                                fontWeight: 950,
                                letterSpacing:
                                  1.1,
                                textTransform:
                                  "uppercase",
                              }}
                            >
                              Battle Time
                            </span>

                            <span
                              style={{
                                marginTop: 4,
                                color:
                                  "#d9b15c",
                                fontSize: 13,
                                fontWeight: 950,
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {slot
                                ? formatTime(
                                    slot.slot_time
                                  )
                                : "TBD"}
                            </span>
                          </div>

                          {/* MATCHUP */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "minmax(0,1fr) auto minmax(0,1fr)",
                              gap: 10,
                              alignItems:
                                "center",
                              textAlign:
                                "center",
                            }}
                          >
                            <span
                              style={{
                                minWidth: 0,
                                color:
                                  "#f9f4ed",
                                fontSize: 12,
                                fontWeight: 900,
                                overflowWrap:
                                  "anywhere",
                              }}
                            >
                              {creatorLabel(
                                match.creator_one_id
                              )}
                            </span>

                            <span
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius:
                                  "50%",
                                display: "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                flexShrink: 0,
                                border:
                                  "1px solid rgba(232,111,0,0.22)",
                                background:
                                  "rgba(232,111,0,0.055)",
                                color:
                                  "#e86f00",
                                fontSize: 7,
                                fontWeight: 950,
                                letterSpacing:
                                  0.4,
                              }}
                            >
                              VS
                            </span>

                            <span
                              style={{
                                minWidth: 0,
                                color:
                                  "#f9f4ed",
                                fontSize: 12,
                                fontWeight: 900,
                                overflowWrap:
                                  "anywhere",
                              }}
                            >
                              {creatorLabel(
                                match.creator_two_id
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}

              {/* EXPORT CARD FOOTER */}
              <div
                style={{
                  padding: "13px 20px",
                  borderTop:
                    "1px solid rgba(201,151,50,0.08)",
                  textAlign: "center",
                  background:
                    "rgba(0,0,0,0.18)",
                  color:
                    "rgba(247,241,232,0.18)",
                  fontSize: 7,
                  fontWeight: 900,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                Royals Bloodline · Powered by
                Crown Link
              </div>
            </section>
          </>
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
            Crown Link · Schedule Export
          </span>
        </footer>
      </div>
    </main>
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

const labelStyle = {
  display: "grid",
  gap: 7,
};

const fieldLabelStyle = {
  color: "rgba(247,241,232,0.5)",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: 1.2,
  textTransform: "uppercase" as const,
};

const selectStyle = {
  width: "100%",
  padding: "12px 13px",
  borderRadius: 11,
  border:
    "1px solid rgba(201,151,50,0.12)",
  outline: "none",
  background: "#0d0808",
  color: "#f9f4ed",
  fontSize: 11,
  fontWeight: 700,
};

const infoStateStyle = {
  padding: "14px 16px",
  borderRadius: 14,
  border:
    "1px solid rgba(201,151,50,0.10)",
  background: "rgba(201,151,50,0.025)",
  display: "flex",
  alignItems: "center",
  gap: 11,
};

const infoIconStyle = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  border:
    "1px solid rgba(201,151,50,0.14)",
  color: "#c99732",
  fontSize: 12,
};