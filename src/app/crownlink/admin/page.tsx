import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

export default async function CrownLinkAdminPage() {
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

  const { data: agentCode } = await adminSupabase
    .from("crownlink_agent_codes")
    .select("id, status")
    .eq("agent_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const hasAgentAccess = Boolean(agentCode);

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
        {/* TOP NAV */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <Link href="/crownlink" style={backButtonStyle}>
            <span style={{ fontSize: 14 }}>←</span>
            Creator View
          </Link>

          {hasAgentAccess && (
            <Link href="/crownlink/agent" style={agentButtonStyle}>
              <span>♛</span>
              Agent Dashboard
              <span>→</span>
            </Link>
          )}
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
            marginBottom: 26,
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
                Crown Link · Administration
              </span>
            </div>

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
              Admin Center
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
              Your central workspace for running Crown Link events,
              matchmaking, battles, teams, and reporting.
            </p>
          </div>
        </section>

        {/* PRIMARY OPERATIONS */}
        <section style={{ marginBottom: 28 }}>
          <SectionHeading
            eyebrow="Battle Operations"
            title="Primary Operations"
            description="The tools used to run active Crown Link events."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 13,
            }}
          >
            <ControlCard
              href="/crownlink/admin/events"
              symbol="▣"
              title="Events"
              description="Create events, manage dates, and review signups."
              accent
            />

            <ControlCard
              href="/crownlink/admin/matchmaking"
              symbol="⚔"
              title="Matchmaking"
              description="Generate and manage creator matchups."
              accent
            />

            <ControlCard
              href="/crownlink/admin/battles"
              symbol="♛"
              title="Battles"
              description="Manage approved battles, attendance, scores, and replacements."
              accent
            />

            <ControlCard
              href="/crownlink/admin/schedule-export"
              symbol="▤"
              title="Schedule Export"
              description="Preview and export finalized battle schedules."
              accent
            />
          </div>
        </section>

        {/* PEOPLE & ACCESS */}
        <section style={{ marginBottom: 28 }}>
          <SectionHeading
            eyebrow="Network Management"
            title="People & Access"
            description="Manage the creators, agents, and agencies using Crown Link."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 13,
            }}
          >
            <CompactCard
              href="/crownlink/admin/creators"
              symbol="◇"
              title="Creators"
              description="Creator accounts, status, and access."
            />

            <CompactCard
              href="/crownlink/admin/agents"
              symbol="♜"
              title="Agents"
              description="Agents, registration codes, and permissions."
            />

            <CompactCard
              href="/crownlink/admin/agencies"
              symbol="◆"
              title="Agencies"
              description="Approved Crown Link agencies."
            />
          </div>
        </section>

        {/* REPORTING */}
        <section>
          <SectionHeading
            eyebrow="Performance & Records"
            title="Reporting & History"
            description="Review results, standings, and completed event history."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 13,
            }}
          >
            <WideCard
              href="/crownlink/admin/leaderboard"
              symbol="♕"
              title="Event Leaderboard"
              description="View live and final standings based on recorded battle scores."
            />

            <WideCard
              href="/crownlink/admin/results"
              symbol="◈"
              title="Past Events & Results"
              description="Review archived events, scores, attendance, no-shows, and replacements."
            />
          </div>
        </section>

        {/* FOOTER */}
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
          <span>Crown Link · Admin Center</span>
        </footer>
      </div>
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        marginBottom: 12,
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#c99732",
          fontSize: 7,
          fontWeight: 950,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 4,
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "#f9f4ed",
            fontSize: 20,
            fontWeight: 950,
            letterSpacing: -0.45,
          }}
        >
          {title}
        </h2>

        <p
          style={{
            margin: 0,
            color: "rgba(247,241,232,0.27)",
            fontSize: 9,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

function ControlCard({
  href,
  symbol,
  title,
  description,
  accent = false,
}: {
  href: string;
  symbol: string;
  title: string;
  description: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        position: "relative",
        overflow: "hidden",
        display: "block",
        minHeight: 145,
        padding: 18,
        borderRadius: 18,
        border: accent
          ? "1px solid rgba(201,151,50,0.20)"
          : "1px solid rgba(201,151,50,0.11)",
        background: `
          linear-gradient(
            145deg,
            rgba(38,5,8,0.50),
            rgba(8,8,8,0.96) 58%,
            rgba(4,4,4,0.98)
          )
        `,
        color: "#f9f4ed",
        textDecoration: "none",
        boxShadow: "0 16px 35px rgba(0,0,0,0.3)",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 110,
          height: 110,
          borderRadius: "50%",
          right: -45,
          top: -55,
          background: "rgba(232,111,0,0.045)",
          filter: "blur(35px)",
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
            width: 34,
            height: 34,
            borderRadius: 11,
            border: "1px solid rgba(201,151,50,0.17)",
            background: "rgba(201,151,50,0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#e86f00",
            fontSize: 15,
          }}
        >
          {symbol}
        </div>

        <h3
          style={{
            margin: "13px 0 0",
            color: "#f9f4ed",
            fontSize: 16,
            fontWeight: 950,
            letterSpacing: -0.3,
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: "6px 0 0",
            color: "rgba(247,241,232,0.32)",
            fontSize: 9,
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>

        <div
          style={{
            marginTop: 13,
            color: "#d9b15c",
            fontSize: 8,
            fontWeight: 950,
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          Open →
        </div>
      </div>
    </Link>
  );
}

function CompactCard({
  href,
  symbol,
  title,
  description,
}: {
  href: string;
  symbol: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 17px",
        borderRadius: 16,
        border: "1px solid rgba(201,151,50,0.11)",
        background:
          "linear-gradient(145deg, rgba(17,14,14,0.93), rgba(5,5,5,0.96))",
        color: "#f9f4ed",
        textDecoration: "none",
        boxShadow: "0 14px 30px rgba(0,0,0,0.25)",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          flexShrink: 0,
          borderRadius: 12,
          border: "1px solid rgba(201,151,50,0.16)",
          background: "rgba(201,151,50,0.035)",
          color: "#c99732",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
        }}
      >
        {symbol}
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <h3
          style={{
            margin: 0,
            color: "#f9f4ed",
            fontSize: 14,
            fontWeight: 950,
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: "4px 0 0",
            color: "rgba(247,241,232,0.29)",
            fontSize: 9,
            lineHeight: 1.45,
          }}
        >
          {description}
        </p>
      </div>

      <span
        style={{
          color: "rgba(201,151,50,0.55)",
          fontSize: 14,
        }}
      >
        →
      </span>
    </Link>
  );
}

function WideCard({
  href,
  symbol,
  title,
  description,
}: {
  href: string;
  symbol: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 15,
        padding: 18,
        borderRadius: 17,
        border: "1px solid rgba(201,151,50,0.13)",
        background:
          "linear-gradient(145deg, rgba(25,5,7,0.38), rgba(6,6,6,0.96))",
        color: "#f9f4ed",
        textDecoration: "none",
        boxShadow: "0 15px 34px rgba(0,0,0,0.27)",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          flexShrink: 0,
          borderRadius: 13,
          border: "1px solid rgba(201,151,50,0.17)",
          background: "rgba(201,151,50,0.04)",
          color: "#c99732",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 17,
        }}
      >
        {symbol}
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <h3
          style={{
            margin: 0,
            color: "#f9f4ed",
            fontSize: 15,
            fontWeight: 950,
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: "5px 0 0",
            color: "rgba(247,241,232,0.3)",
            fontSize: 9,
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      </div>

      <span
        style={{
          color: "rgba(201,151,50,0.6)",
          fontSize: 15,
        }}
      >
        →
      </span>
    </Link>
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

const agentButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 11px",
  borderRadius: 999,
  border: "1px solid rgba(232,111,0,0.22)",
  background:
    "linear-gradient(180deg, rgba(232,111,0,0.09), rgba(76,18,0,0.12))",
  color: "#e98322",
  textDecoration: "none",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: 0.5,
  textTransform: "uppercase" as const,
};