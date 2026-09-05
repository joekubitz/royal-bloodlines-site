import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import CancelBattleButton from "./CancelBattleButton";

export default async function CrownLinkAdminBattlesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/crownlink/login");
  }

  const { data: userRole, error: roleError } = await supabase
    .from("user_roles")
    .select("role, status")
    .eq("user_id", user.id)
    .single();

  if (
    roleError ||
    !userRole ||
    userRole.role !== "admin" ||
    userRole.status !== "active"
  ) {
    redirect("/crownlink");
  }

  const adminSupabase = createAdminClient();

  const { data: matches, error: matchesError } = await adminSupabase
    .from("crownlink_matches")
    .select(`
      id,
      event_id,
      creator_one_id,
      creator_two_id,
      status,
      created_at,
      approved_at
    `)
    .eq("status", "approved")
    .order("approved_at", { ascending: true });

  if (matchesError) {
    console.error("Admin battles error:", matchesError);
  }

  const eventIds = [
    ...new Set((matches ?? []).map((match) => match.event_id)),
  ];

  const creatorIds = [
    ...new Set(
      (matches ?? []).flatMap((match) => [
        match.creator_one_id,
        match.creator_two_id,
      ])
    ),
  ];

  const { data: events } =
    eventIds.length > 0
      ? await adminSupabase
          .from("crownlink_events")
          .select("id, name, event_date, event_time")
          .in("id", eventIds)
      : { data: [] };

  const { data: profiles } =
    creatorIds.length > 0
      ? await adminSupabase
          .from("crownlink_profiles")
          .select(
            "user_id, display_name, tiktok_username, diamond_level"
          )
          .in("user_id", creatorIds)
      : { data: [] };

  const { data: roles } =
    creatorIds.length > 0
      ? await adminSupabase
          .from("user_roles")
          .select("user_id, agency_id")
          .in("user_id", creatorIds)
      : { data: [] };

  const agencyIds = [
    ...new Set(
      (roles ?? [])
        .map((role) => role.agency_id)
        .filter((agencyId): agencyId is string => Boolean(agencyId))
    ),
  ];

  const { data: agencies } =
    agencyIds.length > 0
      ? await adminSupabase
          .from("crownlink_agencies")
          .select("id, name")
          .in("id", agencyIds)
      : { data: [] };

  function getCreator(userId: string) {
    const profile = profiles?.find(
      (item) => item.user_id === userId
    );

    const role = roles?.find(
      (item) => item.user_id === userId
    );

    const agency = agencies?.find(
      (item) => item.id === role?.agency_id
    );

    return {
      name:
        profile?.display_name?.trim() ||
        profile?.tiktok_username ||
        "Creator",

      username: profile?.tiktok_username
        ? `@${profile.tiktok_username}`
        : "No TikTok username",

      diamonds: profile?.diamond_level ?? 0,

      agency: agency?.name ?? "No Agency",
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
          <Link href="/crownlink/admin" style={backButtonStyle}>
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
            marginBottom: 25,
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
                Crown Link · Battle Operations
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                gap: 18,
                flexWrap: "wrap",
              }}
            >
              <div>
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
                  Battles
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
                    color: "rgba(247,241,232,0.4)",
                    fontSize: 11,
                    lineHeight: 1.6,
                  }}
                >
                  View and manage all approved Crown Link battles.
                </p>
              </div>

              <div style={battleCountStyle}>
                <strong
                  style={{
                    display: "block",
                    color: "#d9b15c",
                    fontSize: 20,
                    lineHeight: 1,
                  }}
                >
                  {matches?.length ?? 0}
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: 4,
                    color: "rgba(247,241,232,0.25)",
                    fontSize: 7,
                    fontWeight: 950,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  Approved{" "}
                  {(matches?.length ?? 0) === 1
                    ? "Battle"
                    : "Battles"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div>
            <p style={sectionEyebrowStyle}>Approved Matchups</p>

            <h2
              style={{
                margin: "5px 0 0",
                color: "#f9f4ed",
                fontSize: 21,
                fontWeight: 950,
                letterSpacing: -0.45,
              }}
            >
              Battle Lineup
            </h2>
          </div>

          <span style={countPillStyle}>
            {matches?.length ?? 0} active
          </span>
        </div>

        {!matches || matches.length === 0 ? (
          <div style={emptyStateStyle}>
            <div
              style={{
                width: 42,
                height: 42,
                margin: "0 auto 12px",
                borderRadius: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(201,151,50,0.15)",
                background: "rgba(201,151,50,0.035)",
                color: "#c99732",
                fontSize: 18,
              }}
            >
              ⚔
            </div>

            <p
              style={{
                margin: 0,
                color: "#f9f4ed",
                fontSize: 14,
                fontWeight: 900,
              }}
            >
              No approved battles yet.
            </p>

            <p
              style={{
                margin: "6px 0 0",
                color: "rgba(247,241,232,0.28)",
                fontSize: 10,
              }}
            >
              Approved matchups will appear here after matchmaking.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            {matches.map((match, index) => {
              const event = events?.find(
                (item) => item.id === match.event_id
              );

              const creatorOne = getCreator(
                match.creator_one_id
              );

              const creatorTwo = getCreator(
                match.creator_two_id
              );

              const diamondDifference = Math.abs(
                creatorOne.diamonds - creatorTwo.diamonds
              );

              return (
                <article
                  key={match.id}
                  style={{
                    overflow: "hidden",
                    borderRadius: 21,
                    border: "1px solid rgba(201,151,50,0.16)",
                    background:
                      "linear-gradient(145deg, rgba(17,13,13,0.96), rgba(4,4,4,0.98))",
                    boxShadow: "0 19px 44px rgba(0,0,0,0.32)",
                  }}
                >
                  {/* BATTLE HEADER */}
                  <div
                    style={{
                      position: "relative",
                      padding: "17px 20px",
                      background: `
                        linear-gradient(
                          135deg,
                          rgba(48,5,9,0.48),
                          rgba(7,7,7,0.74) 60%,
                          rgba(3,3,3,0.88)
                        )
                      `,
                      borderBottom:
                        "1px solid rgba(201,151,50,0.08)",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        width: 130,
                        height: 130,
                        right: -45,
                        top: -75,
                        borderRadius: "50%",
                        background: "rgba(232,111,0,0.045)",
                        filter: "blur(38px)",
                      }}
                    />

                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 15,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={approvedBadgeStyle}>
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background: "#d9b15c",
                              }}
                            />
                            Approved
                          </span>

                          <span
                            style={{
                              color: "rgba(247,241,232,0.2)",
                              fontSize: 7,
                              fontWeight: 900,
                              letterSpacing: 1.2,
                              textTransform: "uppercase",
                            }}
                          >
                            Battle {index + 1}
                          </span>
                        </div>

                        <h3
                          style={{
                            margin: "8px 0 0",
                            color: "#f9f4ed",
                            fontSize: 17,
                            fontWeight: 950,
                            letterSpacing: -0.25,
                          }}
                        >
                          {event?.name ?? "Crown Link Event"}
                        </h3>

                        {event && (
                          <p
                            style={{
                              margin: "6px 0 0",
                              color: "rgba(247,241,232,0.34)",
                              fontSize: 10,
                            }}
                          >
                            {formatDate(event.event_date)}
                            {" · "}
                            <span
                              style={{
                                color: "#d9b15c",
                                fontWeight: 850,
                              }}
                            >
                              {formatTime(event.event_time)}
                            </span>
                          </p>
                        )}
                      </div>

                      <div
                        style={{
                          textAlign: "right",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            color: "rgba(247,241,232,0.2)",
                            fontSize: 7,
                            fontWeight: 900,
                            letterSpacing: 1,
                            textTransform: "uppercase",
                          }}
                        >
                          Diamond Difference
                        </p>

                        <p
                          style={{
                            margin: "4px 0 0",
                            color: "#c99732",
                            fontSize: 15,
                            fontWeight: 950,
                          }}
                        >
                          {diamondDifference.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* MATCHUP */}
                  <div
                    style={{
                      padding: 20,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(0, 1fr) auto minmax(0, 1fr)",
                        gap: 14,
                        alignItems: "stretch",
                      }}
                    >
                      <CreatorBattleCard
                        creator={creatorOne}
                        label="Creator One"
                      />

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background:
                              "linear-gradient(145deg, rgba(85,12,8,0.65), rgba(20,7,4,0.82))",
                            border:
                              "1px solid rgba(232,111,0,0.28)",
                            boxShadow:
                              "0 0 22px rgba(232,111,0,0.07)",
                            color: "#e86f00",
                            fontSize: 11,
                            fontWeight: 950,
                            letterSpacing: 0.5,
                          }}
                        >
                          VS
                        </div>
                      </div>

                      <CreatorBattleCard
                        creator={creatorTwo}
                        label="Creator Two"
                      />
                    </div>

                    {/* MATCH QUALITY */}
                    <div
                      style={{
                        marginTop: 13,
                        padding: "10px 12px",
                        borderRadius: 11,
                        border:
                          "1px solid rgba(201,151,50,0.09)",
                        background: "rgba(201,151,50,0.025)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        flexWrap: "wrap",
                        color: "rgba(247,241,232,0.28)",
                        fontSize: 9,
                      }}
                    >
                      Typical diamond difference
                      <strong
                        style={{
                          color: "#d9b15c",
                          fontWeight: 950,
                        }}
                      >
                        {diamondDifference.toLocaleString()}
                      </strong>
                    </div>

                    {/* CANCEL */}
                    <div
                      style={{
                        marginTop: 16,
                        paddingTop: 14,
                        borderTop:
                          "1px solid rgba(255,255,255,0.045)",
                      }}
                    >
                      <CancelBattleButton
                        matchId={match.id}
                        creatorOneName={creatorOne.name}
                        creatorTwoName={creatorTwo.name}
                      />
                    </div>
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
          <span>Crown Link · Battle Management</span>
        </footer>
      </div>
    </main>
  );
}

function CreatorBattleCard({
  creator,
  label,
}: {
  creator: {
    name: string;
    username: string;
    diamonds: number;
    agency: string;
  };
  label: string;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: 16,
        borderRadius: 15,
        border: "1px solid rgba(255,255,255,0.055)",
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.027), rgba(0,0,0,0.12))",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "rgba(247,241,232,0.2)",
          fontSize: 7,
          fontWeight: 950,
          letterSpacing: 1.3,
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: "8px 0 0",
          color: "#f9f4ed",
          fontSize: 16,
          fontWeight: 950,
          lineHeight: 1.1,
        }}
      >
        {creator.name}
      </p>

      <p
        style={{
          margin: "5px 0 0",
          color: "#c99732",
          fontSize: 10,
          fontWeight: 850,
        }}
      >
        {creator.username}
      </p>

      <div
        style={{
          marginTop: 13,
          paddingTop: 11,
          borderTop: "1px solid rgba(255,255,255,0.045)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "rgba(247,241,232,0.2)",
              fontSize: 7,
              fontWeight: 900,
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            Agency
          </p>

          <p
            style={{
              margin: "4px 0 0",
              color: "rgba(247,241,232,0.52)",
              fontSize: 9,
              fontWeight: 800,
            }}
          >
            {creator.agency}
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
              color: "rgba(247,241,232,0.2)",
              fontSize: 7,
              fontWeight: 900,
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            Typical Diamonds
          </p>

          <p
            style={{
              margin: "4px 0 0",
              color: "#d9b15c",
              fontSize: 12,
              fontWeight: 950,
            }}
          >
            {creator.diamonds.toLocaleString()}
          </p>
        </div>
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

const battleCountStyle = {
  minWidth: 96,
  padding: "10px 13px",
  borderRadius: 13,
  textAlign: "center" as const,
  border: "1px solid rgba(201,151,50,0.15)",
  background: "rgba(201,151,50,0.035)",
};

const countPillStyle = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(201,151,50,0.14)",
  background: "rgba(201,151,50,0.04)",
  color: "#d9b15c",
  fontSize: 8,
  fontWeight: 900,
};

const approvedBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 8px",
  borderRadius: 999,
  border: "1px solid rgba(201,151,50,0.18)",
  background: "rgba(201,151,50,0.045)",
  color: "#d9b15c",
  fontSize: 7,
  fontWeight: 950,
  letterSpacing: 1,
  textTransform: "uppercase" as const,
};

const emptyStateStyle = {
  padding: "30px 22px",
  borderRadius: 18,
  border: "1px dashed rgba(201,151,50,0.16)",
  background: "rgba(10,8,8,0.72)",
  textAlign: "center" as const,
};