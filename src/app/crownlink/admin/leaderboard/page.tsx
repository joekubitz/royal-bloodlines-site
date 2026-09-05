import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

type PageProps = {
  searchParams: Promise<{
    eventId?: string;
  }>;
};

type LeaderboardRow = {
  key: string;
  name: string;
  username: string;
  totalScore: number;
  battles: number;
};

export default async function CrownLinkLeaderboardPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const selectedEventId = params.eventId ?? "";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/crownlink/login");
  }

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role, status, can_view_leaderboard")
    .eq("user_id", user.id)
    .single();

  const canViewLeaderboard =
    userRole?.status === "active" &&
    (userRole.role === "admin" ||
      userRole.can_view_leaderboard === true);

  if (!canViewLeaderboard) {
    redirect("/crownlink");
  }

  const adminSupabase = createAdminClient();

  const { data: events } = await adminSupabase
    .from("crownlink_events")
    .select("id, name, event_date, status")
    .order("event_date", { ascending: false });

  const selectedEvent =
    (events ?? []).find(
      (event) => event.id === selectedEventId
    ) ?? null;

  let leaderboard: LeaderboardRow[] = [];

  if (selectedEvent) {
    const { data: matches } = await adminSupabase
      .from("crownlink_matches")
      .select(`
        id,
        creator_one_id,
        creator_two_id
      `)
      .eq("event_id", selectedEvent.id)
      .eq("status", "approved");

    const matchIds = (matches ?? []).map(
      (match) => match.id
    );

    if (matchIds.length > 0) {
      const [
        { data: attendance },
        { data: results },
      ] = await Promise.all([
        adminSupabase
          .from("crownlink_match_attendance")
          .select(`
            match_id,
            creator_id,
            status,
            replacement_user_id,
            replacement_name
          `)
          .in("match_id", matchIds),

        adminSupabase
          .from("crownlink_match_results")
          .select(`
            match_id,
            creator_one_score,
            creator_two_score
          `)
          .in("match_id", matchIds),
      ]);

      const scheduledCreatorIds = Array.from(
        new Set(
          (matches ?? []).flatMap((match) => [
            match.creator_one_id,
            match.creator_two_id,
          ])
        )
      );

      const replacementUserIds = Array.from(
        new Set(
          (attendance ?? [])
            .map((row) => row.replacement_user_id)
            .filter(Boolean)
        )
      ) as string[];

      const allProfileIds = Array.from(
        new Set([
          ...scheduledCreatorIds,
          ...replacementUserIds,
        ])
      );

      let profiles: {
        user_id: string;
        display_name: string | null;
        tiktok_username: string;
      }[] = [];

      if (allProfileIds.length > 0) {
        const { data } = await adminSupabase
          .from("crownlink_profiles")
          .select(`
            user_id,
            display_name,
            tiktok_username
          `)
          .in("user_id", allProfileIds);

        profiles = data ?? [];
      }

      const profileMap = new Map(
        profiles.map((profile) => [
          profile.user_id,
          profile,
        ])
      );

      const attendanceMap = new Map(
        (attendance ?? []).map((row) => [
          `${row.match_id}:${row.creator_id}`,
          row,
        ])
      );

      const resultMap = new Map(
        (results ?? []).map((result) => [
          result.match_id,
          result,
        ])
      );

      const totals = new Map<
        string,
        LeaderboardRow
      >();

      function getProfileLabel(userId: string) {
        const profile = profileMap.get(userId);

        return {
          name:
            profile?.display_name?.trim() ||
            (profile?.tiktok_username
              ? `@${profile.tiktok_username}`
              : "Creator"),
          username:
            profile?.tiktok_username ?? "",
        };
      }

      function addScore(
        key: string,
        name: string,
        username: string,
        score: number
      ) {
        const existing = totals.get(key);

        if (existing) {
          existing.totalScore += score;
          existing.battles += 1;
          return;
        }

        totals.set(key, {
          key,
          name,
          username,
          totalScore: score,
          battles: 1,
        });
      }

      for (const match of matches ?? []) {
        const result = resultMap.get(match.id);

        if (!result) {
          continue;
        }

        const sides = [
          {
            creatorId: match.creator_one_id,
            score: result.creator_one_score,
          },
          {
            creatorId: match.creator_two_id,
            score: result.creator_two_score,
          },
        ];

        for (const side of sides) {
          if (
            side.score === null ||
            side.score === undefined ||
            !Number.isFinite(Number(side.score))
          ) {
            continue;
          }

          const attendanceRow =
            attendanceMap.get(
              `${match.id}:${side.creatorId}`
            );

          if (
            attendanceRow?.status === "no_show"
          ) {
            continue;
          }

          if (
            attendanceRow?.status ===
            "replacement"
          ) {
            if (
              attendanceRow.replacement_user_id
            ) {
              const replacement =
                getProfileLabel(
                  attendanceRow.replacement_user_id
                );

              addScore(
                `user:${attendanceRow.replacement_user_id}`,
                replacement.name,
                replacement.username,
                Number(side.score)
              );

              continue;
            }

            if (
              attendanceRow.replacement_name?.trim()
            ) {
              const replacementName =
                attendanceRow.replacement_name.trim();

              addScore(
                `replacement:${replacementName.toLowerCase()}`,
                replacementName,
                "",
                Number(side.score)
              );

              continue;
            }

            continue;
          }

          const creator = getProfileLabel(
            side.creatorId
          );

          addScore(
            `user:${side.creatorId}`,
            creator.name,
            creator.username,
            Number(side.score)
          );
        }
      }

      leaderboard = Array.from(
        totals.values()
      ).sort((a, b) => {
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }

        if (b.battles !== a.battles) {
          return b.battles - a.battles;
        }

        return a.name.localeCompare(b.name);
      });
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(
      `${dateString}T12:00:00`
    );

    return date.toLocaleDateString("en-US", {
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
          radial-gradient(circle at 90% 30%, rgba(116,22,0,0.08), transparent 28%),
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
                Crown Link · Results
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
              Event Leaderboard
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
                maxWidth: 670,
                color:
                  "rgba(247,241,232,0.4)",
                fontSize: 11,
                lineHeight: 1.6,
              }}
            >
              Rankings are based on the total
              recorded score earned by the
              person who actually battled.
            </p>
          </div>
        </section>

        {/* EVENT SELECTOR */}
        <section
          style={{
            padding: 20,
            borderRadius: 18,
            border:
              "1px solid rgba(201,151,50,0.13)",
            background:
              "linear-gradient(145deg, rgba(20,16,16,0.94), rgba(5,5,5,0.97))",
            boxShadow:
              "0 18px 40px rgba(0,0,0,0.26)",
            marginBottom: 24,
          }}
        >
          <p style={sectionEyebrowStyle}>
            Leaderboard Event
          </p>

          <h2
            style={{
              margin: "5px 0 0",
              color: "#f9f4ed",
              fontSize: 17,
              fontWeight: 950,
            }}
          >
            Choose Event
          </h2>

          <form
            method="GET"
            style={{
              marginTop: 15,
              paddingTop: 15,
              borderTop:
                "1px solid rgba(201,151,50,0.07)",
              display: "grid",
              gap: 11,
            }}
          >
            <label
              style={{
                display: "grid",
                gap: 7,
              }}
            >
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
                    {event.name} —{" "}
                    {formatDate(
                      event.event_date
                    )}
                    {event.status === "archived"
                      ? " (Archived)"
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              style={viewButtonStyle}
            >
              View Leaderboard
            </button>
          </form>
        </section>

        {!selectedEvent && (
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
              Select an event to view rankings
            </p>

            <p
              style={{
                margin: "5px 0 0",
                color:
                  "rgba(247,241,232,0.27)",
                fontSize: 9,
              }}
            >
              Active and archived events are
              available above.
            </p>
          </div>
        )}

        {selectedEvent && (
          <section
            style={{
              overflow: "hidden",
              borderRadius: 22,
              border:
                "1px solid rgba(201,151,50,0.20)",
              background:
                "linear-gradient(180deg, rgba(27,9,9,0.98), rgba(6,6,6,0.99))",
              boxShadow:
                "0 24px 70px rgba(0,0,0,0.45)",
            }}
          >
            {/* LEADERBOARD HEADER */}
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                padding: "25px 24px 21px",
                textAlign: "center",
                borderBottom:
                  "1px solid rgba(201,151,50,0.13)",
                background: `
                  radial-gradient(circle at 50% -90%, rgba(112,14,10,0.62), transparent 58%),
                  linear-gradient(180deg, rgba(48,5,9,0.70), rgba(11,7,7,0.42))
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
                    width: 34,
                    height: 34,
                    margin: "0 auto 9px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border:
                      "1px solid rgba(201,151,50,0.22)",
                    background:
                      "rgba(201,151,50,0.05)",
                    color: "#d9b15c",
                    fontSize: 16,
                  }}
                >
                  ♛
                </div>

                <p
                  style={{
                    margin: 0,
                    color: "#d9b15c",
                    fontSize: 7,
                    fontWeight: 950,
                    letterSpacing: 2.5,
                    textTransform: "uppercase",
                  }}
                >
                  Event Leaderboard
                </p>

                <h2
                  style={{
                    margin: "8px 0 0",
                    color: "#f9f4ed",
                    fontSize:
                      "clamp(23px,4vw,30px)",
                    fontWeight: 950,
                    letterSpacing: -0.6,
                  }}
                >
                  {selectedEvent.name}
                </h2>

                <div
                  style={{
                    marginTop: 9,
                    display: "flex",
                    justifyContent: "center",
                    gap: 7,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={statusPillStyle}>
                    {selectedEvent.status ===
                    "archived"
                      ? "Final Results"
                      : "Live Standings"}
                  </span>

                  {leaderboard.length > 0 && (
                    <span style={countPillStyle}>
                      {leaderboard.length}{" "}
                      {leaderboard.length === 1
                        ? "competitor"
                        : "competitors"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {leaderboard.length === 0 ? (
              <div
                style={{
                  padding: "34px 25px",
                  textAlign: "center",
                }}
              >
                <div style={emptyIconStyle}>
                  #
                </div>

                <p
                  style={{
                    margin: 0,
                    color: "#f9f4ed",
                    fontSize: 13,
                    fontWeight: 900,
                  }}
                >
                  No recorded scores yet
                </p>

                <p
                  style={{
                    margin: "6px 0 0",
                    color:
                      "rgba(247,241,232,0.28)",
                    fontSize: 9,
                  }}
                >
                  Rankings will appear after
                  battle results are recorded.
                </p>
              </div>
            ) : (
              <div
                style={{
                  padding: 18,
                  display: "grid",
                  gap: 9,
                }}
              >
                {leaderboard.map(
                  (row, index) => {
                    const rank = index + 1;

                    const isFirst = rank === 1;
                    const isSecond = rank === 2;
                    const isThird = rank === 3;

                    return (
                      <div
                        key={row.key}
                        style={{
                          position: "relative",
                          overflow: "hidden",
                          display: "grid",
                          gridTemplateColumns:
                            "50px minmax(0, 1fr) auto",
                          gap: 13,
                          alignItems: "center",
                          padding: isFirst
                            ? "17px 16px"
                            : "14px 16px",
                          borderRadius: 14,
                          background: isFirst
                            ? "linear-gradient(135deg, rgba(201,151,50,0.10), rgba(58,7,9,0.19), rgba(255,255,255,0.025))"
                            : isSecond ||
                                isThird
                              ? "linear-gradient(135deg, rgba(201,151,50,0.04), rgba(255,255,255,0.025))"
                              : "rgba(255,255,255,0.026)",
                          border: isFirst
                            ? "1px solid rgba(217,177,92,0.27)"
                            : isSecond ||
                                isThird
                              ? "1px solid rgba(201,151,50,0.12)"
                              : "1px solid rgba(255,255,255,0.05)",
                          boxShadow: isFirst
                            ? "0 12px 30px rgba(0,0,0,0.24)"
                            : "none",
                        }}
                      >
                        {isFirst && (
                          <div
                            style={{
                              position:
                                "absolute",
                              width: 110,
                              height: 110,
                              right: -50,
                              top: -60,
                              borderRadius:
                                "50%",
                              background:
                                "rgba(232,111,0,0.04)",
                              filter:
                                "blur(28px)",
                              pointerEvents:
                                "none",
                            }}
                          />
                        )}

                        {/* RANK */}
                        <div
                          style={{
                            position: "relative",
                            zIndex: 2,
                          }}
                        >
                          <div
                            style={{
                              width: isFirst
                                ? 38
                                : 34,
                              height: isFirst
                                ? 38
                                : 34,
                              borderRadius: 11,
                              display: "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              border: isFirst
                                ? "1px solid rgba(217,177,92,0.25)"
                                : isSecond ||
                                    isThird
                                  ? "1px solid rgba(201,151,50,0.13)"
                                  : "1px solid rgba(255,255,255,0.055)",
                              background: isFirst
                                ? "rgba(201,151,50,0.08)"
                                : "rgba(0,0,0,0.18)",
                              color:
                                rank <= 3
                                  ? "#d9b15c"
                                  : "rgba(247,241,232,0.42)",
                              fontSize: isFirst
                                ? 15
                                : 13,
                              fontWeight: 950,
                            }}
                          >
                            {isFirst
                              ? "♛"
                              : `#${rank}`}
                          </div>

                          {isFirst && (
                            <p
                              style={{
                                margin:
                                  "4px 0 0",
                                width: 38,
                                textAlign:
                                  "center",
                                color:
                                  "rgba(217,177,92,0.48)",
                                fontSize: 6,
                                fontWeight: 950,
                                letterSpacing:
                                  0.7,
                                textTransform:
                                  "uppercase",
                              }}
                            >
                              #1
                            </p>
                          )}
                        </div>

                        {/* CREATOR */}
                        <div
                          style={{
                            minWidth: 0,
                            position:
                              "relative",
                            zIndex: 2,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems:
                                "center",
                              gap: 7,
                              flexWrap:
                                "wrap",
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                color:
                                  "#f9f4ed",
                                fontSize:
                                  isFirst
                                    ? 15
                                    : 13,
                                fontWeight: 950,
                                overflow:
                                  "hidden",
                                textOverflow:
                                  "ellipsis",
                              }}
                            >
                              {row.name}
                            </p>

                            {rank <= 3 && (
                              <span
                                style={{
                                  padding:
                                    "3px 6px",
                                  borderRadius:
                                    999,
                                  border:
                                    "1px solid rgba(201,151,50,0.12)",
                                  background:
                                    "rgba(201,151,50,0.035)",
                                  color:
                                    "#c99732",
                                  fontSize: 6,
                                  fontWeight: 950,
                                  letterSpacing:
                                    0.6,
                                  textTransform:
                                    "uppercase",
                                }}
                              >
                                Top {rank}
                              </span>
                            )}
                          </div>

                          {row.username &&
                            row.name !==
                              `@${row.username}` && (
                              <p
                                style={{
                                  margin:
                                    "4px 0 0",
                                  color:
                                    "#c99732",
                                  fontSize: 9,
                                  fontWeight: 750,
                                }}
                              >
                                @{row.username}
                              </p>
                            )}

                          <p
                            style={{
                              margin:
                                "6px 0 0",
                              color:
                                "rgba(247,241,232,0.24)",
                              fontSize: 8,
                            }}
                          >
                            {row.battles}{" "}
                            {row.battles === 1
                              ? "battle"
                              : "battles"}{" "}
                            scored
                          </p>
                        </div>

                        {/* SCORE */}
                        <div
                          style={{
                            position:
                              "relative",
                            zIndex: 2,
                            textAlign:
                              "right",
                            paddingLeft: 12,
                            borderLeft:
                              "1px solid rgba(201,151,50,0.07)",
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              color:
                                rank <= 3
                                  ? "#d9b15c"
                                  : "#f9f4ed",
                              fontSize:
                                isFirst
                                  ? 19
                                  : 16,
                              fontWeight: 950,
                              lineHeight: 1,
                            }}
                          >
                            {row.totalScore.toLocaleString()}
                          </p>

                          <p
                            style={{
                              margin:
                                "4px 0 0",
                              color:
                                "rgba(247,241,232,0.2)",
                              fontSize: 6,
                              fontWeight: 950,
                              letterSpacing:
                                0.8,
                              textTransform:
                                "uppercase",
                            }}
                          >
                            Total Score
                          </p>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            {leaderboard.length > 0 && (
              <div
                style={{
                  padding: "11px 18px",
                  borderTop:
                    "1px solid rgba(201,151,50,0.07)",
                  background:
                    "rgba(0,0,0,0.16)",
                  textAlign: "center",
                  color:
                    "rgba(247,241,232,0.15)",
                  fontSize: 7,
                  fontWeight: 900,
                  letterSpacing: 1.3,
                  textTransform: "uppercase",
                }}
              >
                Scores credited to the person
                who actually battled
              </div>
            )}
          </section>
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
            Crown Link · Event Leaderboard
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

const fieldLabelStyle = {
  color: "rgba(247,241,232,0.48)",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: 1.1,
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

const viewButtonStyle = {
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
  textTransform: "uppercase" as const,
  cursor: "pointer",
  boxShadow:
    "0 10px 24px rgba(232,111,0,0.12)",
};

const statusPillStyle = {
  padding: "5px 8px",
  borderRadius: 999,
  border:
    "1px solid rgba(201,151,50,0.16)",
  background:
    "rgba(201,151,50,0.045)",
  color: "#d9b15c",
  fontSize: 7,
  fontWeight: 950,
  letterSpacing: 0.8,
  textTransform: "uppercase" as const,
};

const countPillStyle = {
  padding: "5px 8px",
  borderRadius: 999,
  border:
    "1px solid rgba(255,255,255,0.06)",
  background:
    "rgba(255,255,255,0.025)",
  color: "rgba(247,241,232,0.36)",
  fontSize: 7,
  fontWeight: 900,
};

const emptyStateStyle = {
  padding: "28px 22px",
  borderRadius: 18,
  border:
    "1px dashed rgba(201,151,50,0.14)",
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
  border:
    "1px solid rgba(201,151,50,0.14)",
  background:
    "rgba(201,151,50,0.035)",
  color: "#c99732",
  fontSize: 14,
};