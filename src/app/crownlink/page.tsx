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
    !["creator", "admin", "agent"].includes(userRole.role)
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

  const isAgent = userRole.role === "agent";

  return (
    <main
      style={{
        minHeight: "100vh",
        color: "#f7f1e8",
        background: `
          radial-gradient(circle at 14% 7%, rgba(88, 7, 12, 0.42), transparent 30%),
          radial-gradient(circle at 88% 26%, rgba(116, 22, 0, 0.10), transparent 30%),
          radial-gradient(circle at 50% 100%, rgba(66, 5, 9, 0.15), transparent 38%),
          linear-gradient(180deg, #080808 0%, #040404 46%, #010101 100%)
        `,
        padding: "30px 20px 70px",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {/* HERO */}

        <section
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "24px 28px",
            borderRadius: 28,
            border: "1px solid rgba(201,151,50,0.22)",
            background: `
              linear-gradient(
                130deg,
                rgba(45, 5, 9, 0.92),
                rgba(13, 10, 10, 0.94) 48%,
                rgba(3, 3, 3, 0.98)
              )
            `,
            boxShadow:
              "0 30px 70px rgba(0,0,0,0.58), 0 0 55px rgba(88,7,12,0.12)",
            marginBottom: 22,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 360,
              height: 360,
              borderRadius: "50%",
              background: "rgba(116,8,15,0.18)",
              filter: "blur(95px)",
              left: -120,
              top: -170,
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "absolute",
              width: 230,
              height: 230,
              borderRadius: "50%",
              background: "rgba(232,111,0,0.07)",
              filter: "blur(75px)",
              right: -50,
              bottom: -110,
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
                gap: 9,
                padding: "7px 11px",
                borderRadius: 999,
                border: "1px solid rgba(201,151,50,0.25)",
                background: "rgba(201,151,50,0.06)",
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#c99732",
                  boxShadow: "0 0 12px rgba(201,151,50,0.55)",
                }}
              />

              <span
                style={{
                  fontSize: 9,
                  letterSpacing: 2.4,
                  fontWeight: 950,
                  color: "#d9b15c",
                  textTransform: "uppercase",
                }}
              >
                Royals Bloodline · Crown Link
              </span>
            </div>

            <p
              style={{
                margin: 0,
                color: "#c99732",
                fontSize: 9,
                fontWeight: 950,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              The Battle Network
            </p>

            <h1
              style={{
                margin: "8px 0 0",
                fontSize: "clamp(36px,5vw,54px)",
                lineHeight: 0.9,
                fontWeight: 950,
                letterSpacing: -3,
                textTransform: "uppercase",
                color: "#f9f4ed",
                textShadow: "0 4px 30px rgba(0,0,0,0.55)",
              }}
            >
              Crown
              <br />
              <span
                style={{
                  color: "#e86f00",
                  textShadow: "0 0 24px rgba(232,111,0,0.13)",
                }}
              >
                Link
              </span>
            </h1>

            <div
              style={{
                width: 72,
                height: 3,
                marginTop: 12,
                background:
                  "linear-gradient(90deg, #e86f00, #c99732, transparent)",
                boxShadow: "0 0 12px rgba(232,111,0,0.28)",
              }}
            />

            <p
              style={{
                margin: "10px 0 0",
                color: "rgba(247,241,232,0.5)",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Connect. Match. Battle.
            </p>
          </div>
        </section>

        {/* CREATOR PROFILE */}

        <section
          style={{
            padding: 28,
            borderRadius: 26,
            border: "1px solid rgba(201,151,50,0.14)",
            background:
              "linear-gradient(145deg, rgba(18,15,15,0.92), rgba(5,5,5,0.96))",
            boxShadow:
              "0 24px 55px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02)",
            marginBottom: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div>
              <p style={eyebrowStyle}>Welcome Back</p>

              <h2
                style={{
                  margin: "7px 0 0",
                  color: "#f9f4ed",
                  fontSize: "clamp(27px,4vw,36px)",
                  lineHeight: 1.05,
                  fontWeight: 950,
                  letterSpacing: -1,
                }}
              >
                {displayName}
              </h2>

              {profile?.tiktok_username && (
                <p
                  style={{
                    margin: "8px 0 0",
                    color: "rgba(247,241,232,0.38)",
                    fontSize: 13,
                  }}
                >
                  @{profile.tiktok_username}
                </p>
              )}
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid rgba(201,151,50,0.19)",
                background: "rgba(201,151,50,0.05)",
                color: "#d9b15c",
                fontSize: 9,
                fontWeight: 950,
                letterSpacing: 1.4,
                textTransform: "uppercase",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#c99732",
                  boxShadow: "0 0 10px rgba(201,151,50,0.5)",
                }}
              />
              Active
            </div>
          </div>

          {/* PROFILE STATS */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 13,
              marginTop: 25,
            }}
          >
            <ProfileStat
              eyebrow="Your Team"
              label="Agency"
              value={agencyName}
            />

            <ProfileStat
              eyebrow="Battle Profile"
              label="Typical Diamonds"
              value={(profile?.diamond_level ?? 0).toLocaleString()}
              featured
            />
          </div>

          {/* PROFILE ACTIONS */}

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 22,
              paddingTop: 20,
              borderTop: "1px solid rgba(201,151,50,0.09)",
            }}
          >
            <Link
              href={
                isAgent
                  ? "/crownlink/agent"
                  : "/crownlink/profile/setup"
              }
              style={primaryButtonStyle}
            >
              {isAgent ? "Agent Dashboard" : "Edit Profile"}
            </Link>

            <div style={signOutWrapperStyle}>
              <SignOutButton />
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}

        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 11,
            }}
          >
            <div>
              <p style={eyebrowStyle}>Battle Center</p>

              <h2
                style={{
                  margin: "6px 0 0",
                  color: "#f9f4ed",
                  fontSize: "clamp(24px,3vw,30px)",
                  fontWeight: 950,
                  letterSpacing: -0.7,
                }}
              >
                Quick Actions
              </h2>

              <p
                style={{
                  margin: "9px 0 0",
                  color: "rgba(247,241,232,0.4)",
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                Find events, track matchmaking, and view your battles.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
            }}
          >
            <ActionCard
              number="01"
              eyebrow="Discover"
              title="Events"
              description="Browse upcoming Crown Link events and sign up to compete."
              action="View Upcoming Events"
              href="/crownlink/events"
              symbol="◇"
            />

            <ActionCard
              number="02"
              eyebrow="Match Status"
              title="Matchmaking"
              description="Check your event matchmaking status and opponent information."
              action="Check Match Status"
              href="/crownlink/matchmaking"
              symbol="⚔"
            />

            <ActionCard
              number="03"
              eyebrow="Your Schedule"
              title="My Battles"
              description="View your approved battles, opponents, dates, and battle times."
              action="View My Battles"
              href="/crownlink/battles"
              symbol="♛"
              featured
            />
          </div>
        </section>

        {/* FOOTER */}

        <footer
          style={{
            marginTop: 48,
            paddingTop: 18,
            borderTop: "1px solid rgba(201,151,50,0.1)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            color: "rgba(247,241,232,0.17)",
            fontSize: 8,
            fontWeight: 900,
            letterSpacing: 2.2,
            textTransform: "uppercase",
          }}
        >
          <span>Royals Bloodline</span>
          <span>Crown Link</span>
        </footer>
      </div>
    </main>
  );
}

function ProfileStat({
  eyebrow,
  label,
  value,
  featured = false,
}: {
  eyebrow: string;
  label: string;
  value: string;
  featured?: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        padding: 20,
        borderRadius: 19,
        border: featured
          ? "1px solid rgba(201,151,50,0.25)"
          : "1px solid rgba(255,255,255,0.06)",
        background: featured
          ? "linear-gradient(145deg, rgba(45,5,9,0.72), rgba(7,7,7,0.94))"
          : "linear-gradient(145deg, rgba(14,14,14,0.94), rgba(5,5,5,0.96))",
      }}
    >
      {featured && (
        <div
          style={{
            position: "absolute",
            width: 110,
            height: 110,
            borderRadius: "50%",
            right: -35,
            top: -45,
            background: "rgba(232,111,0,0.07)",
            filter: "blur(32px)",
          }}
        />
      )}

      <p
        style={{
          margin: 0,
          color: featured
            ? "#c99732"
            : "rgba(247,241,232,0.28)",
          fontSize: 8,
          fontWeight: 950,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </p>

      <p
        style={{
          margin: "9px 0 0",
          color: featured ? "#d9b15c" : "#f9f4ed",
          fontSize: 20,
          lineHeight: 1.15,
          fontWeight: 950,
          position: "relative",
        }}
      >
        {value}
      </p>

      <p
        style={{
          margin: "6px 0 0",
          color: "rgba(247,241,232,0.32)",
          fontSize: 9,
          fontWeight: 800,
        }}
      >
        {label}
      </p>
    </div>
  );
}

function ActionCard({
  number,
  eyebrow,
  title,
  description,
  action,
  href,
  symbol,
  featured = false,
}: {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  href: string;
  symbol: string;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        position: "relative",
        overflow: "hidden",
        minHeight: 230,
        padding: 22,
        borderRadius: 22,
        border: featured
          ? "1px solid rgba(201,151,50,0.28)"
          : "1px solid rgba(201,151,50,0.13)",
        background: featured
          ? `
            linear-gradient(
              145deg,
              rgba(48,5,9,0.82),
              rgba(7,7,7,0.96)
            )
          `
          : `
            linear-gradient(
              145deg,
              rgba(18,15,15,0.92),
              rgba(5,5,5,0.96)
            )
          `,
        boxShadow: featured
          ? "0 18px 42px rgba(0,0,0,0.4), 0 0 25px rgba(88,7,12,0.09)"
          : "0 18px 42px rgba(0,0,0,0.32)",
        color: "#f7f1e8",
        textDecoration: "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 22,
      }}
    >
      {featured && (
        <div
          style={{
            position: "absolute",
            width: 150,
            height: 150,
            borderRadius: "50%",
            right: -50,
            top: -55,
            background: "rgba(232,111,0,0.07)",
            filter: "blur(38px)",
          }}
        />
      )}

      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#c99732",
              fontSize: 8,
              fontWeight: 950,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {number} · {eyebrow}
          </p>

          <div
            style={{
              marginTop: 16,
              width: 45,
              height: 45,
              borderRadius: 14,
              border: "1px solid rgba(201,151,50,0.2)",
              background: "rgba(201,151,50,0.045)",
              color: featured ? "#e86f00" : "#d9b15c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 21,
              fontWeight: 900,
            }}
          >
            {symbol}
          </div>
        </div>

        <div
          style={{
            width: 29,
            height: 29,
            borderRadius: "50%",
            border: "1px solid rgba(201,151,50,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#c99732",
            fontSize: 14,
          }}
        >
          →
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <h3
          style={{
            margin: 0,
            color: "#f9f4ed",
            fontSize: 20,
            fontWeight: 950,
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: "8px 0 0",
            color: "rgba(247,241,232,0.37)",
            fontSize: 11,
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>

        <p
          style={{
            margin: "16px 0 0",
            color: featured ? "#e86f00" : "#d9b15c",
            fontSize: 10,
            fontWeight: 950,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {action} →
        </p>
      </div>
    </Link>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "#c99732",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: 2.5,
  textTransform: "uppercase" as const,
};

const primaryButtonStyle = {
  padding: "11px 16px",
  borderRadius: 999,
  border: "1px solid rgba(232,111,0,0.35)",
  background:
    "linear-gradient(180deg, rgba(232,111,0,0.14), rgba(76,18,0,0.18))",
  color: "#e98322",
  fontSize: 10,
  fontWeight: 950,
  textDecoration: "none",
  textTransform: "uppercase" as const,
  letterSpacing: 0.7,
};

const signOutWrapperStyle = {
  display: "flex",
  alignItems: "center",
};