import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export default async function CrownLinkMyBattlesPage() {
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
    userRole.status !== "active" ||
    !["creator", "admin", "agent"].includes(userRole.role)
  ) {
    redirect("/crownlink/login");
  }

  /*
   * Authentication and authorization are complete.
   * From here on, use the server-only admin client so we can
   * safely retrieve the opponent's public Crown Link profile data.
   */
  const adminSupabase = createAdminClient();

  const { data: matches, error: matchesError } =
    await adminSupabase
      .from("crownlink_matches")
      .select(`
        id,
        event_id,
        creator_one_id,
        creator_two_id,
        status,
        approved_at
      `)
      .eq("status", "approved")
      .or(
        `creator_one_id.eq.${user.id},creator_two_id.eq.${user.id}`
      )
      .order("approved_at", { ascending: true });

  if (matchesError) {
    console.error(
      "CROWN LINK MY BATTLES ERROR:",
      matchesError
    );
  }

  const eventIds = Array.from(
    new Set(
      (matches ?? []).map(
        (match) => match.event_id
      )
    )
  );

  const opponentIds = Array.from(
    new Set(
      (matches ?? []).map((match) =>
        match.creator_one_id === user.id
          ? match.creator_two_id
          : match.creator_one_id
      )
    )
  );

  let events: {
    id: string;
    name: string;
    event_date: string;
    event_time: string;
    status: string;
  }[] = [];

  let profiles: {
    user_id: string;
    display_name: string | null;
    tiktok_username: string;
    diamond_level: number;
  }[] = [];

  let roles: {
    user_id: string;
    agency_id: string | null;
  }[] = [];

  if (eventIds.length > 0) {
    const { data: eventData } =
      await adminSupabase
        .from("crownlink_events")
        .select(`
          id,
          name,
          event_date,
          event_time,
          status
        `)
        .in("id", eventIds);

    events = eventData ?? [];
  }

  if (opponentIds.length > 0) {
    const { data: profileData } =
      await adminSupabase
        .from("crownlink_profiles")
        .select(`
          user_id,
          display_name,
          tiktok_username,
          diamond_level
        `)
        .in("user_id", opponentIds);

    profiles = profileData ?? [];

    const { data: roleData } =
      await adminSupabase
        .from("user_roles")
        .select(`
          user_id,
          agency_id
        `)
        .in("user_id", opponentIds);

    roles = roleData ?? [];
  }

  const agencyIds = Array.from(
    new Set(
      roles
        .map((role) => role.agency_id)
        .filter(
          (agencyId): agencyId is string =>
            Boolean(agencyId)
        )
    )
  );

  let agencies: {
    id: string;
    name: string;
  }[] = [];

  if (agencyIds.length > 0) {
    const { data: agencyData } =
      await adminSupabase
        .from("crownlink_agencies")
        .select("id, name")
        .in("id", agencyIds);

    agencies = agencyData ?? [];
  }

  const eventMap = new Map(
    events.map((event) => [
      event.id,
      event,
    ])
  );

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.user_id,
      profile,
    ])
  );

  const roleMap = new Map(
    roles.map((role) => [
      role.user_id,
      role,
    ])
  );

  const agencyMap = new Map(
    agencies.map((agency) => [
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
    const minute =
      minuteString || "00";

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
          radial-gradient(circle at 14% 7%, rgba(88,7,12,0.42), transparent 30%),
          radial-gradient(circle at 88% 26%, rgba(116,22,0,0.10), transparent 30%),
          radial-gradient(circle at 50% 100%, rgba(66,5,9,0.15), transparent 38%),
          linear-gradient(180deg, #080808 0%, #040404 46%, #010101 100%)
        `,
        padding: "28px 20px 70px",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        {/* BACK */}
        <div style={{ marginBottom: 16 }}>
          <Link
            href="/crownlink"
            style={backButtonStyle}
          >
            <span
              style={{
                fontSize: 15,
                lineHeight: 1,
              }}
            >
              ←
            </span>

            Back to Crown Link
          </Link>
        </div>

        {/* COMPACT HEADER */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "24px 26px",
            borderRadius: 24,
            border:
              "1px solid rgba(201,151,50,0.2)",
            background: `
              linear-gradient(
                130deg,
                rgba(45,5,9,0.90),
                rgba(13,10,10,0.94) 52%,
                rgba(3,3,3,0.98)
              )
            `,
            boxShadow:
              "0 22px 55px rgba(0,0,0,0.48), 0 0 40px rgba(88,7,12,0.09)",
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
                "rgba(116,8,15,0.17)",
              filter: "blur(80px)",
              left: -100,
              top: -130,
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "absolute",
              width: 180,
              height: 180,
              borderRadius: "50%",
              background:
                "rgba(232,111,0,0.055)",
              filter: "blur(65px)",
              right: -40,
              bottom: -100,
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
                gap: 8,
                padding: "6px 10px",
                borderRadius: 999,
                border:
                  "1px solid rgba(201,151,50,0.22)",
                background:
                  "rgba(201,151,50,0.055)",
                marginBottom: 11,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#c99732",
                  boxShadow:
                    "0 0 10px rgba(201,151,50,0.5)",
                }}
              />

              <span
                style={{
                  color: "#d9b15c",
                  fontSize: 8,
                  fontWeight: 950,
                  letterSpacing: 2.1,
                  textTransform: "uppercase",
                }}
              >
                Crown Link · Battle Center
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                color: "#f9f4ed",
                fontSize:
                  "clamp(30px,5vw,43px)",
                lineHeight: 1,
                fontWeight: 950,
                letterSpacing: -1.5,
              }}
            >
              My Battles
            </h1>

            <div
              style={{
                width: 60,
                height: 2,
                marginTop: 12,
                background:
                  "linear-gradient(90deg, #e86f00, #c99732, transparent)",
                boxShadow:
                  "0 0 10px rgba(232,111,0,0.2)",
              }}
            />

            <p
              style={{
                margin: "11px 0 0",
                maxWidth: 650,
                color:
                  "rgba(247,241,232,0.42)",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              Your approved Crown Link
              matchups and opponent details.
            </p>
          </div>
        </section>

        {/* BATTLE COUNT */}
        {matches && matches.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "flex-end",
              gap: 14,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <div>
              <p style={eyebrowStyle}>
                Battle Schedule
              </p>

              <h2
                style={{
                  margin: "5px 0 0",
                  color: "#f9f4ed",
                  fontSize: 21,
                  fontWeight: 950,
                  letterSpacing: -0.5,
                }}
              >
                Approved Matchups
              </h2>
            </div>

            <div
              style={{
                padding: "7px 11px",
                borderRadius: 999,
                border:
                  "1px solid rgba(201,151,50,0.17)",
                background:
                  "rgba(201,151,50,0.05)",
                color: "#d9b15c",
                fontSize: 9,
                fontWeight: 900,
              }}
            >
              {matches.length}{" "}
              {matches.length === 1
                ? "battle"
                : "battles"}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!matches ||
        matches.length === 0 ? (
          <div style={emptyStateStyle}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                border:
                  "1px solid rgba(201,151,50,0.18)",
                background:
                  "rgba(201,151,50,0.045)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#c99732",
                fontSize: 19,
                marginBottom: 13,
              }}
            >
              ♛
            </div>

            <h2
              style={{
                margin: 0,
                color: "#f9f4ed",
                fontSize: 17,
                fontWeight: 950,
              }}
            >
              No Approved Battles Yet
            </h2>

            <p
              style={{
                margin: "8px 0 0",
                color:
                  "rgba(247,241,232,0.35)",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              Once an admin approves one of
              your Crown Link matches, your
              opponent and battle details will
              appear here.
            </p>

            <div
              style={{
                marginTop: 17,
              }}
            >
              <Link
                href="/crownlink/matchmaking"
                style={primaryButtonStyle}
              >
                Check Matchmaking
                <span>→</span>
              </Link>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            {matches.map(
              (match, index) => {
                const event =
                  eventMap.get(
                    match.event_id
                  );

                const opponentId =
                  match.creator_one_id ===
                  user.id
                    ? match.creator_two_id
                    : match.creator_one_id;

                const opponent =
                  profileMap.get(
                    opponentId
                  );

                const opponentRole =
                  roleMap.get(
                    opponentId
                  );

                const opponentAgency =
                  opponentRole?.agency_id
                    ? agencyMap.get(
                        opponentRole.agency_id
                      ) ??
                      "Unknown Agency"
                    : "No Agency";

                const opponentName =
                  opponent?.display_name?.trim() ||
                  (opponent?.tiktok_username
                    ? `@${opponent.tiktok_username}`
                    : "Opponent");

                return (
                  <article
                    key={match.id}
                    style={{
                      position: "relative",
                      overflow: "hidden",
                      borderRadius: 24,
                      border:
                        "1px solid rgba(201,151,50,0.24)",
                      background: `
                        linear-gradient(
                          145deg,
                          rgba(43,5,9,0.68),
                          rgba(8,8,8,0.96) 55%,
                          rgba(4,4,4,0.98)
                        )
                      `,
                      boxShadow:
                        "0 22px 50px rgba(0,0,0,0.42), 0 0 28px rgba(88,7,12,0.08)",
                    }}
                  >
                    {/* AMBIENT GLOW */}
                    <div
                      style={{
                        position:
                          "absolute",
                        width: 190,
                        height: 190,
                        borderRadius:
                          "50%",
                        right: -65,
                        top: -90,
                        background:
                          "rgba(232,111,0,0.055)",
                        filter:
                          "blur(48px)",
                        pointerEvents:
                          "none",
                      }}
                    />

                    {/* BATTLE HEADER */}
                    <div
                      style={{
                        position:
                          "relative",
                        padding: 24,
                        borderBottom:
                          "1px solid rgba(201,151,50,0.09)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "flex-start",
                          gap: 18,
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <div
                          style={{
                            flex: "1 1 400px",
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: 8,
                              flexWrap:
                                "wrap",
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                color:
                                  "#c99732",
                                fontSize: 8,
                                fontWeight: 950,
                                letterSpacing: 2,
                                textTransform:
                                  "uppercase",
                              }}
                            >
                              Battle{" "}
                              {String(
                                index + 1
                              ).padStart(
                                2,
                                "0"
                              )}
                            </p>

                            <span
                              style={{
                                color:
                                  "rgba(247,241,232,0.16)",
                                fontSize: 8,
                              }}
                            >
                              ·
                            </span>

                            <p
                              style={{
                                margin: 0,
                                color:
                                  "rgba(247,241,232,0.28)",
                                fontSize: 8,
                                fontWeight: 900,
                                letterSpacing: 1.5,
                                textTransform:
                                  "uppercase",
                              }}
                            >
                              Crown Link
                            </p>
                          </div>

                          <h2
                            style={{
                              margin:
                                "8px 0 0",
                              color:
                                "#f9f4ed",
                              fontSize:
                                "clamp(21px,3vw,28px)",
                              lineHeight: 1.05,
                              fontWeight: 950,
                              letterSpacing:
                                -0.7,
                            }}
                          >
                            {event?.name ??
                              "Crown Link Event"}
                          </h2>

                          {event && (
                            <div
                              style={{
                                display:
                                  "flex",
                                gap: 8,
                                flexWrap:
                                  "wrap",
                                marginTop: 11,
                              }}
                            >
                              <BattleDetailPill
                                label="Date"
                                value={formatDate(
                                  event.event_date
                                )}
                              />

                              <BattleDetailPill
                                label="Time"
                                value={formatTime(
                                  event.event_time
                                )}
                                accent
                              />
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            display:
                              "inline-flex",
                            alignItems:
                              "center",
                            gap: 7,
                            padding:
                              "7px 11px",
                            borderRadius:
                              999,
                            border:
                              "1px solid rgba(201,151,50,0.23)",
                            background:
                              "rgba(201,151,50,0.06)",
                            color:
                              "#d9b15c",
                            fontSize: 8,
                            fontWeight: 950,
                            letterSpacing:
                              1.2,
                            textTransform:
                              "uppercase",
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius:
                                "50%",
                              background:
                                "#c99732",
                              boxShadow:
                                "0 0 8px rgba(201,151,50,0.5)",
                            }}
                          />

                          Approved
                        </div>
                      </div>
                    </div>

                    {/* MATCHUP */}
                    <div
                      style={{
                        position:
                          "relative",
                        padding: 24,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          color:
                            "#c99732",
                          fontSize: 8,
                          fontWeight: 950,
                          letterSpacing: 2,
                          textTransform:
                            "uppercase",
                        }}
                      >
                        Your Opponent
                      </p>

                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          gap: 14,
                          marginTop: 13,
                        }}
                      >
                        <div
                          style={{
                            width: 50,
                            height: 50,
                            flexShrink: 0,
                            borderRadius: 16,
                            border:
                              "1px solid rgba(201,151,50,0.25)",
                            background:
                              "linear-gradient(145deg, #57080d, #180305)",
                            boxShadow:
                              "0 10px 25px rgba(0,0,0,0.38)",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            color:
                              "#d9b15c",
                            fontSize: 20,
                          }}
                        >
                          ⚔
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <h3
                            style={{
                              margin: 0,
                              color:
                                "#f9f4ed",
                              fontSize:
                                "clamp(23px,4vw,31px)",
                              lineHeight: 1,
                              fontWeight: 950,
                              letterSpacing:
                                -0.9,
                            }}
                          >
                            {opponentName}
                          </h3>

                          {opponent?.tiktok_username && (
                            <p
                              style={{
                                margin:
                                  "7px 0 0",
                                color:
                                  "rgba(247,241,232,0.38)",
                                fontSize: 12,
                              }}
                            >
                              @
                              {
                                opponent.tiktok_username
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      {/* OPPONENT DETAILS */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(190px, 1fr))",
                          gap: 12,
                          marginTop: 21,
                        }}
                      >
                        <OpponentMetric
                          label="Agency"
                          value={
                            opponentAgency
                          }
                        />

                        <OpponentMetric
                          label="Typical Diamonds"
                          value={(
                            opponent?.diamond_level ??
                            0
                          ).toLocaleString()}
                          featured
                        />
                      </div>

                      {/* BATTLE REMINDER */}
                      <div
                        style={{
                          marginTop: 17,
                          padding: 15,
                          borderRadius: 15,
                          border:
                            "1px solid rgba(201,151,50,0.11)",
                          background:
                            "rgba(0,0,0,0.26)",
                          display: "flex",
                          alignItems:
                            "flex-start",
                          gap: 11,
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            flexShrink: 0,
                            borderRadius: 10,
                            border:
                              "1px solid rgba(201,151,50,0.17)",
                            background:
                              "rgba(201,151,50,0.04)",
                            color:
                              "#c99732",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            fontSize: 13,
                          }}
                        >
                          ♛
                        </div>

                        <div>
                          <p
                            style={{
                              margin: 0,
                              color:
                                "rgba(249,244,237,0.72)",
                              fontSize: 10,
                              fontWeight: 900,
                            }}
                          >
                            Match Approved
                          </p>

                          <p
                            style={{
                              margin:
                                "5px 0 0",
                              color:
                                "rgba(247,241,232,0.3)",
                              fontSize: 10,
                              lineHeight: 1.5,
                            }}
                          >
                            This matchup has
                            been finalized by
                            Crown Link.
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}

        {/* FOOTER */}
        <footer
          style={{
            marginTop: 45,
            paddingTop: 17,
            borderTop:
              "1px solid rgba(201,151,50,0.09)",
            display: "flex",
            justifyContent:
              "space-between",
            gap: 12,
            flexWrap: "wrap",
            color:
              "rgba(247,241,232,0.16)",
            fontSize: 8,
            fontWeight: 900,
            letterSpacing: 2.1,
            textTransform: "uppercase",
          }}
        >
          <span>Royals Bloodline</span>
          <span>
            Crown Link · My Battles
          </span>
        </footer>
      </div>
    </main>
  );
}

function BattleDetailPill({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "7px 10px",
        borderRadius: 999,
        border:
          "1px solid rgba(201,151,50,0.13)",
        background:
          "rgba(0,0,0,0.28)",
      }}
    >
      <span
        style={{
          color:
            "rgba(247,241,232,0.25)",
          fontSize: 7,
          fontWeight: 950,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>

      <span
        style={{
          color: accent
            ? "#d9b15c"
            : "rgba(249,244,237,0.72)",
          fontSize: 9,
          fontWeight: 900,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function OpponentMetric({
  label,
  value,
  featured = false,
}: {
  label: string;
  value: string;
  featured?: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        padding: 15,
        borderRadius: 15,
        border: featured
          ? "1px solid rgba(201,151,50,0.2)"
          : "1px solid rgba(255,255,255,0.055)",
        background: featured
          ? "linear-gradient(145deg, rgba(45,5,9,0.42), rgba(0,0,0,0.32))"
          : "rgba(0,0,0,0.27)",
      }}
    >
      {featured && (
        <div
          style={{
            position: "absolute",
            width: 90,
            height: 90,
            borderRadius: "50%",
            right: -35,
            top: -45,
            background:
              "rgba(232,111,0,0.055)",
            filter: "blur(28px)",
          }}
        />
      )}

      <p
        style={{
          position: "relative",
          margin: 0,
          color:
            "rgba(247,241,232,0.27)",
          fontSize: 8,
          fontWeight: 950,
          letterSpacing: 1.4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>

      <p
        style={{
          position: "relative",
          margin: "7px 0 0",
          color: featured
            ? "#d9b15c"
            : "rgba(249,244,237,0.78)",
          fontSize: 14,
          fontWeight: 900,
        }}
      >
        {value}
      </p>
    </div>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "#c99732",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: 2.1,
  textTransform: "uppercase" as const,
};

const backButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 11px",
  borderRadius: 999,
  border:
    "1px solid rgba(201,151,50,0.14)",
  background: "rgba(0,0,0,0.28)",
  color: "#d9b15c",
  textDecoration: "none",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: 0.5,
  textTransform: "uppercase" as const,
};

const primaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  borderRadius: 999,
  border:
    "1px solid rgba(232,111,0,0.34)",
  background:
    "linear-gradient(180deg, rgba(232,111,0,0.14), rgba(76,18,0,0.18))",
  color: "#e98322",
  textDecoration: "none",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: 0.6,
  textTransform: "uppercase" as const,
};

const emptyStateStyle = {
  padding: 26,
  borderRadius: 22,
  border:
    "1px dashed rgba(201,151,50,0.18)",
  background:
    "linear-gradient(145deg, rgba(18,15,15,0.88), rgba(5,5,5,0.95))",
  boxShadow:
    "0 18px 40px rgba(0,0,0,0.28)",
};