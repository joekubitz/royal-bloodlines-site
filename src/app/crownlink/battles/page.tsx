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
    !["creator", "admin"].includes(userRole.role)
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
        background:
          "radial-gradient(circle at top, #4b0d12 0%, #180607 35%, #050505 75%)",
        color: "white",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <Link
          href="/crownlink"
          style={{
            color: "#d3a33c",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          ← Back to Crown Link
        </Link>

        <div
          style={{
            marginTop: 28,
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
            My Battles
          </h1>

          <p
            style={{
              marginTop: 10,
              color:
                "rgba(255,255,255,0.55)",
            }}
          >
            Your approved Crown Link matchups.
          </p>
        </div>

        {!matches ||
        matches.length === 0 ? (
          <div
            style={{
              padding: 26,
              borderRadius: 18,
              border:
                "1px solid rgba(211,163,60,0.2)",
              background:
                "rgba(20,10,10,0.75)",
            }}
          >
            <div
              style={{
                fontSize: 28,
                marginBottom: 12,
              }}
            >
              👑
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: 20,
              }}
            >
              No approved battles yet
            </h2>

            <p
              style={{
                margin: "8px 0 0",
                color:
                  "rgba(255,255,255,0.45)",
                fontSize: 13,
              }}
            >
              Once an admin approves one
              of your Crown Link matches,
              it will appear here.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            {matches.map((match) => {
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
                <div
                  key={match.id}
                  style={{
                    borderRadius: 20,
                    border:
                      "1px solid rgba(211,163,60,0.25)",
                    background:
                      "rgba(20,10,10,0.78)",
                    overflow: "hidden",
                    boxShadow:
                      "0 20px 60px rgba(0,0,0,0.25)",
                  }}
                >
                  {/* BATTLE HEADER */}

                  <div
                    style={{
                      padding: 24,
                      borderBottom:
                        "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "flex-start",
                        gap: 15,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: 0,
                            color:
                              "#d3a33c",
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: 2,
                            textTransform:
                              "uppercase",
                          }}
                        >
                          Crown Link Battle
                        </p>

                        <h2
                          style={{
                            margin:
                              "8px 0 0",
                            fontSize: 23,
                            fontWeight: 900,
                          }}
                        >
                          {event?.name ??
                            "Crown Link Event"}
                        </h2>

                        {event && (
                          <p
                            style={{
                              margin:
                                "9px 0 0",
                              color:
                                "rgba(255,255,255,0.5)",
                              fontSize: 13,
                            }}
                          >
                            {formatDate(
                              event.event_date
                            )}
                            {" • "}
                            {formatTime(
                              event.event_time
                            )}
                          </p>
                        )}
                      </div>

                      <span
                        style={{
                          padding:
                            "7px 11px",
                          borderRadius: 999,
                          background:
                            "rgba(60,180,90,0.12)",
                          border:
                            "1px solid rgba(80,210,110,0.25)",
                          color:
                            "#b8f5c2",
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing: 1,
                          textTransform:
                            "uppercase",
                        }}
                      >
                        Approved
                      </span>
                    </div>
                  </div>

                  {/* OPPONENT */}

                  <div
                    style={{
                      padding: 24,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color:
                          "rgba(255,255,255,0.4)",
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: 2,
                        textTransform:
                          "uppercase",
                      }}
                    >
                      Your Opponent
                    </p>

                    <h3
                      style={{
                        margin: "9px 0 0",
                        fontSize: 25,
                        fontWeight: 900,
                      }}
                    >
                      {opponentName}
                    </h3>

                    {opponent?.tiktok_username && (
                      <p
                        style={{
                          margin: "6px 0 0",
                          color:
                            "rgba(255,255,255,0.5)",
                          fontSize: 13,
                        }}
                      >
                        @
                        {
                          opponent.tiktok_username
                        }
                      </p>
                    )}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 12,
                        marginTop: 20,
                      }}
                    >
                      <div
                        style={{
                          padding: 15,
                          borderRadius: 13,
                          background:
                            "rgba(255,255,255,0.035)",
                          border:
                            "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            color:
                              "rgba(255,255,255,0.4)",
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform:
                              "uppercase",
                            letterSpacing: 1,
                          }}
                        >
                          Agency
                        </p>

                        <p
                          style={{
                            margin:
                              "7px 0 0",
                            color:
                              "#d3a33c",
                            fontSize: 15,
                            fontWeight: 800,
                          }}
                        >
                          {opponentAgency}
                        </p>
                      </div>

                      <div
                        style={{
                          padding: 15,
                          borderRadius: 13,
                          background:
                            "rgba(255,255,255,0.035)",
                          border:
                            "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            color:
                              "rgba(255,255,255,0.4)",
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform:
                              "uppercase",
                            letterSpacing: 1,
                          }}
                        >
                          Diamond Level
                        </p>

                        <p
                          style={{
                            margin:
                              "7px 0 0",
                            fontSize: 15,
                            fontWeight: 800,
                          }}
                        >
                          {(
                            opponent?.diamond_level ??
                            0
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
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