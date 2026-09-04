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
    .select("role, status")
    .eq("user_id", user.id)
    .single();

  if (
    !userRole ||
    userRole.role !== "admin" ||
    userRole.status !== "active"
  ) {
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
    (events ?? []).find((event) => event.id === selectedEventId) ?? null;

  const availableDates = selectedEvent
    ? eventDates.filter((date) => date.event_id === selectedEvent.id)
    : [];

  const selectedDate =
    availableDates.find((date) => date.id === selectedDateId) ?? null;

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
    profiles.map((profile) => [profile.user_id, profile])
  );

  const sortedMatches = [...matches].sort((a, b) => {
    const aTime = a.schedule_slot_id
      ? slotMap.get(a.schedule_slot_id)?.slot_time ?? "99:99:99"
      : "99:99:99";

    const bTime = b.schedule_slot_id
      ? slotMap.get(b.schedule_slot_id)?.slot_time ?? "99:99:99"
      : "99:99:99";

    return aTime.localeCompare(bTime);
  });

  function creatorLabel(userId: string) {
    const profile = profileMap.get(userId);

    if (profile?.tiktok_username) {
      return `@${profile.tiktok_username}`;
    }

    return profile?.display_name?.trim() || "Creator";
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
        background:
          "radial-gradient(circle at top, #4b0d12 0%, #180607 35%, #050505 75%)",
        color: "white",
        padding: "40px 20px",
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
          href="/crownlink/admin"
          style={{
            color: "#d3a33c",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          ← Back to Admin Center
        </Link>

        <div
          style={{
            marginTop: 24,
            marginBottom: 28,
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
            Battle Schedule Export
          </h1>

          <p
            style={{
              marginTop: 10,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.6,
            }}
          >
            Choose an event and battle date to preview the schedule for that night.
          </p>
        </div>

        <form
          method="GET"
          style={{
            padding: 22,
            borderRadius: 18,
            border: "1px solid rgba(211,163,60,0.22)",
            background: "rgba(20,10,10,0.78)",
            display: "grid",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <label
            style={{
              display: "grid",
              gap: 7,
              fontSize: 12,
              fontWeight: 800,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            Event
            <select
              name="eventId"
              defaultValue={selectedEventId}
              style={selectStyle}
            >
              <option value="">Choose an event</option>
              {(events ?? []).map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </label>

          {selectedEvent && (
            <label
              style={{
                display: "grid",
                gap: 7,
                fontSize: 12,
                fontWeight: 800,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              Battle Date
              <select
                name="dateId"
                defaultValue={selectedDateId}
                style={selectStyle}
              >
                <option value="">Choose a battle date</option>
                {availableDates.map((date) => (
                  <option key={date.id} value={date.id}>
                    {formatDate(date.event_date)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            type="submit"
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px solid rgba(211,163,60,0.28)",
              background: "rgba(211,163,60,0.1)",
              color: "#d3a33c",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Preview Schedule
          </button>
        </form>

        {selectedEvent && selectedDate && (
          <>
            {sortedMatches.length > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginBottom: 14,
                  flexWrap: "wrap",
                }}
              >
                <DownloadScheduleImage
                  targetId="crownlink-schedule-export-card"
                  eventName={selectedEvent.name}
                  dateLabel={selectedDate.event_date}
                />

                <DownloadSchedulePdf
                  targetId="crownlink-schedule-export-card"
                  eventName={selectedEvent.name}
                  dateLabel={selectedDate.event_date}
                />
              </div>
            )}

            <section
              id="crownlink-schedule-export-card"
              style={{
              borderRadius: 22,
              border: "1px solid rgba(211,163,60,0.25)",
              background:
                "linear-gradient(180deg, rgba(34,10,10,0.98), rgba(8,8,8,0.98))",
              overflow: "hidden",
              boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
            }}
          >
            <div
              style={{
                padding: "28px 24px 22px",
                textAlign: "center",
                borderBottom: "1px solid rgba(211,163,60,0.18)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#d3a33c",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 3,
                }}
              >
                CROWN LINK
              </p>

              <h2
                style={{
                  margin: "10px 0 0",
                  fontSize: 30,
                  fontWeight: 900,
                }}
              >
                {selectedEvent.name}
              </h2>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "rgba(255,255,255,0.58)",
                  fontSize: 14,
                }}
              >
                {formatDate(selectedDate.event_date)}
              </p>
            </div>

            {sortedMatches.length === 0 ? (
              <div
                style={{
                  padding: 28,
                  textAlign: "center",
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                No approved battles are scheduled for this date.
              </div>
            ) : (
              <div
                style={{
                  padding: 22,
                  display: "grid",
                  gap: 11,
                }}
              >
                {sortedMatches.map((match) => {
                  const slot = match.schedule_slot_id
                    ? slotMap.get(match.schedule_slot_id)
                    : null;

                  return (
                    <div
                      key={match.id}
                      style={{
                        padding: "15px 16px",
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.035)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        display: "grid",
                        gridTemplateColumns: "90px 1fr",
                        gap: 14,
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          color: "#d3a33c",
                          fontSize: 14,
                          fontWeight: 900,
                        }}
                      >
                        {slot
                          ? formatTime(slot.slot_time)
                          : "TBD"}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 12,
                          alignItems: "center",
                          flexWrap: "wrap",
                          fontSize: 15,
                          fontWeight: 900,
                          textAlign: "center",
                        }}
                      >
                        <span>{creatorLabel(match.creator_one_id)}</span>
                        <span
                          style={{
                            color: "#d3a33c",
                            fontSize: 11,
                            letterSpacing: 1,
                          }}
                        >
                          VS
                        </span>
                        <span>{creatorLabel(match.creator_two_id)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div
              style={{
                padding: "15px 20px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                textAlign: "center",
                color: "rgba(255,255,255,0.35)",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              Powered by Crown Link • Royals Bloodline
            </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

const selectStyle = {
  width: "100%",
  padding: "12px 13px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#120707",
  color: "white",
  fontSize: 13,
};
