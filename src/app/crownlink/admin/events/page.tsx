import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import AddEventForm from "./AddEventForm";

export default async function CrownLinkEventsAdminPage() {
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
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });

  if (eventsError) {
    console.error("ADMIN EVENTS ERROR:", eventsError);
  }

  const { data: signups, error: signupsError } = await adminSupabase
    .from("crownlink_event_signups")
    .select(`
      id,
      event_id,
      user_id,
      status,
      created_at
    `)
    .eq("status", "signed_up");

  if (signupsError) {
    console.error("ADMIN EVENT SIGNUPS ERROR:", signupsError);
  }

  const { data: profiles, error: profilesError } = await adminSupabase
    .from("crownlink_profiles")
    .select(`
      user_id,
      display_name,
      tiktok_username,
      diamond_level
    `);

  if (profilesError) {
    console.error("ADMIN PROFILE ERROR:", profilesError);
  }

  const { data: roles, error: rolesError } = await adminSupabase
    .from("user_roles")
    .select(`
      user_id,
      agency_id
    `)
    .eq("role", "creator");

  if (rolesError) {
    console.error("ADMIN CREATOR ROLE ERROR:", rolesError);
  }

  const { data: agencies, error: agenciesError } = await adminSupabase
    .from("crownlink_agencies")
    .select(`
      id,
      name
    `);

  if (agenciesError) {
    console.error("ADMIN AGENCY ERROR:", agenciesError);
  }

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.user_id,
      profile,
    ])
  );

  const roleMap = new Map(
    (roles ?? []).map((role) => [
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
            marginTop: 24,
            marginBottom: 28,
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
            Events
          </h1>

          <p
            style={{
              marginTop: 10,
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Create events and view creator signups.
          </p>
        </div>

        {/* CREATE EVENT */}

        <AddEventForm />

        {/* EVENT LIST */}

        <div
          style={{
            marginTop: 36,
          }}
        >
          <h2
            style={{
              margin: "0 0 18px",
              fontSize: 25,
              fontWeight: 900,
            }}
          >
            Current Events
          </h2>

          {!events || events.length === 0 ? (
            <div
              style={{
                padding: 24,
                borderRadius: 18,
                border:
                  "1px solid rgba(211,163,60,0.2)",
                background:
                  "rgba(20,10,10,0.75)",
                color:
                  "rgba(255,255,255,0.5)",
              }}
            >
              No Crown Link events have been created yet.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 18,
              }}
            >
              {events.map((event) => {
                const eventSignups =
                  signups?.filter(
                    (signup) =>
                      signup.event_id === event.id
                  ) ?? [];

                return (
                  <div
                    key={event.id}
                    style={{
                      borderRadius: 20,
                      border:
                        "1px solid rgba(211,163,60,0.22)",
                      background:
                        "rgba(20,10,10,0.78)",
                      overflow: "hidden",
                    }}
                  >
                    {/* EVENT HEADER */}

                    <div
                      style={{
                        padding: 24,
                        display: "flex",
                        justifyContent:
                          "space-between",
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
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: 2,
                            textTransform:
                              "uppercase",
                          }}
                        >
                          {event.status}
                        </p>

                        <h3
                          style={{
                            margin: "8px 0 0",
                            fontSize: 22,
                            fontWeight: 900,
                          }}
                        >
                          {event.name}
                        </h3>

                        <p
                          style={{
                            margin:
                              "9px 0 0",
                            color:
                              "rgba(255,255,255,0.55)",
                            fontSize: 14,
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
                      </div>

                      <div
                        style={{
                          padding:
                            "10px 14px",
                          borderRadius: 12,
                          background:
                            "rgba(211,163,60,0.08)",
                          border:
                            "1px solid rgba(211,163,60,0.18)",
                          textAlign: "center",
                          minWidth: 100,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 900,
                            color: "#d3a33c",
                          }}
                        >
                          {eventSignups.length}
                        </div>

                        <div
                          style={{
                            marginTop: 3,
                            color:
                              "rgba(255,255,255,0.45)",
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform:
                              "uppercase",
                            letterSpacing: 1,
                          }}
                        >
                          Signed Up
                        </div>
                      </div>
                    </div>

                    {/* SIGNUPS */}

                    <div
                      style={{
                        borderTop:
                          "1px solid rgba(255,255,255,0.06)",
                        padding: 24,
                        background:
                          "rgba(0,0,0,0.12)",
                      }}
                    >
                      <h4
                        style={{
                          margin:
                            "0 0 14px",
                          fontSize: 15,
                          fontWeight: 800,
                        }}
                      >
                        Creator Signups
                      </h4>

                      {eventSignups.length ===
                      0 ? (
                        <p
                          style={{
                            margin: 0,
                            color:
                              "rgba(255,255,255,0.4)",
                            fontSize: 13,
                          }}
                        >
                          No creators have signed up yet.
                        </p>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gap: 10,
                          }}
                        >
                          {eventSignups.map(
                            (signup) => {
                              const profile =
                                profileMap.get(
                                  signup.user_id
                                );

                              const role =
                                roleMap.get(
                                  signup.user_id
                                );

                              const agencyName =
                                role?.agency_id
                                  ? agencyMap.get(
                                      role.agency_id
                                    ) ??
                                    "Unknown Agency"
                                  : "No Agency";

                              const creatorName =
                                profile?.display_name?.trim() ||
                                profile?.tiktok_username
                                  ? profile?.display_name?.trim() ||
                                    `@${profile?.tiktok_username}`
                                  : "Creator";

                              return (
                                <div
                                  key={
                                    signup.id
                                  }
                                  style={{
                                    padding:
                                      "15px 16px",
                                    borderRadius: 14,
                                    background:
                                      "rgba(255,255,255,0.035)",
                                    border:
                                      "1px solid rgba(255,255,255,0.07)",
                                    display:
                                      "flex",
                                    justifyContent:
                                      "space-between",
                                    alignItems:
                                      "center",
                                    gap: 15,
                                    flexWrap:
                                      "wrap",
                                  }}
                                >
                                  <div>
                                    <p
                                      style={{
                                        margin: 0,
                                        fontSize: 15,
                                        fontWeight: 800,
                                      }}
                                    >
                                      {
                                        creatorName
                                      }
                                    </p>

                                    {profile?.tiktok_username && (
                                      <p
                                        style={{
                                          margin:
                                            "4px 0 0",
                                          color:
                                            "rgba(255,255,255,0.45)",
                                          fontSize: 12,
                                        }}
                                      >
                                        @
                                        {
                                          profile.tiktok_username
                                        }
                                      </p>
                                    )}

                                    <p
                                      style={{
                                        margin:
                                          "6px 0 0",
                                        color:
                                          "#d3a33c",
                                        fontSize: 12,
                                        fontWeight: 700,
                                      }}
                                    >
                                      {
                                        agencyName
                                      }
                                    </p>
                                  </div>

                                  <div
                                    style={{
                                      textAlign:
                                        "right",
                                    }}
                                  >
                                    <p
                                      style={{
                                        margin: 0,
                                        color:
                                          "rgba(255,255,255,0.4)",
                                        fontSize: 10,
                                        fontWeight: 800,
                                        letterSpacing: 1,
                                        textTransform:
                                          "uppercase",
                                      }}
                                    >
                                      Diamond Level
                                    </p>

                                    <p
                                      style={{
                                        margin:
                                          "5px 0 0",
                                        fontSize: 17,
                                        fontWeight: 900,
                                      }}
                                    >
                                      {(
                                        profile?.diamond_level ??
                                        0
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}