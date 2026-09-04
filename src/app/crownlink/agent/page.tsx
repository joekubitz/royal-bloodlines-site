import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import AgentBattleProfileForm from "./AgentBattleProfileForm";

export default async function CrownLinkAgentDashboardPage() {
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
    userRole.role !== "agent" ||
    userRole.status !== "active"
  ) {
    redirect("/crownlink/login");
  }

  const adminSupabase = createAdminClient();

  const [{ data: agentProfile }, { data: agentCode }, { data: creators }] =
    await Promise.all([
      adminSupabase
        .from("crownlink_profiles")
        .select(`
          user_id,
          display_name,
          tiktok_username,
          agency_name,
          diamond_level,
          profile_photo_url,
          profile_status
        `)
        .eq("user_id", user.id)
        .maybeSingle(),

      adminSupabase
        .from("crownlink_agent_codes")
        .select(`
          code,
          status
        `)
        .eq("agent_user_id", user.id)
        .maybeSingle(),

      adminSupabase
        .from("crownlink_profiles")
        .select(`
          user_id,
          display_name,
          tiktok_username,
          agency_name,
          diamond_level,
          profile_photo_url,
          profile_status
        `)
        .eq("agent_user_id", user.id)
        .order("display_name", { ascending: true }),
    ]);

  const activeCreators =
    creators?.filter((creator) => creator.profile_status === "active") ?? [];

  const displayName =
    agentProfile?.display_name?.trim() ||
    (agentProfile?.tiktok_username
      ? `@${agentProfile.tiktok_username}`
      : "Agent");

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #4b0d12 0%, #180607 35%, #050505 75%)",
        color: "white",
        padding: "36px 20px 60px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
            alignItems: "flex-start",
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#d3a33c",
                letterSpacing: 4,
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              CROWN LINK
            </p>

            <h1
              style={{
                margin: "8px 0 0",
                fontSize: 40,
                lineHeight: 1.05,
                fontWeight: 900,
              }}
            >
              Agent Dashboard
            </h1>

            <p
              style={{
                margin: "10px 0 0",
                color: "rgba(255,255,255,0.55)",
                fontSize: 14,
              }}
            >
              Welcome back, {displayName}.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <Link
              href="/crownlink/agent/events"
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(211,163,60,0.25)",
                background: "rgba(211,163,60,0.12)",
                color: "#d3a33c",
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              Team Events & Schedules
            </Link>

            <Link
              href="/crownlink/events"
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(211,163,60,0.25)",
                background: "rgba(211,163,60,0.08)",
                color: "#d3a33c",
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              Browse Events & Sign Up
            </Link>
          </div>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            marginBottom: 26,
          }}
        >
          <StatCard
            label="My Creators"
            value={String(activeCreators.length)}
          />

          <StatCard
            label="Agency"
            value={agentProfile?.agency_name || "Not set"}
          />

          <StatCard
            label="Registration Code"
            value={agentCode?.code || "Not assigned"}
            accent
          />
        </section>

        <section
          style={{
            padding: 22,
            borderRadius: 18,
            border: "1px solid rgba(211,163,60,0.2)",
            background: "rgba(20,10,10,0.76)",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "1 1 320px" }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 21,
                  fontWeight: 900,
                }}
              >
                My Battle Profile
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                Set the typical diamond amount you expect to do in a battle.
                Crown Link uses this when matching you with an opponent.
              </p>
            </div>

            <div style={{ flex: "0 1 340px", width: "100%" }}>
              <AgentBattleProfileForm
                initialDiamondLevel={Number(agentProfile?.diamond_level || 0)}
              />
            </div>
          </div>
        </section>

        <section
          style={{
            padding: 22,
            borderRadius: 18,
            border: "1px solid rgba(211,163,60,0.2)",
            background: "rgba(20,10,10,0.76)",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 21,
                  fontWeight: 900,
                }}
              >
                Team Registration Code
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                Give this code to creators on your team when they register for
                Crown Link.
              </p>
            </div>

            <div
              style={{
                padding: "13px 18px",
                borderRadius: 12,
                border: "1px solid rgba(211,163,60,0.28)",
                background: "rgba(211,163,60,0.08)",
                color: "#d3a33c",
                fontSize: 20,
                fontWeight: 950,
                letterSpacing: 2,
              }}
            >
              {agentCode?.code || "NO CODE"}
            </div>
          </div>
        </section>

        <section>
          <div
            style={{
              marginBottom: 14,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 23,
                fontWeight: 900,
              }}
            >
              My Creators
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                color: "rgba(255,255,255,0.45)",
                fontSize: 13,
              }}
            >
              Creators connected to your agent registration code.
            </p>
          </div>

          {activeCreators.length === 0 ? (
            <div
              style={{
                padding: 22,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(20,10,10,0.68)",
                color: "rgba(255,255,255,0.45)",
                fontSize: 13,
              }}
            >
              No creators are connected to your agent account yet.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              {activeCreators.map((creator) => (
                <div
                  key={creator.user_id}
                  style={{
                    padding: 17,
                    borderRadius: 15,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(20,10,10,0.72)",
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(0,1fr) minmax(120px,auto) minmax(120px,auto)",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 900,
                        fontSize: 15,
                      }}
                    >
                      {creator.display_name?.trim() ||
                        `@${creator.tiktok_username}`}
                    </p>

                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "rgba(255,255,255,0.42)",
                        fontSize: 11,
                      }}
                    >
                      @{creator.tiktok_username}
                    </p>
                  </div>

                  <div>
                    <p style={smallLabelStyle}>Agency</p>
                    <p style={smallValueStyle}>
                      {agentProfile?.agency_name || "Not set"}
                    </p>
                  </div>

                  <div>
                    <p style={smallLabelStyle}>Typical Diamonds</p>
                    <p style={smallValueStyle}>
                      {Number(creator.diamond_level || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
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
        padding: 20,
        borderRadius: 16,
        border: accent
          ? "1px solid rgba(211,163,60,0.28)"
          : "1px solid rgba(255,255,255,0.08)",
        background: accent
          ? "rgba(211,163,60,0.07)"
          : "rgba(20,10,10,0.72)",
      }}
    >
      <p style={smallLabelStyle}>{label}</p>

      <p
        style={{
          margin: "7px 0 0",
          fontSize: 22,
          fontWeight: 950,
          color: accent ? "#d3a33c" : "white",
        }}
      >
        {value}
      </p>
    </div>
  );
}

const smallLabelStyle = {
  margin: 0,
  color: "rgba(255,255,255,0.36)",
  fontSize: 9,
  fontWeight: 900,
  textTransform: "uppercase" as const,
  letterSpacing: 1,
};

const smallValueStyle = {
  margin: "5px 0 0",
  color: "rgba(255,255,255,0.82)",
  fontSize: 12,
  fontWeight: 800,
};
