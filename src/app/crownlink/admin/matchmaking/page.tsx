import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import GenerateMatchesButton from "./GenerateMatchesButton";
import MatchActions from "./MatchActions";

export default async function CrownLinkMatchmakingAdminPage() {
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

  const today = new Date().toISOString().split("T")[0];

  const { data: events } = await adminSupabase
    .from("crownlink_events")
    .select(`
      id,
      name,
      event_date,
      event_time,
      status
    `)
    .eq("status", "active")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });

  const { data: matches } = await adminSupabase
    .from("crownlink_matches")
    .select(`
      id,
      event_id,
      creator_one_id,
      creator_two_id,
      status,
      created_at
    `)
    .in("status", ["suggested", "approved"])
    .order("created_at", { ascending: true });

  const creatorIds = Array.from(
    new Set(
      (matches ?? []).flatMap((match) => [
        match.creator_one_id,
        match.creator_two_id,
      ])
    )
  );

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

  if (creatorIds.length > 0) {
    const { data: profileData } = await adminSupabase
      .from("crownlink_profiles")
      .select(`
        user_id,
        display_name,
        tiktok_username,
        diamond_level
      `)
      .in("user_id", creatorIds);

    profiles = profileData ?? [];

    const { data: roleData } = await adminSupabase
      .from("user_roles")
      .select(`
        user_id,
        agency_id
      `)
      .in("user_id", creatorIds);

    roles = roleData ?? [];
  }

  const { data: agencies } = await adminSupabase
    .from("crownlink_agencies")
    .select(`
      id,
      name
    `);

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
    (agencies ?? []).map((agency) => [
      agency.id,
      agency.name,
    ])
  );

  function getCreator(userId: string) {
    const profile = profileMap.get(userId);
    const role = roleMap.get(userId);

    const agencyName =
      role?.agency_id
        ? agencyMap.get(role.agency_id) ?? "Unknown Agency"
        : "No Agency";

    const name =
      profile?.display_name?.trim() ||
      (profile?.tiktok_username
        ? `@${profile.tiktok_username}`
        : "Creator");

    return {
      name,
      username: profile?.tiktok_username ?? "",
      diamondLevel: Number(profile?.diamond_level ?? 0),
      agencyName,
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
    const [hourString, minuteString] =
      timeString.split(":");

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
            Matchmaking
          </h1>

          <p
            style={{
              marginTop: 10,
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Generate and review 1v1 matches from event signups.
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
            No upcoming events are available for matchmaking.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 24,
            }}
          >
            {events.map((event) => {
              const eventMatches =
                matches?.filter(
                  (match) => match.event_id === event.id
                ) ?? [];

              return (
                <div
                  key={event.id}
                  style={{
                    borderRadius: 20,
                    border:
                      "1px solid rgba(211,163,60,0.22)",
                    background: "rgba(20,10,10,0.78)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: 24,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 20,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "#d3a33c",
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: 2,
                          textTransform: "uppercase",
                        }}
                      >
                        Upcoming Event
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
                          margin: "9px 0 0",
                          color: "rgba(255,255,255,0.5)",
                          fontSize: 13,
                        }}
                      >
                        {formatDate(event.event_date)}
                        {" • "}
                        {formatTime(event.event_time)}
                      </p>
                    </div>

                    {eventMatches.length === 0 && (
                      <GenerateMatchesButton
                        eventId={event.id}
                        eventName={event.name}
                      />
                    )}
                  </div>

                  <div
                    style={{
                      padding: 24,
                      borderTop:
                        "1px solid rgba(255,255,255,0.06)",
                      background: "rgba(0,0,0,0.15)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 15,
                        marginBottom: 16,
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 17,
                          fontWeight: 900,
                        }}
                      >
                        Suggested Matches
                      </h3>

                      <span
                        style={{
                          color: "rgba(255,255,255,0.4)",
                          fontSize: 12,
                        }}
                      >
                        {eventMatches.length}{" "}
                        {eventMatches.length === 1
                          ? "match"
                          : "matches"}
                      </span>
                    </div>

                    {eventMatches.length === 0 ? (
                      <p
                        style={{
                          margin: 0,
                          color: "rgba(255,255,255,0.4)",
                          fontSize: 13,
                        }}
                      >
                        No matches have been generated yet.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gap: 14,
                        }}
                      >
                        {eventMatches.map((match) => {
                          const creatorOne = getCreator(
                            match.creator_one_id
                          );

                          const creatorTwo = getCreator(
                            match.creator_two_id
                          );

                          const difference = Math.abs(
                            creatorOne.diamondLevel -
                              creatorTwo.diamondLevel
                          );

                          return (
                            <div
                              key={match.id}
                              style={{
                                padding: 20,
                                borderRadius: 16,
                                border:
                                  "1px solid rgba(211,163,60,0.16)",
                                background:
                                  "rgba(255,255,255,0.025)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent:
                                    "space-between",
                                  alignItems: "center",
                                  gap: 12,
                                  marginBottom: 18,
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    padding: "6px 10px",
                                    borderRadius: 999,
                                    background:
                                      match.status === "approved"
                                        ? "rgba(60,180,90,0.12)"
                                        : "rgba(211,163,60,0.1)",
                                    border:
                                      match.status === "approved"
                                        ? "1px solid rgba(80,210,110,0.25)"
                                        : "1px solid rgba(211,163,60,0.2)",
                                    color:
                                      match.status === "approved"
                                        ? "#b8f5c2"
                                        : "#d3a33c",
                                    fontSize: 10,
                                    fontWeight: 900,
                                    letterSpacing: 1,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {match.status}
                                </span>

                                <span
                                  style={{
                                    color:
                                      "rgba(255,255,255,0.4)",
                                    fontSize: 11,
                                  }}
                                >
                                  Diamond difference:{" "}
                                  {difference.toLocaleString()}
                                </span>
                              </div>

                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "minmax(0, 1fr) auto minmax(0, 1fr)",
                                  gap: 18,
                                  alignItems: "center",
                                }}
                              >
                                <CreatorCard
                                  creator={creatorOne}
                                />

                                <div
                                  style={{
                                    width: 46,
                                    height: 46,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background:
                                      "rgba(211,163,60,0.1)",
                                    border:
                                      "1px solid rgba(211,163,60,0.25)",
                                    color: "#d3a33c",
                                    fontSize: 13,
                                    fontWeight: 900,
                                  }}
                                >
                                  VS
                                </div>

                                <CreatorCard
                                  creator={creatorTwo}
                                />
                              </div>

                              {match.status === "suggested" && (
                                <MatchActions
                                  matchId={match.id}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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

function CreatorCard({
  creator,
}: {
  creator: {
    name: string;
    username: string;
    diamondLevel: number;
    agencyName: string;
  };
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        background: "rgba(0,0,0,0.2)",
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
            margin: "5px 0 0",
            color: "rgba(255,255,255,0.45)",
            fontSize: 12,
          }}
        >
          @{creator.username}
        </p>
      )}

      <p
        style={{
          margin: "11px 0 0",
          color: "#d3a33c",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {creator.agencyName}
      </p>

      <p
        style={{
          margin: "7px 0 0",
          color: "rgba(255,255,255,0.7)",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {creator.diamondLevel.toLocaleString()} diamonds
      </p>
    </div>
  );
}