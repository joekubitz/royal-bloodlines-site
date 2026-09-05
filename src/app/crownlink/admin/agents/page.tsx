import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import AddAgentForm from "./AddAgentForm";

export default async function CrownLinkAgentsAdminPage() {
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

  const { data: agentRoles } = await adminSupabase
    .from("user_roles")
    .select("user_id, status, agency_id")
    .eq("role", "agent")
    .order("user_id", { ascending: true });

  const agentIds = (agentRoles ?? []).map((row) => row.user_id);

  const agencyIds = Array.from(
    new Set(
      (agentRoles ?? [])
        .map((row) => row.agency_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  let profiles: {
    user_id: string;
    display_name: string | null;
    tiktok_username: string | null;
  }[] = [];

  let codes: {
    agent_user_id: string;
    code: string;
    status: string;
  }[] = [];

  let agencies: {
    id: string;
    name: string;
  }[] = [];

  if (agentIds.length > 0) {
    const [{ data: profileData }, { data: codeData }] =
      await Promise.all([
        adminSupabase
          .from("crownlink_profiles")
          .select(`
            user_id,
            display_name,
            tiktok_username
          `)
          .in("user_id", agentIds),

        adminSupabase
          .from("crownlink_agent_codes")
          .select(`
            agent_user_id,
            code,
            status
          `)
          .in("agent_user_id", agentIds),
      ]);

    profiles = profileData ?? [];
    codes = codeData ?? [];
  }

  if (agencyIds.length > 0) {
    const { data: agencyData } = await adminSupabase
      .from("crownlink_agencies")
      .select("id, name")
      .in("id", agencyIds);

    agencies = agencyData ?? [];
  }

  const profileMap = new Map(
    profiles.map((profile) => [profile.user_id, profile])
  );

  const codeMap = new Map(
    codes.map((code) => [code.agent_user_id, code])
  );

  const agencyMap = new Map(
    agencies.map((agency) => [agency.id, agency.name])
  );

  const activeAgentCount = (agentRoles ?? []).filter(
    (role) => role.status === "active"
  ).length;

  const suspendedAgentCount = (agentRoles ?? []).filter(
    (role) => role.status !== "active"
  ).length;

  const activeCodeCount = codes.filter(
    (code) => code.status === "active"
  ).length;

  return (
    <main
      style={{
        minHeight: "100vh",
        color: "#f7f1e8",
        background: `
          radial-gradient(circle at 12% 4%, rgba(88,7,12,0.40), transparent 27%),
          radial-gradient(circle at 91% 32%, rgba(116,22,0,0.08), transparent 28%),
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
        {/* BACK */}
        <div style={{ marginBottom: 16 }}>
          <Link href="/crownlink/admin" style={backButtonStyle}>
            <span style={{ fontSize: 14 }}>←</span>
            Admin Center
          </Link>
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
            marginBottom: 22,
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
                Crown Link · People & Access
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
              Agents
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
                maxWidth: 680,
                color: "rgba(247,241,232,0.4)",
                fontSize: 11,
                lineHeight: 1.6,
              }}
            >
              Create and manage Crown Link agents, their agency
              assignments, registration codes, account status, and
              permissions.
            </p>
          </div>
        </section>

        {/* SUMMARY */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
            marginBottom: 22,
          }}
        >
          <SummaryCard
            value={(agentRoles ?? []).length}
            label="Total Agents"
            icon="♛"
          />

          <SummaryCard
            value={activeAgentCount}
            label="Active Agents"
            icon="✓"
          />

          <SummaryCard
            value={suspendedAgentCount}
            label="Suspended"
            icon="!"
          />

          <SummaryCard
            value={activeCodeCount}
            label="Active Codes"
            icon="#"
          />
        </section>

        {/* CREATE AGENT */}
        <section
          style={{
            padding: 20,
            borderRadius: 19,
            border: "1px solid rgba(201,151,50,0.13)",
            background:
              "linear-gradient(145deg, rgba(20,16,16,0.94), rgba(5,5,5,0.97))",
            boxShadow: "0 18px 40px rgba(0,0,0,0.26)",
            marginBottom: 26,
          }}
        >
          <div
            style={{
              marginBottom: 17,
              paddingBottom: 14,
              borderBottom: "1px solid rgba(201,151,50,0.07)",
            }}
          >
            <p style={sectionEyebrowStyle}>
              Agent Setup
            </p>

            <h2
              style={{
                margin: "5px 0 0",
                color: "#f9f4ed",
                fontSize: 18,
                fontWeight: 950,
              }}
            >
              Create Agent
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                color: "rgba(247,241,232,0.28)",
                fontSize: 9,
                lineHeight: 1.5,
              }}
            >
              Add a Crown Link agent and assign their agency and
              registration code.
            </p>
          </div>

          <AddAgentForm />
        </section>

        {/* CURRENT AGENTS */}
        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <div>
              <p style={sectionEyebrowStyle}>
                Agent Directory
              </p>

              <h2
                style={{
                  margin: "5px 0 0",
                  color: "#f9f4ed",
                  fontSize: 18,
                  fontWeight: 950,
                }}
              >
                Current Agents
              </h2>
            </div>

            {(agentRoles ?? []).length > 0 && (
              <span style={countPillStyle}>
                {(agentRoles ?? []).length}{" "}
                {(agentRoles ?? []).length === 1
                  ? "agent"
                  : "agents"}
              </span>
            )}
          </div>

          {!agentRoles || agentRoles.length === 0 ? (
            <div style={emptyStateStyle}>
              <div style={emptyIconStyle}>
                ♛
              </div>

              <p
                style={{
                  margin: 0,
                  color: "#f9f4ed",
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                No Crown Link agents yet
              </p>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "rgba(247,241,232,0.27)",
                  fontSize: 9,
                }}
              >
                New agents will appear here after they are created.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              {agentRoles.map((role) => {
                const profile = profileMap.get(role.user_id);
                const code = codeMap.get(role.user_id);

                const agencyName = role.agency_id
                  ? agencyMap.get(role.agency_id) ?? "Unknown Agency"
                  : "No Agency";

                const name =
                  profile?.display_name?.trim() ||
                  profile?.tiktok_username?.trim() ||
                  "Unnamed Agent";

                const isActive = role.status === "active";
                const codeIsActive = code?.status === "active";

                return (
                  <article
                    key={role.user_id}
                    style={{
                      position: "relative",
                      overflow: "hidden",
                      padding: 17,
                      borderRadius: 16,
                      border: isActive
                        ? "1px solid rgba(201,151,50,0.12)"
                        : "1px solid rgba(120,32,32,0.18)",
                      background: isActive
                        ? "linear-gradient(135deg, rgba(22,14,14,0.96), rgba(5,5,5,0.98))"
                        : "linear-gradient(135deg, rgba(38,10,12,0.45), rgba(5,5,5,0.98))",
                      boxShadow: "0 12px 30px rgba(0,0,0,0.20)",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(190px, 1.45fr) minmax(150px, 1fr) minmax(170px, 1fr) auto",
                        gap: 16,
                        alignItems: "center",
                      }}
                    >
                      {/* AGENT */}
                      <div
                        style={{
                          minWidth: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 39,
                            height: 39,
                            borderRadius: 12,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid rgba(201,151,50,0.14)",
                            background: "rgba(201,151,50,0.04)",
                            color: "#d9b15c",
                            fontSize: 15,
                          }}
                        >
                          ♛
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <p
                            style={{
                              margin: 0,
                              color: "#f9f4ed",
                              fontWeight: 950,
                              fontSize: 14,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {name}
                          </p>

                          {profile?.tiktok_username ? (
                            <p
                              style={{
                                margin: "4px 0 0",
                                color: "#c99732",
                                fontSize: 9,
                                fontWeight: 750,
                              }}
                            >
                              @{profile.tiktok_username}
                            </p>
                          ) : (
                            <p
                              style={{
                                margin: "4px 0 0",
                                color: "rgba(247,241,232,0.18)",
                                fontSize: 8,
                              }}
                            >
                              No TikTok username
                            </p>
                          )}
                        </div>
                      </div>

                      {/* AGENCY */}
                      <AgentDetail
                        label="Agency"
                        value={agencyName}
                      />

                      {/* REGISTRATION CODE */}
                      <div>
                        <p style={detailLabelStyle}>
                          Registration Code
                        </p>

                        <div
                          style={{
                            marginTop: 6,
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              padding: "5px 8px",
                              borderRadius: 8,
                              border: code
                                ? "1px solid rgba(232,111,0,0.18)"
                                : "1px solid rgba(255,255,255,0.055)",
                              background: code
                                ? "rgba(232,111,0,0.045)"
                                : "rgba(255,255,255,0.02)",
                              color: code
                                ? "#e86f00"
                                : "rgba(247,241,232,0.28)",
                              fontSize: 10,
                              fontWeight: 950,
                              letterSpacing: 0.6,
                            }}
                          >
                            {code?.code ?? "Not assigned"}
                          </span>

                          {code && (
                            <span
                              style={{
                                color: codeIsActive
                                  ? "rgba(217,177,92,0.45)"
                                  : "rgba(232,145,145,0.55)",
                                fontSize: 6,
                                fontWeight: 950,
                                letterSpacing: 0.7,
                                textTransform: "uppercase",
                              }}
                            >
                              {code.status}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ACTIONS */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={
                            isActive
                              ? activeStatusStyle
                              : suspendedStatusStyle
                          }
                        >
                          {role.status}
                        </span>

                        <Link
                          href={`/crownlink/admin/agents/${role.user_id}`}
                          style={editButtonStyle}
                        >
                          Edit
                          <span style={{ fontSize: 11 }}>→</span>
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

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
          <span>Crown Link · Agent Management</span>
        </footer>
      </div>
    </main>
  );
}

function SummaryCard({
  value,
  label,
  icon,
}: {
  value: number | string;
  label: string;
  icon: string;
}) {
  return (
    <div
      style={{
        padding: "14px 15px",
        borderRadius: 14,
        border: "1px solid rgba(201,151,50,0.10)",
        background:
          "linear-gradient(145deg, rgba(18,13,13,0.91), rgba(5,5,5,0.96))",
        display: "flex",
        alignItems: "center",
        gap: 11,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(201,151,50,0.13)",
          background: "rgba(201,151,50,0.035)",
          color: "#c99732",
          fontSize: 10,
          fontWeight: 950,
        }}
      >
        {icon}
      </div>

      <div>
        <p
          style={{
            margin: 0,
            color: "#f9f4ed",
            fontSize: 17,
            fontWeight: 950,
            lineHeight: 1,
          }}
        >
          {value}
        </p>

        <p
          style={{
            margin: "5px 0 0",
            color: "rgba(247,241,232,0.25)",
            fontSize: 7,
            fontWeight: 900,
            letterSpacing: 0.7,
            textTransform: "uppercase",
          }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

function AgentDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <p style={detailLabelStyle}>
        {label}
      </p>

      <p
        style={{
          margin: "6px 0 0",
          color: "rgba(247,241,232,0.73)",
          fontSize: 10,
          fontWeight: 800,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </p>
    </div>
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

const sectionEyebrowStyle = {
  margin: 0,
  color: "#c99732",
  fontSize: 7,
  fontWeight: 950,
  letterSpacing: 1.9,
  textTransform: "uppercase" as const,
};

const detailLabelStyle = {
  margin: 0,
  color: "rgba(247,241,232,0.24)",
  fontSize: 7,
  fontWeight: 950,
  textTransform: "uppercase" as const,
  letterSpacing: 1,
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

const countPillStyle = {
  padding: "5px 8px",
  borderRadius: 999,
  border: "1px solid rgba(201,151,50,0.10)",
  background: "rgba(201,151,50,0.025)",
  color: "rgba(217,177,92,0.58)",
  fontSize: 7,
  fontWeight: 950,
  textTransform: "uppercase" as const,
  letterSpacing: 0.6,
};

const activeStatusStyle = {
  padding: "5px 8px",
  borderRadius: 999,
  border: "1px solid rgba(201,151,50,0.14)",
  background: "rgba(201,151,50,0.035)",
  color: "#d9b15c",
  fontSize: 6,
  fontWeight: 950,
  letterSpacing: 0.7,
  textTransform: "uppercase" as const,
};

const suspendedStatusStyle = {
  padding: "5px 8px",
  borderRadius: 999,
  border: "1px solid rgba(143,48,48,0.20)",
  background: "rgba(91,17,20,0.12)",
  color: "#e89191",
  fontSize: 6,
  fontWeight: 950,
  letterSpacing: 0.7,
  textTransform: "uppercase" as const,
};

const editButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 10px",
  borderRadius: 9,
  border: "1px solid rgba(232,111,0,0.18)",
  background: "rgba(232,111,0,0.045)",
  color: "#e86f00",
  textDecoration: "none",
  fontSize: 7,
  fontWeight: 950,
  letterSpacing: 0.5,
  textTransform: "uppercase" as const,
};

const emptyStateStyle = {
  padding: "30px 22px",
  borderRadius: 18,
  border: "1px dashed rgba(201,151,50,0.14)",
  background: "rgba(10,8,8,0.72)",
  textAlign: "center" as const,
};

const emptyIconStyle = {
  width: 34,
  height: 34,
  margin: "0 auto 10px",
  borderRadius: 11,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid rgba(201,151,50,0.14)",
  background: "rgba(201,151,50,0.035)",
  color: "#c99732",
  fontSize: 14,
};