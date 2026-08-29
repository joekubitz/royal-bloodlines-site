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
            marginTop: 28,
            marginBottom: 30,
          }}
        >
          <p
            style={{
              color: "#d3a33c",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: 3,
              margin: 0,
            }}
          >
            CROWN LINK ADMIN
          </p>

          <h1
            style={{
              fontSize: 40,
              margin: "8px 0 0",
              fontWeight: 900,
            }}
          >
            Battles
          </h1>

          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              marginTop: 10,
            }}
          >
            View and manage all approved Crown Link battles.
          </p>
        </div>

        {!matches || matches.length === 0 ? (
          <div
            style={{
              padding: 26,
              borderRadius: 18,
              background: "rgba(20,10,10,0.75)",
              border: "1px solid rgba(211,163,60,0.2)",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            No approved battles yet.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            {matches.map((match) => {
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
                <div
                  key={match.id}
                  style={{
                    padding: 24,
                    borderRadius: 20,
                    background: "rgba(20,10,10,0.78)",
                    border: "1px solid rgba(211,163,60,0.22)",
                    boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 15,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "#d3a33c",
                          fontSize: 11,
                          fontWeight: 900,
                          letterSpacing: 2,
                          textTransform: "uppercase",
                        }}
                      >
                        Approved Battle
                      </p>

                      <h2
                        style={{
                          margin: "7px 0 0",
                          fontSize: 22,
                        }}
                      >
                        {event?.name ?? "Crown Link Event"}
                      </h2>

                      {event && (
                        <p
                          style={{
                            margin: "8px 0 0",
                            color: "rgba(255,255,255,0.45)",
                            fontSize: 13,
                          }}
                        >
                          {formatDate(event.event_date)}
                          {" • "}
                          {formatTime(event.event_time)}
                        </p>
                      )}
                    </div>

                    <span
                      style={{
                        padding: "7px 11px",
                        borderRadius: 999,
                        background: "rgba(60,180,90,0.12)",
                        border: "1px solid rgba(80,210,110,0.25)",
                        color: "#b8f5c2",
                        fontSize: 10,
                        fontWeight: 900,
                        letterSpacing: 1,
                      }}
                    >
                      APPROVED
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(230px, 1fr))",
                      gap: 14,
                      marginTop: 22,
                    }}
                  >
                    <div
                      style={{
                        padding: 18,
                        borderRadius: 15,
                        background: "rgba(255,255,255,0.035)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          color: "rgba(255,255,255,0.35)",
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing: 1.5,
                          textTransform: "uppercase",
                        }}
                      >
                        Creator One
                      </p>

                      <p
                        style={{
                          margin: "9px 0 0",
                          fontSize: 18,
                          fontWeight: 900,
                        }}
                      >
                        {creatorOne.name}
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "#d3a33c",
                          fontSize: 13,
                        }}
                      >
                        {creatorOne.username}
                      </p>

                      <p
                        style={{
                          margin: "14px 0 0",
                          color: "rgba(255,255,255,0.5)",
                          fontSize: 12,
                        }}
                      >
                        {creatorOne.agency}
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        {creatorOne.diamonds.toLocaleString()} diamonds
                      </p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        color: "#d3a33c",
                        fontSize: 18,
                      }}
                    >
                      VS
                    </div>

                    <div
                      style={{
                        padding: 18,
                        borderRadius: 15,
                        background: "rgba(255,255,255,0.035)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          color: "rgba(255,255,255,0.35)",
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing: 1.5,
                          textTransform: "uppercase",
                        }}
                      >
                        Creator Two
                      </p>

                      <p
                        style={{
                          margin: "9px 0 0",
                          fontSize: 18,
                          fontWeight: 900,
                        }}
                      >
                        {creatorTwo.name}
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "#d3a33c",
                          fontSize: 13,
                        }}
                      >
                        {creatorTwo.username}
                      </p>

                      <p
                        style={{
                          margin: "14px 0 0",
                          color: "rgba(255,255,255,0.5)",
                          fontSize: 12,
                        }}
                      >
                        {creatorTwo.agency}
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        {creatorTwo.diamonds.toLocaleString()} diamonds
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 16,
                      padding: 13,
                      borderRadius: 12,
                      background: "rgba(211,163,60,0.06)",
                      border: "1px solid rgba(211,163,60,0.12)",
                      textAlign: "center",
                      color: "rgba(255,255,255,0.55)",
                      fontSize: 12,
                    }}
                  >
                    Diamond difference:{" "}
                    <strong style={{ color: "#d3a33c" }}>
                      {diamondDifference.toLocaleString()}
                    </strong>
                  </div>

                  <CancelBattleButton
                    matchId={match.id}
                    creatorOneName={creatorOne.name}
                    creatorTwoName={creatorTwo.name}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}