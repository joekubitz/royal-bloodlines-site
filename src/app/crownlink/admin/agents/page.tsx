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
    .select("user_id, status")
    .eq("role", "agent")
    .order("user_id", { ascending: true });

  const agentIds = (agentRoles ?? []).map((row) => row.user_id);

  let profiles: {
    user_id: string;
    display_name: string | null;
    tiktok_username: string | null;
    agency_id: string | null;
  }[] = [];

  let codes: {
    agent_user_id: string;
    code: string;
    status: string;
  }[] = [];

  if (agentIds.length > 0) {
    const [{ data: profileData }, { data: codeData }] = await Promise.all([
      adminSupabase
        .from("crownlink_profiles")
        .select(`
          user_id,
          display_name,
          tiktok_username,
          agency_id
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

  const profileMap = new Map(
    profiles.map((profile) => [profile.user_id, profile])
  );

  const codeMap = new Map(
    codes.map((code) => [code.agent_user_id, code])
  );

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
              margin: 0,
              color: "#d3a33c",
              letterSpacing: 4,
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            CROWN LINK
          </p>

          <h1
            style={{
              margin: "9px 0 0",
              fontSize: 40,
              fontWeight: 900,
            }}
          >
            Agents
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.6,
            }}
          >
            Create Crown Link agent accounts and assign each agent a unique
            registration code for their team.
          </p>
        </div>

        <AddAgentForm />

        <section
          style={{
            marginTop: 24,
          }}
        >
          <h2
            style={{
              margin: "0 0 14px",
              fontSize: 22,
              fontWeight: 900,
            }}
          >
            Current Agents
          </h2>

          {!agentRoles || agentRoles.length === 0 ? (
            <div
              style={{
                padding: 22,
                borderRadius: 16,
                border: "1px solid rgba(211,163,60,0.18)",
                background: "rgba(20,10,10,0.72)",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              No Crown Link agents have been created yet.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              {agentRoles.map((role) => {
                const profile = profileMap.get(role.user_id);
                const code = codeMap.get(role.user_id);

                const name =
                  profile?.display_name?.trim() ||
                  (profile?.tiktok_username
                    ? `@${profile.tiktok_username}`
                    : "Agent");

                return (
                  <div
                    key={role.user_id}
                    style={{
                      padding: 18,
                      borderRadius: 16,
                      border: "1px solid rgba(211,163,60,0.18)",
                      background: "rgba(20,10,10,0.75)",
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(0, 1fr) minmax(160px, auto) minmax(100px, auto)",
                      gap: 16,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 900,
                          fontSize: 16,
                        }}
                      >
                        {name}
                      </p>

                      {profile?.tiktok_username &&
                        name !== `@${profile.tiktok_username}` && (
                          <p
                            style={{
                              margin: "4px 0 0",
                              color: "rgba(255,255,255,0.4)",
                              fontSize: 11,
                            }}
                          >
                            @{profile.tiktok_username}
                          </p>
                        )}
                    </div>

                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "rgba(255,255,255,0.35)",
                          fontSize: 9,
                          fontWeight: 900,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        Registration Code
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          color: "#d3a33c",
                          fontSize: 14,
                          fontWeight: 900,
                        }}
                      >
                        {code?.code ?? "Not assigned"}
                      </p>
                    </div>

                    <span
                      style={{
                        justifySelf: "end",
                        padding: "6px 9px",
                        borderRadius: 999,
                        border:
                          role.status === "active"
                            ? "1px solid rgba(80,210,110,0.22)"
                            : "1px solid rgba(255,110,110,0.2)",
                        background:
                          role.status === "active"
                            ? "rgba(60,180,90,0.08)"
                            : "rgba(255,90,90,0.08)",
                        color:
                          role.status === "active"
                            ? "#b8f5c2"
                            : "#ffb0b0",
                        fontSize: 10,
                        fontWeight: 900,
                        textTransform: "uppercase",
                      }}
                    >
                      {role.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
