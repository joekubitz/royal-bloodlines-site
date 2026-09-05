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
    .select(`
      role,
      status,
      can_manage_events,
      can_run_matchmaking,
      can_export_schedule,
      can_view_leaderboard
    `)
    .eq("user_id", user.id)
    .single();

  if (
    !userRole ||
    !["agent", "admin"].includes(userRole.role) ||
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

  const isAdmin = userRole.role === "admin";

  const hasAdminTools =
    userRole.can_manage_events ||
    userRole.can_run_matchmaking ||
    userRole.can_export_schedule ||
    userRole.can_view_leaderboard;

  return (
    <main
      style={{
        minHeight: "100vh",
        color: "#f7f1e8",
        background: `
          radial-gradient(circle at 16% 8%, rgba(88, 7, 12, 0.42), transparent 30%),
          radial-gradient(circle at 88% 28%, rgba(116, 22, 0, 0.11), transparent 30%),
          radial-gradient(circle at 50% 100%, rgba(66, 5, 9, 0.16), transparent 38%),
          linear-gradient(180deg, #080808 0%, #040404 46%, #010101 100%)
        `,
        padding: "30px 20px 70px",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1180,
          margin: "0 auto",
        }}
      >
        {/* HERO */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "36px 32px",
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
              background: "rgba(116, 8, 15, 0.18)",
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
              background: "rgba(232, 111, 0, 0.08)",
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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 28,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "1 1 420px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "7px 11px",
                  borderRadius: 999,
                  border: "1px solid rgba(201,151,50,0.25)",
                  background: "rgba(201,151,50,0.06)",
                  marginBottom: 14,
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

              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(42px, 7vw, 72px)",
                  lineHeight: 0.95,
                  fontWeight: 950,
                  letterSpacing: -2.8,
                  textTransform: "uppercase",
                  color: "#f9f4ed",
                  textShadow: "0 4px 30px rgba(0,0,0,0.55)",
                }}
              >
                Agent
                <br />
                Dashboard
              </h1>

              <div
                style={{
                  width: 72,
                  height: 3,
                  marginTop: 17,
                  background:
                    "linear-gradient(90deg, #e86f00, #c99732, transparent)",
                  boxShadow: "0 0 12px rgba(232,111,0,0.28)",
                }}
              />

              <p
                style={{
                  margin: "15px 0 0",
                  fontSize: 14,
                  color: "rgba(247,241,232,0.52)",
                }}
              >
                Welcome back,{" "}
                <span
                  style={{
                    color: "#d9b15c",
                    fontWeight: 900,
                  }}
                >
                  {displayName}
                </span>
                .
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 9,
                flexWrap: "wrap",
                justifyContent: "flex-end",
                maxWidth: 500,
              }}
            >
              <Link
                href="/crownlink/agent/events"
                style={heroPrimaryButton}
              >
                Team Events
              </Link>

              <Link
                href="/crownlink/events"
                style={heroSecondaryButton}
              >
                Browse Events
              </Link>

              {isAdmin && (
                <Link
                  href="/crownlink/admin"
                  style={heroGoldButton}
                >
                  Admin Center
                </Link>
              )}

              <Link
                href="/crownlink"
                style={heroSecondaryButton}
              >
                Creator View
              </Link>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
            marginBottom: 22,
          }}
        >
          <DashboardStat
            eyebrow="Your Team"
            label="Active Creators"
            value={String(activeCreators.length)}
          />

          <DashboardStat
            eyebrow="Current Agency"
            label="Agency"
            value={agentProfile?.agency_name || "Not set"}
          />

          <DashboardStat
            eyebrow="Invite Creators"
            label="Registration Code"
            value={agentCode?.code || "Not assigned"}
            featured
          />
        </section>

        {/* ADMIN TOOLS */}
        {hasAdminTools && (
          <section style={largeGlassPanel}>
            <SectionTitle
              eyebrow="Authorized Access"
              title="Admin Tools"
              description="Your account has been granted access to selected Crown Link management tools."
            />

            <div
              style={{
                marginTop: 22,
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 13,
              }}
            >
              {userRole.can_manage_events && (
                <PermissionCard
                  number="01"
                  title="Manage Events"
                  description="Create and manage Crown Link events."
                  href="/crownlink/admin/events"
                />
              )}

              {userRole.can_run_matchmaking && (
                <PermissionCard
                  number="02"
                  title="Run Matchmaking"
                  description="Generate and review creator matchups."
                  href="/crownlink/admin/matchmaking"
                />
              )}

              {userRole.can_export_schedule && (
                <PermissionCard
                  number="03"
                  title="Schedule Export"
                  description="Build downloadable battle schedules."
                  href="/crownlink/admin/schedule-export"
                />
              )}

              {userRole.can_view_leaderboard && (
                <PermissionCard
                  number="04"
                  title="Leaderboard"
                  description="View event rankings and recorded results."
                  href="/crownlink/admin/leaderboard"
                />
              )}
            </div>
          </section>
        )}

        {/* BATTLE PROFILE */}
        <section style={largeGlassPanel}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 25,
              alignItems: "center",
            }}
          >
            <SectionTitle
              eyebrow="Battle Identity"
              title="My Battle Profile"
              description="Set the typical diamond amount you expect to do during a battle. Crown Link uses this to help place you with an appropriate opponent."
            />

            <div
              style={{
                padding: 18,
                borderRadius: 18,
                border: "1px solid rgba(201,151,50,0.13)",
                background:
                  "linear-gradient(145deg, rgba(45,5,9,0.18), rgba(0,0,0,0.45))",
              }}
            >
              <AgentBattleProfileForm
                initialDiamondLevel={Number(
                  agentProfile?.diamond_level || 0
                )}
              />
            </div>
          </div>
        </section>

        {/* REGISTRATION CODE */}
        <section
          style={{
            ...largeGlassPanel,
            padding: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(300px, 1fr))",
            }}
          >
            <div
              style={{
                padding: 30,
              }}
            >
              <SectionTitle
                eyebrow="Team Access"
                title="Registration Code"
                description="Share your registration code with creators on your team so Crown Link can automatically connect them to you and your agency."
              />
            </div>

            <div
              style={{
                position: "relative",
                minHeight: 185,
                padding: 28,
                background: `
                  radial-gradient(circle at 50% 50%, rgba(232,111,0,0.11), transparent 58%),
                  linear-gradient(140deg, rgba(45,5,9,0.78), rgba(6,6,6,0.98))
                `,
                borderLeft:
                  "1px solid rgba(201,151,50,0.16)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 9,
                  letterSpacing: 3,
                  fontWeight: 950,
                  textTransform: "uppercase",
                  color: "rgba(217,177,92,0.5)",
                }}
              >
                Your Code
              </p>

              <p
                style={{
                  margin: "11px 0 0",
                  fontSize: "clamp(24px,4vw,34px)",
                  fontWeight: 950,
                  color: "#e86f00",
                  letterSpacing: 3,
                  textAlign: "center",
                  textShadow:
                    "0 0 22px rgba(232,111,0,0.18)",
                  wordBreak: "break-word",
                }}
              >
                {agentCode?.code || "NO CODE"}
              </p>
            </div>
          </div>
        </section>

        {/* CREATORS */}
        <section
          style={{
            marginTop: 26,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <SectionTitle
              eyebrow="Your Team"
              title="My Creators"
              description="Creators currently connected through your agent registration code."
            />

            <div
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid rgba(201,151,50,0.17)",
                background: "rgba(201,151,50,0.05)",
                fontSize: 11,
                fontWeight: 900,
                color: "#d9b15c",
              }}
            >
              {activeCreators.length} active
            </div>
          </div>

          {activeCreators.length === 0 ? (
            <div style={emptyStateStyle}>
              No creators are connected to your agent account yet.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 13,
              }}
            >
              {activeCreators.map((creator, index) => (
                <div
                  key={creator.user_id}
                  style={creatorCardStyle}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        flexShrink: 0,
                        borderRadius: 16,
                        background:
                          "linear-gradient(145deg, #57080d, #180305)",
                        border:
                          "1px solid rgba(201,151,50,0.28)",
                        boxShadow:
                          "0 8px 24px rgba(0,0,0,0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#d9b15c",
                        fontWeight: 950,
                        fontSize: 13,
                      }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          color: "#f9f4ed",
                          fontSize: 16,
                          fontWeight: 950,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {creator.display_name?.trim() ||
                          `@${creator.tiktok_username}`}
                      </p>

                      <p
                        style={{
                          margin: "4px 0 0",
                          color: "rgba(247,241,232,0.38)",
                          fontSize: 11,
                        }}
                      >
                        @{creator.tiktok_username}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                      marginTop: 18,
                    }}
                  >
                    <CreatorMetric
                      label="Agency"
                      value={
                        agentProfile?.agency_name || "Not set"
                      }
                    />

                    <CreatorMetric
                      label="Typical Diamonds"
                      value={Number(
                        creator.diamond_level || 0
                      ).toLocaleString()}
                      accent
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer
          style={{
            marginTop: 50,
            paddingTop: 18,
            borderTop:
              "1px solid rgba(201,151,50,0.11)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            fontSize: 9,
            letterSpacing: 2,
            fontWeight: 900,
            color: "rgba(247,241,232,0.18)",
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

function DashboardStat({
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
        padding: 22,
        borderRadius: 22,
        border: featured
          ? "1px solid rgba(201,151,50,0.32)"
          : "1px solid rgba(255,255,255,0.065)",
        background: featured
          ? "linear-gradient(145deg, rgba(49,5,9,0.9), rgba(8,8,8,0.95))"
          : "linear-gradient(145deg, rgba(18,18,18,0.92), rgba(6,6,6,0.96))",
        boxShadow: featured
          ? "0 16px 40px rgba(0,0,0,0.42), 0 0 28px rgba(88,7,12,0.12)"
          : "0 16px 40px rgba(0,0,0,0.32)",
      }}
    >
      {featured && (
        <div
          style={{
            position: "absolute",
            width: 120,
            height: 120,
            borderRadius: "50%",
            right: -30,
            top: -45,
            background: "rgba(232,111,0,0.09)",
            filter: "blur(35px)",
          }}
        />
      )}

      <p
        style={{
          margin: 0,
          color: featured
            ? "#c99732"
            : "rgba(247,241,232,0.30)",
          fontSize: 8,
          letterSpacing: 2.1,
          textTransform: "uppercase",
          fontWeight: 950,
        }}
      >
        {eyebrow}
      </p>

      <p
        style={{
          margin: "11px 0 0",
          color: featured ? "#e86f00" : "#f9f4ed",
          fontSize: featured ? 25 : 22,
          fontWeight: 950,
          lineHeight: 1.1,
          position: "relative",
        }}
      >
        {value}
      </p>

      <p
        style={{
          margin: "7px 0 0",
          color: "rgba(247,241,232,0.35)",
          fontSize: 10,
          fontWeight: 800,
        }}
      >
        {label}
      </p>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p
        style={{
          margin: 0,
          color: "#c99732",
          fontSize: 9,
          letterSpacing: 2.5,
          fontWeight: 950,
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </p>

      <h2
        style={{
          margin: "6px 0 0",
          color: "#f9f4ed",
          fontSize: "clamp(22px,3vw,28px)",
          lineHeight: 1.05,
          fontWeight: 950,
          letterSpacing: -0.7,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: "10px 0 0",
          maxWidth: 620,
          color: "rgba(247,241,232,0.42)",
          fontSize: 12,
          lineHeight: 1.65,
        }}
      >
        {description}
      </p>
    </div>
  );
}

function PermissionCard({
  number,
  title,
  description,
  href,
}: {
  number: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} style={permissionCardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            color: "rgba(201,151,50,0.48)",
            fontSize: 10,
            fontWeight: 950,
            letterSpacing: 2,
          }}
        >
          {number}
        </span>

        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            border:
              "1px solid rgba(201,151,50,0.22)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "#c99732",
            fontSize: 13,
          }}
        >
          →
        </span>
      </div>

      <div>
        <p
          style={{
            margin: 0,
            color: "#d9b15c",
            fontSize: 14,
            fontWeight: 950,
          }}
        >
          {title}
        </p>

        <p
          style={{
            margin: "7px 0 0",
            color: "rgba(247,241,232,0.34)",
            fontSize: 10,
            lineHeight: 1.55,
          }}
        >
          {description}
        </p>
      </div>
    </Link>
  );
}

function CreatorMetric({
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
        padding: 11,
        borderRadius: 13,
        background: "rgba(0,0,0,0.32)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "rgba(247,241,232,0.26)",
          fontSize: 7,
          fontWeight: 950,
          letterSpacing: 1.3,
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: "5px 0 0",
          color: accent
            ? "#d9b15c"
            : "rgba(249,244,237,0.82)",
          fontSize: 11,
          fontWeight: 900,
        }}
      >
        {value}
      </p>
    </div>
  );
}

const largeGlassPanel = {
  padding: 28,
  borderRadius: 26,
  marginBottom: 22,
  border: "1px solid rgba(201,151,50,0.14)",
  background:
    "linear-gradient(145deg, rgba(18,15,15,0.92), rgba(5,5,5,0.96))",
  boxShadow:
    "0 24px 55px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02)",
  backdropFilter: "blur(18px)",
};

const heroPrimaryButton = {
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
  boxShadow: "0 8px 20px rgba(0,0,0,0.26)",
};

const heroGoldButton = {
  padding: "11px 16px",
  borderRadius: 999,
  border: "1px solid rgba(201,151,50,0.35)",
  background:
    "linear-gradient(180deg, rgba(201,151,50,0.12), rgba(61,43,8,0.12))",
  color: "#d9b15c",
  fontSize: 10,
  fontWeight: 950,
  textDecoration: "none",
  textTransform: "uppercase" as const,
  letterSpacing: 0.7,
  boxShadow: "0 8px 20px rgba(0,0,0,0.26)",
};

const heroSecondaryButton = {
  padding: "11px 16px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(0,0,0,0.34)",
  color: "rgba(247,241,232,0.68)",
  fontSize: 10,
  fontWeight: 950,
  textDecoration: "none",
  textTransform: "uppercase" as const,
  letterSpacing: 0.7,
};

const permissionCardStyle = {
  minHeight: 135,
  padding: 17,
  borderRadius: 18,
  border: "1px solid rgba(201,151,50,0.13)",
  background:
    "linear-gradient(145deg, rgba(42,5,8,0.48), rgba(5,5,5,0.88))",
  textDecoration: "none",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between",
  gap: 20,
  boxShadow: "0 12px 28px rgba(0,0,0,0.26)",
};

const creatorCardStyle = {
  padding: 18,
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,0.06)",
  background:
    "linear-gradient(145deg, rgba(18,15,15,0.94), rgba(5,5,5,0.96))",
  boxShadow: "0 16px 35px rgba(0,0,0,0.34)",
};

const emptyStateStyle = {
  padding: 26,
  borderRadius: 20,
  border: "1px dashed rgba(201,151,50,0.19)",
  background: "rgba(10,8,8,0.74)",
  color: "rgba(247,241,232,0.4)",
  fontSize: 13,
};