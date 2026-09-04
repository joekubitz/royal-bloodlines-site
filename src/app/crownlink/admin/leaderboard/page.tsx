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
    .select("id, name, event_date, status")
    .order("event_date", { ascending: false });

  const selectedEvent =
    (events ?? []).find((event) => event.id === selectedEventId) ?? null;

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

    const matchIds = (matches ?? []).map((match) => match.id);

    if (matchIds.length > 0) {
      const [{ data: attendance }, { data: results }] = await Promise.all([
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
        new Set([...scheduledCreatorIds, ...replacementUserIds])
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
        profiles.map((profile) => [profile.user_id, profile])
      );

      const attendanceMap = new Map(
        (attendance ?? []).map((row) => [
          `${row.match_id}:${row.creator_id}`,
          row,
        ])
      );

      const resultMap = new Map(
        (results ?? []).map((result) => [result.match_id, result])
      );

      const totals = new Map<string, LeaderboardRow>();

      function getProfileLabel(userId: string) {
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

          const attendanceRow = attendanceMap.get(
            `${match.id}:${side.creatorId}`
          );

          if (attendanceRow?.status === "no_show") {
            continue;
          }

          if (attendanceRow?.status === "replacement") {
            if (attendanceRow.replacement_user_id) {
              const replacement = getProfileLabel(
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

            if (attendanceRow.replacement_name?.trim()) {
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

          const creator = getProfileLabel(side.creatorId);

          addScore(
            `user:${side.creatorId}`,
            creator.name,
            creator.username,
            Number(side.score)
          );
        }
      }

      leaderboard = Array.from(totals.values()).sort((a, b) => {
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
    const date = new Date(`${dateString}T12:00:00`);

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
              margin: "9px 0 0",
              fontSize: 40,
              fontWeight: 900,
            }}
          >
            Event Leaderboard
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.6,
            }}
          >
            Rankings are based on the total recorded score earned by the
            person who actually battled.
          </p>
        </div>

        <form
          method="GET"
          style={{
            padding: 22,
            borderRadius: 18,
            border: "1px solid rgba(211,163,60,0.22)",
            background: "rgba(20,10,10,0.78)",
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
              style={{
                width: "100%",
                padding: "12px 13px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "#120707",
                color: "white",
                fontSize: 13,
              }}
            >
              <option value="">Choose an event</option>

              {(events ?? []).map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} — {formatDate(event.event_date)}
                  {event.status === "archived" ? " (Archived)" : ""}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            style={{
              marginTop: 14,
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px solid rgba(211,163,60,0.28)",
              background: "rgba(211,163,60,0.1)",
              color: "#d3a33c",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            View Leaderboard
          </button>
        </form>

        {selectedEvent && (
          <section
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
                EVENT LEADERBOARD
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
                  margin: "7px 0 0",
                  color: "rgba(255,255,255,0.48)",
                  fontSize: 12,
                }}
              >
                {selectedEvent.status === "archived"
                  ? "Final Results"
                  : "Live Standings"}
              </p>
            </div>

            {leaderboard.length === 0 ? (
              <div
                style={{
                  padding: 30,
                  textAlign: "center",
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                No recorded scores are available for this event yet.
              </div>
            ) : (
              <div
                style={{
                  padding: 20,
                  display: "grid",
                  gap: 10,
                }}
              >
                {leaderboard.map((row, index) => {
                  const rank = index + 1;

                  return (
                    <div
                      key={row.key}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "52px minmax(0, 1fr) auto",
                        gap: 14,
                        alignItems: "center",
                        padding: "15px 16px",
                        borderRadius: 14,
                        background:
                          rank === 1
                            ? "rgba(211,163,60,0.09)"
                            : "rgba(255,255,255,0.035)",
                        border:
                          rank === 1
                            ? "1px solid rgba(211,163,60,0.28)"
                            : "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <div
                        style={{
                          color: rank <= 3 ? "#d3a33c" : "white",
                          fontSize: 20,
                          fontWeight: 900,
                        }}
                      >
                        #{rank}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 15,
                            fontWeight: 900,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {row.name}
                        </p>

                        {row.username &&
                          row.name !== `@${row.username}` && (
                            <p
                              style={{
                                margin: "4px 0 0",
                                color: "rgba(255,255,255,0.4)",
                                fontSize: 11,
                              }}
                            >
                              @{row.username}
                            </p>
                          )}

                        <p
                          style={{
                            margin: "5px 0 0",
                            color: "rgba(255,255,255,0.38)",
                            fontSize: 10,
                          }}
                        >
                          {row.battles}{" "}
                          {row.battles === 1 ? "battle" : "battles"} scored
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
                            color: "#d3a33c",
                            fontSize: 19,
                            fontWeight: 900,
                          }}
                        >
                          {row.totalScore.toLocaleString()}
                        </p>

                        <p
                          style={{
                            margin: "3px 0 0",
                            color: "rgba(255,255,255,0.35)",
                            fontSize: 9,
                            fontWeight: 800,
                            textTransform: "uppercase",
                          }}
                        >
                          Total Score
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
