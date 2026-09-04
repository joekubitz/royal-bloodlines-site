import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";

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
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: 35,
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
            Admin Center
          </h1>

          <p
            style={{
              marginTop: 10,
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Manage creators, agencies, events, matchmaking, and battle history.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 18,
          }}
        >
          <Link
            href="/crownlink/admin/creators"
            style={cardStyle}
          >
            <div style={iconStyle}>👤</div>

            <h2 style={titleStyle}>
              Creators
            </h2>

            <p style={textStyle}>
              Add and manage Crown Link creator accounts.
            </p>
          </Link>

          <Link
            href="/crownlink/admin/agencies"
            style={cardStyle}
          >
            <div style={iconStyle}>🏢</div>

            <h2 style={titleStyle}>
              Agencies
            </h2>

            <p style={textStyle}>
              Manage approved agencies using Crown Link.
            </p>
          </Link>

          <Link
            href="/crownlink/admin/events"
            style={cardStyle}
          >
            <div style={iconStyle}>📅</div>

            <h2 style={titleStyle}>
              Events
            </h2>

            <p style={textStyle}>
              Create battle events and manage creator signups.
            </p>
          </Link>

          <Link
            href="/crownlink/admin/matchmaking"
            style={cardStyle}
          >
            <div style={iconStyle}>⚔️</div>

            <h2 style={titleStyle}>
              Matchmaking
            </h2>

            <p style={textStyle}>
              Generate and manage creator battle matches.
            </p>
          </Link>

          <Link
            href="/crownlink/admin/battles"
            style={cardStyle}
          >
            <div style={iconStyle}>👑</div>

            <h2 style={titleStyle}>
              Battles
            </h2>

            <p style={textStyle}>
              View and manage approved Crown Link battles.
            </p>
          </Link>

          <Link
            href="/crownlink/admin/results"
            style={cardStyle}
          >
            <div style={iconStyle}>📊</div>

            <h2 style={titleStyle}>
              Past Events & Results
            </h2>

            <p style={textStyle}>
              Review archived events, scores, attendance, no-shows, and replacements.
            </p>
          </Link>

          <Link
            href="/crownlink/admin/schedule-export"
            style={cardStyle}
          >
            <div style={iconStyle}>🗓️</div>

            <h2 style={titleStyle}>
              Battle Schedule Export
            </h2>

            <p style={textStyle}>
              Preview a specific battle night and download the schedule as an image or PDF.
            </p>
          </Link>

          <Link
            href="/crownlink/admin/leaderboard"
            style={cardStyle}
          >
            <div style={iconStyle}>🏆</div>

            <h2 style={titleStyle}>
              Event Leaderboard
            </h2>

            <p style={textStyle}>
              View live and final event standings based on recorded battle scores.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}

const cardStyle = {
  display: "block",
  padding: "24px",
  borderRadius: 18,
  border: "1px solid rgba(211,163,60,0.22)",
  background: "rgba(20,10,10,0.78)",
  color: "white",
  textDecoration: "none",
  boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
};

const iconStyle = {
  fontSize: 30,
  marginBottom: 14,
};

const titleStyle = {
  margin: 0,
  fontSize: 21,
  fontWeight: 900,
};

const textStyle = {
  marginTop: 9,
  marginBottom: 0,
  color: "rgba(255,255,255,0.5)",
  fontSize: 14,
  lineHeight: 1.5,
};
