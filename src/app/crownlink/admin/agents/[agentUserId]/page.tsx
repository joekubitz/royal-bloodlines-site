import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

type PageProps = {
  params: Promise<{
    agentUserId: string;
  }>;
};

export default async function EditAgentPage({ params }: PageProps) {
  const { agentUserId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/crownlink/login");
  }

  const { data: currentUserRole } = await supabase
    .from("user_roles")
    .select("role, status")
    .eq("user_id", user.id)
    .single();

  if (
    !currentUserRole ||
    currentUserRole.role !== "admin" ||
    currentUserRole.status !== "active"
  ) {
    redirect("/crownlink");
  }

  const adminSupabase = createAdminClient();

  const { data: agentRole } = await adminSupabase
    .from("user_roles")
    .select(`
      user_id,
      role,
      status,
      agency_id,
      can_manage_events,
      can_run_matchmaking,
      can_export_schedule,
      can_view_leaderboard
    `)
    .eq("user_id", agentUserId)
    .eq("role", "agent")
    .maybeSingle();

  if (!agentRole) {
    redirect("/crownlink/admin/agents");
  }

  const [{ data: profile }, { data: code }] = await Promise.all([
    adminSupabase
      .from("crownlink_profiles")
      .select(
        "user_id, display_name, tiktok_username, agency_name"
      )
      .eq("user_id", agentUserId)
      .maybeSingle(),

    adminSupabase
      .from("crownlink_agent_codes")
      .select("agent_user_id, code, status")
      .eq("agent_user_id", agentUserId)
      .maybeSingle(),
  ]);

  let agencyName = profile?.agency_name ?? "";

  if (agentRole.agency_id) {
    const { data: agency } = await adminSupabase
      .from("crownlink_agencies")
      .select("name")
      .eq("id", agentRole.agency_id)
      .maybeSingle();

    if (agency?.name) {
      agencyName = agency.name;
    }
  }

  async function updateAgent(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/crownlink/login");
    }

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .single();

    if (
      !adminRole ||
      adminRole.role !== "admin" ||
      adminRole.status !== "active"
    ) {
      redirect("/crownlink");
    }

    const adminSupabase = createAdminClient();

    const displayName = String(
      formData.get("displayName") ?? ""
    ).trim();

    const tiktokUsername = String(
      formData.get("tiktokUsername") ?? ""
    )
      .trim()
      .replace(/^@+/, "");

    const agencyName = String(
      formData.get("agencyName") ?? ""
    ).trim();

    const registrationCode = String(
      formData.get("registrationCode") ?? ""
    )
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "");

    const status = String(
      formData.get("status") ?? "active"
    );

    const canManageEvents =
      formData.get("canManageEvents") === "on";

    const canRunMatchmaking =
      formData.get("canRunMatchmaking") === "on";

    const canExportSchedule =
      formData.get("canExportSchedule") === "on";

    const canViewLeaderboard =
      formData.get("canViewLeaderboard") === "on";

    if (
      !displayName ||
      !tiktokUsername ||
      !agencyName ||
      !registrationCode
    ) {
      redirect(
        `/crownlink/admin/agents/${agentUserId}?error=missing`
      );
    }

    if (!["active", "suspended"].includes(status)) {
      redirect(
        `/crownlink/admin/agents/${agentUserId}?error=status`
      );
    }

    /*
     * Make sure registration code is not already being used
     * by a different agent.
     */
    const { data: existingCode } = await adminSupabase
      .from("crownlink_agent_codes")
      .select("agent_user_id")
      .eq("code", registrationCode)
      .neq("agent_user_id", agentUserId)
      .maybeSingle();

    if (existingCode) {
      redirect(
        `/crownlink/admin/agents/${agentUserId}?error=code`
      );
    }

    /*
     * Find or create the agency.
     */
    const { data: existingAgency } = await adminSupabase
      .from("crownlink_agencies")
      .select("id, name, status")
      .ilike("name", agencyName)
      .maybeSingle();

    let agencyId: string;

    if (existingAgency) {
      agencyId = existingAgency.id;

      if (existingAgency.status !== "active") {
        await adminSupabase
          .from("crownlink_agencies")
          .update({
            status: "active",
          })
          .eq("id", existingAgency.id);
      }
    } else {
      const { data: newAgency, error: agencyError } =
        await adminSupabase
          .from("crownlink_agencies")
          .insert({
            name: agencyName,
            status: "active",
          })
          .select("id")
          .single();

      if (agencyError || !newAgency) {
        redirect(
          `/crownlink/admin/agents/${agentUserId}?error=agency`
        );
      }

      agencyId = newAgency.id;
    }

    /*
     * Update the agent role and permissions.
     */
    const { error: roleError } = await adminSupabase
      .from("user_roles")
      .update({
        status,
        agency_id: agencyId,
        can_manage_events: canManageEvents,
        can_run_matchmaking: canRunMatchmaking,
        can_export_schedule: canExportSchedule,
        can_view_leaderboard: canViewLeaderboard,
      })
      .eq("user_id", agentUserId)
      .eq("role", "agent");

    if (roleError) {
      redirect(
        `/crownlink/admin/agents/${agentUserId}?error=save`
      );
    }

    /*
     * Update the agent's Crown Link profile.
     */
    const { error: profileError } = await adminSupabase
      .from("crownlink_profiles")
      .update({
        display_name: displayName,
        tiktok_username: tiktokUsername,
        agency_name: agencyName,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", agentUserId);

    if (profileError) {
      redirect(
        `/crownlink/admin/agents/${agentUserId}?error=profile`
      );
    }

    /*
     * Update the registration code.
     */
    const { data: currentCode } = await adminSupabase
      .from("crownlink_agent_codes")
      .select("agent_user_id")
      .eq("agent_user_id", agentUserId)
      .maybeSingle();

    if (currentCode) {
      const { error: codeError } = await adminSupabase
        .from("crownlink_agent_codes")
        .update({
          code: registrationCode,
          status:
            status === "active" ? "active" : "inactive",
          updated_at: new Date().toISOString(),
        })
        .eq("agent_user_id", agentUserId);

      if (codeError) {
        redirect(
          `/crownlink/admin/agents/${agentUserId}?error=code-save`
        );
      }
    } else {
      const { error: codeError } = await adminSupabase
        .from("crownlink_agent_codes")
        .insert({
          agent_user_id: agentUserId,
          code: registrationCode,
          status:
            status === "active" ? "active" : "inactive",
        });

      if (codeError) {
        redirect(
          `/crownlink/admin/agents/${agentUserId}?error=code-save`
        );
      }
    }

    revalidatePath("/crownlink/admin/agents");
    revalidatePath(
      `/crownlink/admin/agents/${agentUserId}`
    );

    redirect("/crownlink/admin/agents");
  }

  const agentName =
    profile?.display_name?.trim() ||
    profile?.tiktok_username?.trim() ||
    "Crown Link Agent";

  const permissionCount = [
    agentRole.can_manage_events,
    agentRole.can_run_matchmaking,
    agentRole.can_export_schedule,
    agentRole.can_view_leaderboard,
  ].filter(Boolean).length;

  const isActive = agentRole.status === "active";

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
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        {/* BACK */}
        <div style={{ marginBottom: 16 }}>
          <Link
            href="/crownlink/admin/agents"
            style={backButtonStyle}
          >
            <span style={{ fontSize: 14 }}>←</span>
            Agents
          </Link>
        </div>

        {/* HEADER */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "24px 27px",
            borderRadius: 24,
            border:
              "1px solid rgba(201,151,50,0.19)",
            background: `
              linear-gradient(
                130deg,
                rgba(48,5,9,0.90),
                rgba(14,10,10,0.95) 53%,
                rgba(3,3,3,0.98)
              )
            `,
            boxShadow:
              "0 22px 55px rgba(0,0,0,0.45)",
            marginBottom: 18,
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
                border:
                  "1px solid rgba(201,151,50,0.20)",
                background:
                  "rgba(201,151,50,0.045)",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#c99732",
                  boxShadow:
                    "0 0 8px rgba(201,151,50,0.55)",
                }}
              />

              <span style={eyebrowStyle}>
                Crown Link · Agent Management
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    color: "#f9f4ed",
                    fontSize:
                      "clamp(30px,5vw,42px)",
                    fontWeight: 950,
                    letterSpacing: -1.4,
                    lineHeight: 1,
                  }}
                >
                  Edit Agent
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
                    color:
                      "rgba(247,241,232,0.4)",
                    fontSize: 11,
                    lineHeight: 1.6,
                  }}
                >
                  Update {agentName}&apos;s profile,
                  agency, registration code, account
                  status, and Crown Link permissions.
                </p>
              </div>

              <span
                style={
                  isActive
                    ? activeStatusStyle
                    : suspendedStatusStyle
                }
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: isActive
                      ? "#d9b15c"
                      : "#e89191",
                  }}
                />

                {agentRole.status}
              </span>
            </div>
          </div>
        </section>

        {/* QUICK SUMMARY */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 9,
            marginBottom: 18,
          }}
        >
          <SummaryCard
            label="Agent"
            value={agentName}
          />

          <SummaryCard
            label="Agency"
            value={agencyName || "Not assigned"}
          />

          <SummaryCard
            label="Registration Code"
            value={code?.code || "Not assigned"}
            orange
          />

          <SummaryCard
            label="Admin Tools"
            value={`${permissionCount} of 4`}
          />
        </section>

        {/* FORM */}
        <form
          action={updateAgent}
          style={{
            display: "grid",
            gap: 16,
          }}
        >
          {/* PROFILE */}
          <section style={sectionCardStyle}>
            <SectionHeader
              eyebrow="Agent Profile"
              title="Profile & Agency"
              description="Manage the agent's Crown Link identity and agency assignment."
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 14,
              }}
            >
              <label style={labelStyle}>
                <span style={fieldLabelStyle}>
                  Display Name
                </span>

                <input
                  type="text"
                  name="displayName"
                  required
                  defaultValue={
                    profile?.display_name ?? ""
                  }
                  placeholder="Agent name"
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={fieldLabelStyle}>
                  TikTok Username
                </span>

                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 13,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#c99732",
                      fontSize: 12,
                      fontWeight: 950,
                      pointerEvents: "none",
                    }}
                  >
                    @
                  </span>

                  <input
                    type="text"
                    name="tiktokUsername"
                    required
                    defaultValue={
                      profile?.tiktok_username ?? ""
                    }
                    placeholder="username"
                    style={{
                      ...inputStyle,
                      paddingLeft: 29,
                    }}
                  />
                </div>
              </label>

              <label style={labelStyle}>
                <span style={fieldLabelStyle}>
                  Agency Name
                </span>

                <input
                  type="text"
                  name="agencyName"
                  required
                  defaultValue={agencyName}
                  placeholder="The Reservation"
                  style={inputStyle}
                />

                <span style={helperTextStyle}>
                  Changing this will move the agent to
                  the entered agency. If it does not
                  exist, Crown Link will create it.
                </span>
              </label>

              <label style={labelStyle}>
                <span style={fieldLabelStyle}>
                  Registration Code
                </span>

                <input
                  type="text"
                  name="registrationCode"
                  required
                  defaultValue={code?.code ?? ""}
                  placeholder="RESBATTLES1"
                  style={{
                    ...inputStyle,
                    color: "#e86f00",
                    fontWeight: 900,
                    letterSpacing: 0.6,
                  }}
                />

                <span style={helperTextStyle}>
                  Creators use this code when registering
                  under this agent.
                </span>
              </label>
            </div>
          </section>

          {/* ACCOUNT ACCESS */}
          <section style={sectionCardStyle}>
            <SectionHeader
              eyebrow="Account Access"
              title="Agent Status"
              description="Control whether this agent can access Crown Link."
            />

            <label style={labelStyle}>
              <span style={fieldLabelStyle}>
                Account Status
              </span>

              <select
                name="status"
                defaultValue={agentRole.status}
                style={inputStyle}
              >
                <option value="active">
                  Active
                </option>

                <option value="suspended">
                  Suspended
                </option>
              </select>

              <span style={helperTextStyle}>
                Suspending an agent also makes their
                registration code inactive when these
                changes are saved.
              </span>
            </label>
          </section>

          {/* PERMISSIONS */}
          <section style={sectionCardStyle}>
            <SectionHeader
              eyebrow="Admin Tools"
              title="Agent Permissions"
              description="Give this agent access to selected administrative tools without making them a full administrator."
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 10,
              }}
            >
              <PermissionRow
                name="canManageEvents"
                defaultChecked={
                  agentRole.can_manage_events ?? false
                }
                title="Create / Manage Events"
                description="Create events and manage event setup and signups."
                number="01"
              />

              <PermissionRow
                name="canRunMatchmaking"
                defaultChecked={
                  agentRole.can_run_matchmaking ??
                  false
                }
                title="Run Matchmaking"
                description="Generate and manage Crown Link battle matches."
                number="02"
              />

              <PermissionRow
                name="canExportSchedule"
                defaultChecked={
                  agentRole.can_export_schedule ??
                  false
                }
                title="Battle Schedule Export"
                description="Preview and export battle schedules as images or PDFs."
                number="03"
              />

              <PermissionRow
                name="canViewLeaderboard"
                defaultChecked={
                  agentRole.can_view_leaderboard ??
                  false
                }
                title="Event Leaderboard"
                description="View live and final event standings."
                number="04"
              />
            </div>
          </section>

          {/* SAVE */}
          <section
            style={{
              padding: 16,
              borderRadius: 16,
              border:
                "1px solid rgba(201,151,50,0.12)",
              background:
                "linear-gradient(135deg, rgba(35,11,8,0.72), rgba(5,5,5,0.95))",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#f9f4ed",
                  fontSize: 11,
                  fontWeight: 900,
                }}
              >
                Ready to save?
              </p>

              <p
                style={{
                  margin: "4px 0 0",
                  color:
                    "rgba(247,241,232,0.26)",
                  fontSize: 8,
                }}
              >
                Changes take effect after the agent
                record is saved.
              </p>
            </div>

            <button
              type="submit"
              style={saveButtonStyle}
            >
              Save Agent Changes
              <span style={{ fontSize: 13 }}>
                →
              </span>
            </button>
          </section>
        </form>

        <footer
          style={{
            marginTop: 40,
            paddingTop: 17,
            borderTop:
              "1px solid rgba(201,151,50,0.08)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            color:
              "rgba(247,241,232,0.14)",
            fontSize: 8,
            fontWeight: 900,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          <span>Royals Bloodline</span>
          <span>
            Crown Link · Agent Management
          </span>
        </footer>
      </div>
    </main>
  );
}

function SectionHeader({
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
        marginBottom: 16,
        paddingBottom: 13,
        borderBottom:
          "1px solid rgba(201,151,50,0.07)",
      }}
    >
      <p style={sectionEyebrowStyle}>
        {eyebrow}
      </p>

      <h2
        style={{
          margin: "5px 0 0",
          color: "#f9f4ed",
          fontSize: 17,
          fontWeight: 950,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: "6px 0 0",
          color: "rgba(247,241,232,0.27)",
          fontSize: 9,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  orange = false,
}: {
  label: string;
  value: string;
  orange?: boolean;
}) {
  return (
    <div
      style={{
        padding: "12px 13px",
        borderRadius: 13,
        border:
          "1px solid rgba(201,151,50,0.09)",
        background:
          "linear-gradient(145deg, rgba(18,13,13,0.91), rgba(5,5,5,0.96))",
        minWidth: 0,
      }}
    >
      <p
        style={{
          margin: 0,
          color:
            "rgba(247,241,232,0.22)",
          fontSize: 6,
          fontWeight: 950,
          letterSpacing: 0.9,
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: "6px 0 0",
          color: orange
            ? "#e86f00"
            : "#d9b15c",
          fontSize: 10,
          fontWeight: 950,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function PermissionRow({
  name,
  defaultChecked,
  title,
  description,
  number,
}: {
  name: string;
  defaultChecked: boolean;
  title: string;
  description: string;
  number: string;
}) {
  return (
    <label style={permissionRowStyle}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border:
            "1px solid rgba(201,151,50,0.11)",
          background:
            "rgba(201,151,50,0.025)",
          color:
            "rgba(217,177,92,0.48)",
          fontSize: 7,
          fontWeight: 950,
        }}
      >
        {number}
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <div style={permissionTitleStyle}>
          {title}
        </div>

        <div style={permissionTextStyle}>
          {description}
        </div>
      </div>

      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        style={checkboxStyle}
      />
    </label>
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
  letterSpacing: 1.8,
  textTransform: "uppercase" as const,
};

const sectionCardStyle = {
  padding: 20,
  borderRadius: 18,
  border:
    "1px solid rgba(201,151,50,0.12)",
  background:
    "linear-gradient(145deg, rgba(20,16,16,0.94), rgba(5,5,5,0.97))",
  boxShadow:
    "0 16px 36px rgba(0,0,0,0.20)",
};

const labelStyle = {
  display: "grid",
  gap: 7,
};

const fieldLabelStyle = {
  color: "rgba(247,241,232,0.53)",
  fontSize: 8,
  fontWeight: 900,
  letterSpacing: 0.7,
  textTransform: "uppercase" as const,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "11px 12px",
  borderRadius: 10,
  border:
    "1px solid rgba(201,151,50,0.11)",
  outline: "none",
  background: "#0b0707",
  color: "#f9f4ed",
  fontSize: 12,
};

const helperTextStyle = {
  color: "rgba(247,241,232,0.20)",
  fontSize: 7,
  lineHeight: 1.5,
};

const permissionRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: 12,
  borderRadius: 12,
  border:
    "1px solid rgba(201,151,50,0.08)",
  background:
    "linear-gradient(135deg, rgba(20,9,9,0.70), rgba(0,0,0,0.22))",
  cursor: "pointer",
};

const checkboxStyle = {
  width: 17,
  height: 17,
  marginTop: 2,
  cursor: "pointer",
  accentColor: "#e86f00",
  flexShrink: 0,
};

const permissionTitleStyle = {
  color: "#f9f4ed",
  fontSize: 10,
  fontWeight: 900,
};

const permissionTextStyle = {
  marginTop: 4,
  color: "rgba(247,241,232,0.25)",
  fontSize: 8,
  lineHeight: 1.45,
};

const activeStatusStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 8px",
  borderRadius: 999,
  border:
    "1px solid rgba(201,151,50,0.14)",
  background:
    "rgba(201,151,50,0.035)",
  color: "#d9b15c",
  fontSize: 6,
  fontWeight: 950,
  letterSpacing: 0.7,
  textTransform: "uppercase" as const,
};

const suspendedStatusStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 8px",
  borderRadius: 999,
  border:
    "1px solid rgba(143,48,48,0.20)",
  background:
    "rgba(91,17,20,0.12)",
  color: "#e89191",
  fontSize: 6,
  fontWeight: 950,
  letterSpacing: 0.7,
  textTransform: "uppercase" as const,
};

const backButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "7px 10px",
  borderRadius: 999,
  border:
    "1px solid rgba(201,151,50,0.13)",
  background: "rgba(0,0,0,0.28)",
  color: "#d9b15c",
  textDecoration: "none",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: 0.5,
  textTransform: "uppercase" as const,
};

const saveButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "11px 15px",
  borderRadius: 10,
  border:
    "1px solid rgba(232,111,0,0.34)",
  background:
    "linear-gradient(135deg, #e86f00, #b84800)",
  color: "#100603",
  fontWeight: 950,
  fontSize: 9,
  letterSpacing: 0.5,
  textTransform: "uppercase" as const,
  cursor: "pointer",
};