import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export default async function CrownLinkResultsPage() {
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

  const { data: events, error: eventsError } = await adminSupabase
    .from("crownlink_events")
    .select(`
      id,
      name,
      event_date,
      event_time,
      status,
      created_at
    `)
    .eq("status", "archived")
    .order("event_date", { ascending: false })
    .order("event_time", { ascending: false });

  if (eventsError) {
    console.error("ARCHIVED EVENTS ERROR:", eventsError);
  }

  const eventIds = (events ?? []).map((event) => event.id);

  let matches: {
    id: string;
    event_id: string;
    status: string;
  }[] = [];

  let attendance: {
    match_id: string;
    status: string;
  }[] = [];

  let results: {
    match_id: string;
    creator_one_score: number | null;
    creator_two_score: number | null;
  }[] = [];

  if (eventIds.length > 0) {
    const { data: matchData } = await adminSupabase
      .from("crownlink_matches")
      .select(`
        id,
        event_id,
        status
      `)
      .in("event_id", eventIds)
      .eq("status", "approved");

    matches = matchData ?? [];

    const matchIds = matches.map((match) => match.id);

    if (matchIds.length > 0) {
      const { data: attendanceData } = await adminSupabase
        .from("crownlink_match_attendance")
        .select(`
          match_id,
          status
        `)
        .in("match_id", matchIds);

      attendance = attendanceData ?? [];

      const { data: resultsData } = await adminSupabase
        .from("crownlink_match_results")
        .select(`
          match_id,
          creator_one_score,
          creator_two_score
        `)
        .in("match_id", matchIds);

      results = resultsData ?? [];
    }
  }

  const attendanceByMatch = new Map<string, typeof attendance>();

  for (const row of attendance) {
    const current = attendanceByMatch.get(row.match_id) ?? [];
    current.push(row);
    attendanceByMatch.set(row.match_id, current);
  }

  const resultsByMatch = new Map(
    results.map((result) => [result.match_id, result])
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
            Past Events & Results
          </h1>

          <p
            style={{
              marginTop: 10,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.6,
            }}
          >
            Review archived events, battle completion, attendance issues,
            replacements, and recorded results.
          </p>
        </div>

        {!events || events.length === 0 ? (
          <div
            style={{
              padding: 26,
              borderRadius: 18,
              border: "1px solid rgba(211,163,60,0.2)",
              background: "rgba(20,10,10,0.75)",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            No archived events yet.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            {events.map((event) => {
              const eventMatches = matches.filter(
                (match) => match.event_id === event.id
              );

              let completedCount = 0;
              let noShowCount = 0;
              let replacementCount = 0;

              for (const match of eventMatches) {
                const matchAttendance =
                  attendanceByMatch.get(match.id) ?? [];

                const result = resultsByMatch.get(match.id);

                const hasNoShow = matchAttendance.some(
                  (row) => row.status === "no_show"
                );

                const hasReplacement = matchAttendance.some(
                  (row) => row.status === "replacement"
                );

                const attendanceComplete =
                  matchAttendance.filter(
                    (row) => row.status !== "unmarked"
                  ).length >= 2;

                const scoresComplete =
                  result?.creator_one_score !== null &&
                  result?.creator_one_score !== undefined &&
                  result?.creator_two_score !== null &&
                  result?.creator_two_score !== undefined;

                if (attendanceComplete && (scoresComplete || hasNoShow)) {
                  completedCount += 1;
                }

                if (hasNoShow) {
                  noShowCount += 1;
                }

                if (hasReplacement) {
                  replacementCount += 1;
                }
              }

              return (
                <div
                  key={event.id}
                  style={{
                    padding: 24,
                    borderRadius: 20,
                    border: "1px solid rgba(211,163,60,0.22)",
                    background: "rgba(20,10,10,0.78)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 20,
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
                        Archived Event
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
                          margin: "8px 0 0",
                          color: "rgba(255,255,255,0.5)",
                          fontSize: 13,
                        }}
                      >
                        {formatDate(event.event_date)}
                      </p>
                    </div>

                    <Link
                      href={`/crownlink/admin/results/${event.id}`}
                      style={{
                        padding: "11px 15px",
                        borderRadius: 10,
                        border: "1px solid rgba(211,163,60,0.28)",
                        background: "rgba(211,163,60,0.1)",
                        color: "#d3a33c",
                        textDecoration: "none",
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      View Event Results
                    </Link>
                  </div>

                  <div
                    style={{
                      marginTop: 20,
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(130px, 1fr))",
                      gap: 10,
                    }}
                  >
                    <StatCard
                      value={eventMatches.length}
                      label="Battles"
                    />

                    <StatCard
                      value={`${completedCount}/${eventMatches.length}`}
                      label="Completed"
                    />

                    <StatCard
                      value={noShowCount}
                      label="No Shows"
                    />

                    <StatCard
                      value={replacementCount}
                      label="Replacements"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({
  value,
  label,
}: {
  value: number | string;
  label: string;
}) {
  return (
    <div
      style={{
        padding: "14px 12px",
        borderRadius: 12,
        background: "rgba(0,0,0,0.18)",
        border: "1px solid rgba(255,255,255,0.06)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 21,
          fontWeight: 900,
          color: "#d3a33c",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 4,
          color: "rgba(255,255,255,0.45)",
          fontSize: 10,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        {label}
      </div>
    </div>
  );
}
