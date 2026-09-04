import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

type PageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export default async function CrownLinkEventResultsPage({
  params,
}: PageProps) {
  const { eventId } = await params;

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

  const { data: event } = await adminSupabase
    .from("crownlink_events")
    .select(`
      id,
      name,
      event_date,
      event_time,
      status
    `)
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    notFound();
  }

  const { data: matches } = await adminSupabase
    .from("crownlink_matches")
    .select(`
      id,
      event_id,
      creator_one_id,
      creator_two_id,
      status,
      event_date_id,
      schedule_slot_id,
      created_at
    `)
    .eq("event_id", eventId)
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  const matchIds = (matches ?? []).map((match) => match.id);

  const creatorIds = Array.from(
    new Set(
      (matches ?? []).flatMap((match) => [
        match.creator_one_id,
        match.creator_two_id,
      ])
    )
  );

  const eventDateIds = Array.from(
    new Set(
      (matches ?? [])
        .map((match) => match.event_date_id)
        .filter(Boolean)
    )
  ) as string[];

  const slotIds = Array.from(
    new Set(
      (matches ?? [])
        .map((match) => match.schedule_slot_id)
        .filter(Boolean)
    )
  ) as string[];

  let profiles: {
    user_id: string;
    display_name: string | null;
    tiktok_username: string;
  }[] = [];

  let eventDates: {
    id: string;
    event_date: string;
  }[] = [];

  let scheduleSlots: {
    id: string;
    slot_time: string;
  }[] = [];

  let attendance: {
    match_id: string;
    creator_id: string;
    status: string;
    replacement_user_id: string | null;
    replacement_name: string | null;
    admin_notes: string | null;
  }[] = [];

  let results: {
    match_id: string;
    creator_one_score: number | null;
    creator_two_score: number | null;
    score_screenshot_url: string | null;
    admin_notes: string | null;
  }[] = [];

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

  if (eventDateIds.length > 0) {
    const { data } = await adminSupabase
      .from("crownlink_event_dates")
      .select(`
        id,
        event_date
      `)
      .in("id", eventDateIds);

    eventDates = data ?? [];
  }

  if (slotIds.length > 0) {
    const { data } = await adminSupabase
      .from("crownlink_schedule_slots")
      .select(`
        id,
        slot_time
      `)
      .in("id", slotIds);

    scheduleSlots = data ?? [];
  }

  if (matchIds.length > 0) {
    const { data: attendanceData } = await adminSupabase
      .from("crownlink_match_attendance")
      .select(`
        match_id,
        creator_id,
        status,
        replacement_user_id,
        replacement_name,
        admin_notes
      `)
      .in("match_id", matchIds);

    attendance = attendanceData ?? [];

    const { data: resultsData } = await adminSupabase
      .from("crownlink_match_results")
      .select(`
        match_id,
        creator_one_score,
        creator_two_score,
        score_screenshot_url,
        admin_notes
      `)
      .in("match_id", matchIds);

    results = resultsData ?? [];
  }

  const profileMap = new Map(
    profiles.map((profile) => [profile.user_id, profile])
  );

  const eventDateMap = new Map(
    eventDates.map((date) => [date.id, date])
  );

  const slotMap = new Map(
    scheduleSlots.map((slot) => [slot.id, slot])
  );

  const attendanceMap = new Map(
    attendance.map((row) => [
      `${row.match_id}:${row.creator_id}`,
      row,
    ])
  );

  const resultMap = new Map(
    results.map((result) => [result.match_id, result])
  );

  function getCreator(userId: string) {
    const profile = profileMap.get(userId);

    return {
      name:
        profile?.display_name?.trim() ||
        (profile?.tiktok_username
          ? `@${profile.tiktok_username}`
          : "Creator"),
      username: profile?.tiktok_username ?? "",
    };
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

  function attendanceLabel(status?: string) {
    switch (status) {
      case "attended":
        return "Attended";
      case "no_show":
        return "No Show";
      case "replacement":
        return "Replacement";
      default:
        return "Unmarked";
    }
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
          href="/crownlink/admin/results"
          style={{
            color: "#d3a33c",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          ← Back to Past Events & Results
        </Link>

        <div
          style={{
            marginTop: 24,
            marginBottom: 28,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#d3a33c",
              letterSpacing: 4,
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            EVENT RESULTS
          </p>

          <h1
            style={{
              margin: "9px 0 0",
              fontSize: 38,
              fontWeight: 900,
            }}
          >
            {event.name}
          </h1>

          <p
            style={{
              margin: "9px 0 0",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            {formatDate(event.event_date)} • {matches?.length ?? 0} battles
          </p>
        </div>

        {!matches || matches.length === 0 ? (
          <div
            style={{
              padding: 24,
              borderRadius: 18,
              border: "1px solid rgba(211,163,60,0.2)",
              background: "rgba(20,10,10,0.75)",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            No approved battles were recorded for this event.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            {matches.map((match) => {
              const creatorOne = getCreator(match.creator_one_id);
              const creatorTwo = getCreator(match.creator_two_id);

              const creatorOneAttendance = attendanceMap.get(
                `${match.id}:${match.creator_one_id}`
              );

              const creatorTwoAttendance = attendanceMap.get(
                `${match.id}:${match.creator_two_id}`
              );

              const result = resultMap.get(match.id);

              const matchDate = match.event_date_id
                ? eventDateMap.get(match.event_date_id)
                : null;

              const matchSlot = match.schedule_slot_id
                ? slotMap.get(match.schedule_slot_id)
                : null;

              const hasNoShow =
                creatorOneAttendance?.status === "no_show" ||
                creatorTwoAttendance?.status === "no_show";

              const hasReplacement =
                creatorOneAttendance?.status === "replacement" ||
                creatorTwoAttendance?.status === "replacement";

              const hasScores =
                result?.creator_one_score !== null &&
                result?.creator_one_score !== undefined &&
                result?.creator_two_score !== null &&
                result?.creator_two_score !== undefined;

              const statusText = hasNoShow
                ? "No Show"
                : hasReplacement
                  ? "Replacement Used"
                  : hasScores
                    ? "Results Recorded"
                    : "Needs Results";

              return (
                <div
                  key={match.id}
                  style={{
                    padding: 22,
                    borderRadius: 18,
                    border: "1px solid rgba(211,163,60,0.18)",
                    background: "rgba(20,10,10,0.78)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "center",
                      marginBottom: 18,
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "#d3a33c",
                          fontSize: 13,
                          fontWeight: 900,
                        }}
                      >
                        {matchDate
                          ? formatDate(matchDate.event_date)
                          : "Date not assigned"}
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "rgba(255,255,255,0.5)",
                          fontSize: 12,
                        }}
                      >
                        {matchSlot
                          ? formatTime(matchSlot.slot_time)
                          : "Time not assigned"}
                      </p>
                    </div>

                    <span
                      style={{
                        padding: "7px 10px",
                        borderRadius: 999,
                        background: hasNoShow
                          ? "rgba(255,90,90,0.08)"
                          : hasReplacement
                            ? "rgba(255,150,40,0.08)"
                            : hasScores
                              ? "rgba(60,180,90,0.08)"
                              : "rgba(255,255,255,0.05)",
                        border: hasNoShow
                          ? "1px solid rgba(255,90,90,0.2)"
                          : hasReplacement
                            ? "1px solid rgba(255,150,40,0.2)"
                            : hasScores
                              ? "1px solid rgba(80,210,110,0.22)"
                              : "1px solid rgba(255,255,255,0.1)",
                        color: hasNoShow
                          ? "#ffb0b0"
                          : hasReplacement
                            ? "#ffc37d"
                            : hasScores
                              ? "#b8f5c2"
                              : "rgba(255,255,255,0.55)",
                        fontSize: 10,
                        fontWeight: 900,
                        textTransform: "uppercase",
                      }}
                    >
                      {statusText}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(230px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <CreatorResultCard
                      creator={creatorOne}
                      attendance={creatorOneAttendance}
                      score={result?.creator_one_score ?? null}
                      attendanceLabel={attendanceLabel}
                    />

                    <CreatorResultCard
                      creator={creatorTwo}
                      attendance={creatorTwoAttendance}
                      score={result?.creator_two_score ?? null}
                      attendanceLabel={attendanceLabel}
                    />
                  </div>

                  {(result?.admin_notes ||
                    creatorOneAttendance?.admin_notes ||
                    creatorTwoAttendance?.admin_notes) && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: 13,
                        borderRadius: 11,
                        background: "rgba(0,0,0,0.18)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          color: "rgba(255,255,255,0.42)",
                          fontSize: 9,
                          fontWeight: 900,
                          letterSpacing: 1,
                          textTransform: "uppercase",
                        }}
                      >
                        Admin Notes
                      </p>

                      <p
                        style={{
                          margin: "6px 0 0",
                          color: "rgba(255,255,255,0.72)",
                          fontSize: 12,
                          lineHeight: 1.5,
                        }}
                      >
                        {result?.admin_notes ||
                          creatorOneAttendance?.admin_notes ||
                          creatorTwoAttendance?.admin_notes}
                      </p>
                    </div>
                  )}

                  {result?.score_screenshot_url && (
                    <a
                      href={result.score_screenshot_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-block",
                        marginTop: 14,
                        color: "#d3a33c",
                        fontSize: 12,
                        fontWeight: 900,
                        textDecoration: "none",
                      }}
                    >
                      View Score Screenshot →
                    </a>
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

function CreatorResultCard({
  creator,
  attendance,
  score,
  attendanceLabel,
}: {
  creator: {
    name: string;
    username: string;
  };
  attendance:
    | {
        status: string;
        replacement_name: string | null;
      }
    | undefined;
  score: number | null;
  attendanceLabel: (status?: string) => string;
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        background: "rgba(0,0,0,0.18)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 900,
        }}
      >
        {creator.name}
      </p>

      {creator.username && (
        <p
          style={{
            margin: "4px 0 0",
            color: "rgba(255,255,255,0.42)",
            fontSize: 11,
          }}
        >
          @{creator.username}
        </p>
      )}

      <div
        style={{
          marginTop: 13,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "rgba(255,255,255,0.4)",
              fontSize: 9,
              fontWeight: 900,
              textTransform: "uppercase",
            }}
          >
            Attendance
          </p>

          <p
            style={{
              margin: "5px 0 0",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {attendanceLabel(attendance?.status)}
          </p>
        </div>

        <div
          style={{
            textAlign: "right",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "rgba(255,255,255,0.4)",
              fontSize: 9,
              fontWeight: 900,
              textTransform: "uppercase",
            }}
          >
            Score
          </p>

          <p
            style={{
              margin: "5px 0 0",
              color: "#d3a33c",
              fontSize: 18,
              fontWeight: 900,
            }}
          >
            {score === null ? "—" : score.toLocaleString()}
          </p>
        </div>
      </div>

      {attendance?.status === "replacement" && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 11,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "rgba(255,255,255,0.4)",
              fontSize: 9,
              fontWeight: 900,
              textTransform: "uppercase",
            }}
          >
            Replacement
          </p>

          <p
            style={{
              margin: "5px 0 0",
              color: "#ffc37d",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {attendance.replacement_name || "Replacement recorded"}
          </p>
        </div>
      )}
    </div>
  );
}
