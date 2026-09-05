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
        color: "#f7f1e8",
        background: `
          radial-gradient(circle at 12% 4%, rgba(88,7,12,0.40), transparent 27%),
          radial-gradient(circle at 91% 32%, rgba(116,22,0,0.08), transparent 28%),
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
            <span style={{ fontSize: 14 }}>←</span>
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
            border: "1px solid rgba(201,151,50,0.19)",
            background: `
              linear-gradient(
                130deg,
                rgba(48,5,9,0.90),
                rgba(14,10,10,0.95) 53%,
                rgba(3,3,3,0.98)
              )
            `,
            boxShadow: "0 22px 55px rgba(0,0,0,0.45)",
            marginBottom: 22,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 250,
              height: 250,
              borderRadius: "50%",
              background: "rgba(110,7,14,0.18)",
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
                border: "1px solid rgba(201,151,50,0.20)",
                background: "rgba(201,151,50,0.045)",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#c99732",
                  boxShadow: "0 0 8px rgba(201,151,50,0.55)",
                }}
              />

              <span style={eyebrowStyle}>
                Crown Link · History
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                color: "#f9f4ed",
                fontSize: "clamp(30px,5vw,42px)",
                fontWeight: 950,
                letterSpacing: -1.4,
                lineHeight: 1,
              }}
            >
              Past Events & Results
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
                maxWidth: 690,
                color: "rgba(247,241,232,0.4)",
                fontSize: 11,
                lineHeight: 1.6,
              }}
            >
              Review archived Crown Link events, completed battles,
              attendance issues, replacements, and recorded results.
            </p>
          </div>
        </section>

        {/* ARCHIVE SUMMARY */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
            marginBottom: 24,
          }}
        >
          <ArchiveSummaryCard
            value={(events ?? []).length}
            label="Archived Events"
            icon="♛"
          />

          <ArchiveSummaryCard
            value={matches.length}
            label="Archived Battles"
            icon="VS"
          />

          <ArchiveSummaryCard
            value={
              attendance.filter(
                (row) => row.status === "no_show"
              ).length
            }
            label="No Show Records"
            icon="!"
          />

          <ArchiveSummaryCard
            value={
              attendance.filter(
                (row) => row.status === "replacement"
              ).length
            }
            label="Replacement Records"
            icon="↻"
          />
        </section>

        {/* ARCHIVED EVENTS TITLE */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div>
            <p style={sectionEyebrowStyle}>
              Event Archive
            </p>

            <h2
              style={{
                margin: "5px 0 0",
                color: "#f9f4ed",
                fontSize: 18,
                fontWeight: 950,
              }}
            >
              Archived Events
            </h2>
          </div>

          {(events ?? []).length > 0 && (
            <span style={countPillStyle}>
              {(events ?? []).length}{" "}
              {(events ?? []).length === 1
                ? "event"
                : "events"}
            </span>
          )}
        </div>

        {!events || events.length === 0 ? (
          <div style={emptyStateStyle}>
            <div style={emptyIconStyle}>
              ♛
            </div>

            <p
              style={{
                margin: 0,
                color: "#f9f4ed",
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              No archived events yet
            </p>

            <p
              style={{
                margin: "6px 0 0",
                color: "rgba(247,241,232,0.27)",
                fontSize: 9,
                lineHeight: 1.5,
              }}
            >
              Events will appear here after they are archived from
              Event Management.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 13,
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

                if (
                  attendanceComplete &&
                  (scoresComplete || hasNoShow)
                ) {
                  completedCount += 1;
                }

                if (hasNoShow) {
                  noShowCount += 1;
                }

                if (hasReplacement) {
                  replacementCount += 1;
                }
              }

              const completionPercent =
                eventMatches.length > 0
                  ? Math.round(
                      (completedCount / eventMatches.length) * 100
                    )
                  : 0;

              return (
                <article
                  key={event.id}
                  style={{
                    overflow: "hidden",
                    borderRadius: 19,
                    border: "1px solid rgba(201,151,50,0.14)",
                    background:
                      "linear-gradient(145deg, rgba(21,13,13,0.96), rgba(5,5,5,0.98))",
                    boxShadow:
                      "0 17px 38px rgba(0,0,0,0.25)",
                  }}
                >
                  {/* EVENT HEADER */}
                  <div
                    style={{
                      padding: "20px 21px 17px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 16,
                      flexWrap: "wrap",
                      background:
                        "linear-gradient(110deg, rgba(58,7,9,0.18), transparent 55%)",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={archivedPillStyle}>
                          Archived
                        </span>

                        <span
                          style={{
                            color: "rgba(247,241,232,0.22)",
                            fontSize: 8,
                            fontWeight: 800,
                          }}
                        >
                          {formatDate(event.event_date)}
                        </span>
                      </div>

                      <h3
                        style={{
                          margin: "10px 0 0",
                          color: "#f9f4ed",
                          fontSize: 20,
                          fontWeight: 950,
                          letterSpacing: -0.4,
                        }}
                      >
                        {event.name}
                      </h3>

                      <p
                        style={{
                          margin: "6px 0 0",
                          color: "rgba(247,241,232,0.28)",
                          fontSize: 9,
                        }}
                      >
                        Final event records and battle history
                      </p>
                    </div>

                    <Link
                      href={`/crownlink/admin/results/${event.id}`}
                      style={viewResultsButtonStyle}
                    >
                      View Event Results
                      <span style={{ fontSize: 12 }}>→</span>
                    </Link>
                  </div>

                  {/* COMPLETION BAR */}
                  <div
                    style={{
                      padding: "0 21px",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 0",
                        borderTop:
                          "1px solid rgba(201,151,50,0.07)",
                        borderBottom:
                          "1px solid rgba(201,151,50,0.07)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "center",
                          marginBottom: 7,
                        }}
                      >
                        <span
                          style={{
                            color: "rgba(247,241,232,0.3)",
                            fontSize: 7,
                            fontWeight: 950,
                            letterSpacing: 1,
                            textTransform: "uppercase",
                          }}
                        >
                          Battle Completion
                        </span>

                        <span
                          style={{
                            color:
                              completionPercent === 100
                                ? "#d9b15c"
                                : "rgba(247,241,232,0.48)",
                            fontSize: 9,
                            fontWeight: 950,
                          }}
                        >
                          {completionPercent}%
                        </span>
                      </div>

                      <div
                        style={{
                          width: "100%",
                          height: 4,
                          borderRadius: 999,
                          overflow: "hidden",
                          background:
                            "rgba(255,255,255,0.045)",
                        }}
                      >
                        <div
                          style={{
                            width: `${completionPercent}%`,
                            height: "100%",
                            borderRadius: 999,
                            background:
                              "linear-gradient(90deg, #7c2300, #e86f00, #c99732)",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* STATS */}
                  <div
                    style={{
                      padding: 16,
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(120px, 1fr))",
                      gap: 8,
                    }}
                  >
                    <StatCard
                      value={eventMatches.length}
                      label="Battles"
                    />

                    <StatCard
                      value={`${completedCount}/${eventMatches.length}`}
                      label="Completed"
                      highlight={completedCount === eventMatches.length}
                    />

                    <StatCard
                      value={noShowCount}
                      label="No Shows"
                      warning={noShowCount > 0}
                    />

                    <StatCard
                      value={replacementCount}
                      label="Replacements"
                      orange={replacementCount > 0}
                    />
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
            borderTop: "1px solid rgba(201,151,50,0.08)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            color: "rgba(247,241,232,0.14)",
            fontSize: 8,
            fontWeight: 900,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          <span>Royals Bloodline</span>
          <span>Crown Link · Event History</span>
        </footer>
      </div>
    </main>
  );
}

function ArchiveSummaryCard({
  value,
  label,
  icon,
}: {
  value: number | string;
  label: string;
  icon: string;
}) {
  return (
    <div
      style={{
        padding: "14px 15px",
        borderRadius: 14,
        border: "1px solid rgba(201,151,50,0.10)",
        background:
          "linear-gradient(145deg, rgba(18,13,13,0.91), rgba(5,5,5,0.96))",
        display: "flex",
        alignItems: "center",
        gap: 11,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(201,151,50,0.13)",
          background: "rgba(201,151,50,0.035)",
          color: "#c99732",
          fontSize: 10,
          fontWeight: 950,
        }}
      >
        {icon}
      </div>

      <div>
        <p
          style={{
            margin: 0,
            color: "#f9f4ed",
            fontSize: 17,
            fontWeight: 950,
            lineHeight: 1,
          }}
        >
          {value}
        </p>

        <p
          style={{
            margin: "5px 0 0",
            color: "rgba(247,241,232,0.25)",
            fontSize: 7,
            fontWeight: 900,
            letterSpacing: 0.7,
            textTransform: "uppercase",
          }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  value,
  label,
  highlight = false,
  warning = false,
  orange = false,
}: {
  value: number | string;
  label: string;
  highlight?: boolean;
  warning?: boolean;
  orange?: boolean;
}) {
  let valueColor = "#d9b15c";
  let borderColor = "rgba(201,151,50,0.08)";
  let background = "rgba(0,0,0,0.18)";

  if (highlight) {
    valueColor = "#d9b15c";
    borderColor = "rgba(201,151,50,0.14)";
    background = "rgba(201,151,50,0.025)";
  }

  if (warning) {
    valueColor = "#e89191";
    borderColor = "rgba(142,42,42,0.18)";
    background = "rgba(80,12,12,0.09)";
  }

  if (orange) {
    valueColor = "#e86f00";
    borderColor = "rgba(232,111,0,0.14)";
    background = "rgba(232,111,0,0.025)";
  }

  return (
    <div
      style={{
        padding: "13px 11px",
        borderRadius: 11,
        background,
        border: `1px solid ${borderColor}`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 950,
          color: valueColor,
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 4,
          color: "rgba(247,241,232,0.27)",
          fontSize: 7,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        {label}
      </div>
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
  border: "1px solid rgba(201,151,50,0.13)",
  background: "rgba(0,0,0,0.28)",
  color: "#d9b15c",
  textDecoration: "none",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: 0.5,
  textTransform: "uppercase" as const,
};

const countPillStyle = {
  padding: "5px 8px",
  borderRadius: 999,
  border: "1px solid rgba(201,151,50,0.10)",
  background: "rgba(201,151,50,0.025)",
  color: "rgba(217,177,92,0.58)",
  fontSize: 7,
  fontWeight: 950,
  textTransform: "uppercase" as const,
  letterSpacing: 0.6,
};

const archivedPillStyle = {
  padding: "4px 7px",
  borderRadius: 999,
  border: "1px solid rgba(201,151,50,0.13)",
  background: "rgba(201,151,50,0.035)",
  color: "#c99732",
  fontSize: 6,
  fontWeight: 950,
  letterSpacing: 0.8,
  textTransform: "uppercase" as const,
};

const viewResultsButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(232,111,0,0.24)",
  background:
    "linear-gradient(135deg, rgba(232,111,0,0.12), rgba(99,25,0,0.12))",
  color: "#e86f00",
  textDecoration: "none",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: 0.5,
  textTransform: "uppercase" as const,
};

const emptyStateStyle = {
  padding: "30px 22px",
  borderRadius: 18,
  border: "1px dashed rgba(201,151,50,0.14)",
  background: "rgba(10,8,8,0.72)",
  textAlign: "center" as const,
};

const emptyIconStyle = {
  width: 34,
  height: 34,
  margin: "0 auto 10px",
  borderRadius: 11,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid rgba(201,151,50,0.14)",
  background: "rgba(201,151,50,0.035)",
  color: "#c99732",
  fontSize: 14,
};