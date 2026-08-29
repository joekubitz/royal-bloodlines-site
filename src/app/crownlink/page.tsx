import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import SignOutButton from "./SignOutButton";

export default async function CrownLinkPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/crownlink/login");
  }

  const { data: userRole, error: roleError } = await supabase
    .from("user_roles")
    .select("role, status, agency_id")
    .eq("user_id", user.id)
    .single();

  if (roleError || !userRole) {
    redirect("/crownlink/login");
  }

  if (
    userRole.status !== "active" ||
    !["creator", "admin"].includes(userRole.role)
  ) {
    redirect("/crownlink/login");
  }

  const { data: profile } = await supabase
    .from("crownlink_profiles")
    .select("display_name, tiktok_username, diamond_level")
    .eq("user_id", user.id)
    .maybeSingle();

  let agencyName = "No agency assigned";

  if (userRole.agency_id) {
    const { data: agency } = await supabase
      .from("crownlink_agencies")
      .select("name")
      .eq("id", userRole.agency_id)
      .maybeSingle();

    if (agency?.name) {
      agencyName = agency.name;
    }
  }

  const displayName =
    profile?.display_name?.trim() ||
    (profile?.tiktok_username
      ? `@${profile.tiktok_username}`
      : "Creator");

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
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "36px",
          }}
        >
          <p
            style={{
              color: "#c89b3c",
              letterSpacing: "4px",
              textTransform: "uppercase",
              fontSize: "13px",
              marginBottom: "14px",
              fontWeight: 800,
            }}
          >
            Royals Bloodline
          </p>

          <h1
            style={{
              fontSize: "clamp(46px, 8vw, 76px)",
              margin: 0,
              lineHeight: 1,
              fontWeight: 900,
            }}
          >
            Crown Link
          </h1>

          <p
            style={{
              marginTop: "18px",
              color: "#c9c9c9",
              fontSize: "17px",
            }}
          >
            Connect. Match. Battle.
          </p>
        </div>

        {/* PROFILE CARD */}

        <div
          style={{
            padding: "28px",
            borderRadius: "22px",
            border: "1px solid rgba(200, 155, 60, 0.25)",
            background: "rgba(20,10,10,0.78)",
            boxShadow: "0 25px 80px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#c89b3c",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                }}
              >
                Welcome back
              </p>

              <h2
                style={{
                  margin: "7px 0 0",
                  fontSize: "30px",
                  fontWeight: 900,
                }}
              >
                {displayName} 👑
              </h2>

              {profile?.tiktok_username && (
                <p
                  style={{
                    margin: "7px 0 0",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "14px",
                  }}
                >
                  @{profile.tiktok_username}
                </p>
              )}
            </div>

            <div
              style={{
                padding: "8px 13px",
                borderRadius: "999px",
                background: "rgba(60,180,90,0.12)",
                border: "1px solid rgba(80,210,110,0.25)",
                color: "#b8f5c2",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              Active
            </div>
          </div>

          {/* PROFILE INFO */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
              marginTop: "26px",
            }}
          >
            <div
              style={{
                padding: "18px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                }}
              >
                Agency
              </p>

              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#d3a33c",
                }}
              >
                {agencyName}
              </p>
            </div>

            <div
              style={{
                padding: "18px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                }}
              >
                Diamond Level
              </p>

              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "18px",
                  fontWeight: 800,
                }}
              >
                {(profile?.diamond_level ?? 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* PROFILE BUTTONS */}

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "22px",
            }}
          >
            <Link
              href="/crownlink/profile/setup"
              style={{
                padding: "12px 18px",
                borderRadius: "12px",
                background:
                  "linear-gradient(135deg, #d3a33c, #9e6f22)",
                color: "#080503",
                textDecoration: "none",
                fontWeight: 900,
              }}
            >
              Edit Profile
            </Link>

            <SignOutButton />
          </div>
        </div>

        {/* QUICK ACTIONS */}

        <div
          style={{
            marginTop: "30px",
          }}
        >
          <div
            style={{
              marginBottom: "15px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: 900,
              }}
            >
              Quick Actions
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                color: "rgba(255,255,255,0.45)",
                fontSize: "13px",
              }}
            >
              Find events, track matchmaking, and manage your battles.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            {/* EVENTS */}

            <Link
              href="/crownlink/events"
              style={{
                padding: "22px",
                borderRadius: "18px",
                background: "rgba(20,10,10,0.72)",
                border: "1px solid rgba(211,163,60,0.3)",
                textDecoration: "none",
                color: "white",
                display: "block",
                boxShadow: "0 12px 35px rgba(0,0,0,0.18)",
              }}
            >
              <div
                style={{
                  fontSize: "26px",
                  marginBottom: "12px",
                }}
              >
                📅
              </div>

              <h3
                style={{
                  margin: 0,
                  fontSize: "17px",
                }}
              >
                Events
              </h3>

              <p
                style={{
                  color: "#d3a33c",
                  fontSize: "13px",
                  marginBottom: 0,
                  fontWeight: 700,
                }}
              >
                View upcoming events →
              </p>
            </Link>

            {/* MATCHMAKING */}

            <Link
              href="/crownlink/matchmaking"
              style={{
                padding: "22px",
                borderRadius: "18px",
                background: "rgba(20,10,10,0.72)",
                border: "1px solid rgba(211,163,60,0.3)",
                textDecoration: "none",
                color: "white",
                display: "block",
                boxShadow: "0 12px 35px rgba(0,0,0,0.18)",
              }}
            >
              <div
                style={{
                  fontSize: "26px",
                  marginBottom: "12px",
                }}
              >
                ⚔️
              </div>

              <h3
                style={{
                  margin: 0,
                  fontSize: "17px",
                }}
              >
                Matchmaking
              </h3>

              <p
                style={{
                  color: "#d3a33c",
                  fontSize: "13px",
                  marginBottom: 0,
                  fontWeight: 700,
                }}
              >
                Check match status →
              </p>
            </Link>

            {/* MY BATTLES */}

            <Link
              href="/crownlink/battles"
              style={{
                padding: "22px",
                borderRadius: "18px",
                background: "rgba(20,10,10,0.72)",
                border: "1px solid rgba(211,163,60,0.3)",
                textDecoration: "none",
                color: "white",
                display: "block",
                boxShadow: "0 12px 35px rgba(0,0,0,0.18)",
              }}
            >
              <div
                style={{
                  fontSize: "26px",
                  marginBottom: "12px",
                }}
              >
                👑
              </div>

              <h3
                style={{
                  margin: 0,
                  fontSize: "17px",
                }}
              >
                My Battles
              </h3>

              <p
                style={{
                  color: "#d3a33c",
                  fontSize: "13px",
                  marginBottom: 0,
                  fontWeight: 700,
                }}
              >
                View approved battles →
              </p>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}