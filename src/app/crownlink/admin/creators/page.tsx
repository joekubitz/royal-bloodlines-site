import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import AddCreatorForm from "./AddCreatorForm";
import CreatorStatusButton from "./CreatorStatusButton";

export default async function CrownLinkCreatorsPage() {
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

  const { data: agencies } = await adminSupabase
    .from("crownlink_agencies")
    .select("id, name, status")
    .order("name", { ascending: true });

  const { data: creatorRoles, error: creatorRolesError } =
    await adminSupabase
      .from("user_roles")
      .select(`
        user_id,
        role,
        status,
        agency_id,
        created_at
      `)
      .eq("role", "creator")
      .order("created_at", { ascending: false });

  if (creatorRolesError) {
    console.error(
      "CROWN LINK CREATOR ROLE ERROR:",
      creatorRolesError
    );
  }

  const { data: profiles, error: profilesError } =
    await adminSupabase
      .from("crownlink_profiles")
      .select(`
        id,
        user_id,
        tiktok_username,
        display_name,
        agency_name,
        diamond_level,
        profile_status,
        profile_photo_url,
        created_at
      `);

  if (profilesError) {
    console.error(
      "CROWN LINK CREATOR PROFILE ERROR:",
      profilesError
    );
  }

  const {
    data: authUsersData,
    error: authUsersError,
  } = await adminSupabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (authUsersError) {
    console.error(
      "CROWN LINK AUTH USERS ERROR:",
      authUsersError
    );
  }

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.user_id,
      profile,
    ])
  );

  const agencyMap = new Map(
    (agencies ?? []).map((agency) => [
      agency.id,
      agency,
    ])
  );

  const authUserMap = new Map(
    (authUsersData?.users ?? []).map((authUser) => [
      authUser.id,
      authUser,
    ])
  );

  const creators = creatorRoles ?? [];

  const completedCount = creators.filter((creator) =>
    profileMap.has(creator.user_id)
  ).length;

  const incompleteCount =
    creators.length - completedCount;

  const activeCreatorCount = creators.filter(
    (creator) => creator.status === "active"
  ).length;

  const suspendedCreatorCount = creators.filter(
    (creator) => creator.status !== "active"
  ).length;

  const activeAgencies = (agencies ?? []).filter(
    (agency) => agency.status === "active"
  );

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
          <Link
            href="/crownlink/admin"
            style={backButtonStyle}
          >
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
            marginBottom: 22,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 250,
              height: 250,
              borderRadius: "50%",
              background:
                "rgba(110,7,14,0.18)",
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
                Crown Link · People & Access
              </span>
            </div>

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
              Creators
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
                color:
                  "rgba(247,241,232,0.4)",
                fontSize: 11,
                lineHeight: 1.6,
              }}
            >
              Create and manage Crown Link
              creator accounts, profile setup,
              agency assignments, and access
              status.
            </p>
          </div>
        </section>

        {/* SUMMARY */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
            marginBottom: 22,
          }}
        >
          <SummaryCard
            value={creators.length}
            label="Total Creators"
            icon="♛"
          />

          <SummaryCard
            value={activeCreatorCount}
            label="Active"
            icon="✓"
          />

          <SummaryCard
            value={completedCount}
            label="Profiles Complete"
            icon="●"
          />

          <SummaryCard
            value={incompleteCount}
            label="Awaiting Setup"
            icon="…"
          />

          {suspendedCreatorCount > 0 && (
            <SummaryCard
              value={suspendedCreatorCount}
              label="Suspended"
              icon="!"
            />
          )}
        </section>

        {/* CREATE CREATOR */}
        <section
          style={{
            padding: 20,
            borderRadius: 19,
            border:
              "1px solid rgba(201,151,50,0.13)",
            background:
              "linear-gradient(145deg, rgba(20,16,16,0.94), rgba(5,5,5,0.97))",
            boxShadow:
              "0 18px 40px rgba(0,0,0,0.26)",
            marginBottom: 26,
          }}
        >
          <div
            style={{
              marginBottom: 17,
              paddingBottom: 14,
              borderBottom:
                "1px solid rgba(201,151,50,0.07)",
            }}
          >
            <p style={sectionEyebrowStyle}>
              Creator Setup
            </p>

            <h2
              style={{
                margin: "5px 0 0",
                color: "#f9f4ed",
                fontSize: 18,
                fontWeight: 950,
              }}
            >
              Create Creator
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                color:
                  "rgba(247,241,232,0.28)",
                fontSize: 9,
                lineHeight: 1.5,
              }}
            >
              Create creator access and assign
              the account to an active agency.
            </p>
          </div>

          <AddCreatorForm
            agencies={activeAgencies.map(
              (agency) => agency.name
            )}
          />
        </section>

        {/* CREATOR DIRECTORY */}
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
                Creator Directory
              </p>

              <h2
                style={{
                  margin: "5px 0 0",
                  color: "#f9f4ed",
                  fontSize: 18,
                  fontWeight: 950,
                }}
              >
                Creator Accounts
              </h2>
            </div>

            {creators.length > 0 && (
              <span style={countPillStyle}>
                {creators.length}{" "}
                {creators.length === 1
                  ? "creator"
                  : "creators"}
              </span>
            )}
          </div>

          {creators.length === 0 ? (
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
                No Crown Link creators yet
              </p>

              <p
                style={{
                  margin: "6px 0 0",
                  color:
                    "rgba(247,241,232,0.27)",
                  fontSize: 9,
                }}
              >
                Creator accounts will appear
                here after they are created or
                registered.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              {creators.map((creator) => {
                const profile = profileMap.get(
                  creator.user_id
                );

                const authUser = authUserMap.get(
                  creator.user_id
                );

                const assignedAgency =
                  creator.agency_id
                    ? agencyMap.get(
                        creator.agency_id
                      )
                    : null;

                const profileCompleted =
                  Boolean(profile);

                const displayName =
                  profile?.display_name?.trim() ||
                  (profile?.tiktok_username
                    ? `@${profile.tiktok_username}`
                    : authUser?.email ||
                      "Creator Account");

                const email =
                  authUser?.email ||
                  "No email available";

                const agencyName =
                  assignedAgency?.name ||
                  profile?.agency_name ||
                  "No agency assigned";

                const isActive =
                  creator.status === "active";

                return (
                  <article
                    key={creator.user_id}
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
                      boxShadow:
                        "0 12px 30px rgba(0,0,0,0.20)",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(230px, 1.5fr) minmax(135px, .8fr) minmax(130px, .7fr) auto",
                        gap: 16,
                        alignItems: "center",
                      }}
                    >
                      {/* CREATOR IDENTITY */}
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
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border:
                              "1px solid rgba(201,151,50,0.14)",
                            background:
                              "rgba(201,151,50,0.04)",
                            color: "#d9b15c",
                            fontSize: 14,
                            fontWeight: 950,
                          }}
                        >
                          {profile?.display_name
                            ?.trim()
                            ?.charAt(0)
                            .toUpperCase() ||
                            profile?.tiktok_username
                              ?.charAt(0)
                              .toUpperCase() ||
                            "C"}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                              flexWrap: "wrap",
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                color: "#f9f4ed",
                                fontWeight: 950,
                                fontSize: 14,
                                overflow: "hidden",
                                textOverflow:
                                  "ellipsis",
                              }}
                            >
                              {displayName}
                            </p>

                            <span
                              style={
                                profileCompleted
                                  ? completeProfileStyle
                                  : incompleteProfileStyle
                              }
                            >
                              {profileCompleted
                                ? "Profile Complete"
                                : "Awaiting Setup"}
                            </span>
                          </div>

                          {profile?.tiktok_username &&
                            displayName !==
                              `@${profile.tiktok_username}` && (
                              <p
                                style={{
                                  margin:
                                    "4px 0 0",
                                  color: "#c99732",
                                  fontSize: 9,
                                  fontWeight: 750,
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
                              margin: "4px 0 0",
                              color:
                                "rgba(247,241,232,0.22)",
                              fontSize: 8,
                              overflowWrap:
                                "anywhere",
                            }}
                          >
                            {email}
                          </p>
                        </div>
                      </div>

                      {/* AGENCY */}
                      <CreatorDetail
                        label="Agency"
                        value={agencyName}
                      />

                      {/* DIAMONDS / SETUP */}
                      <div>
                        {profileCompleted ? (
                          <>
                            <p
                              style={
                                detailLabelStyle
                              }
                            >
                              Typical Diamonds
                            </p>

                            <p
                              style={{
                                margin:
                                  "6px 0 0",
                                color:
                                  "#d9b15c",
                                fontSize: 12,
                                fontWeight: 950,
                              }}
                            >
                              {(
                                profile?.diamond_level ??
                                0
                              ).toLocaleString()}
                            </p>
                          </>
                        ) : (
                          <>
                            <p
                              style={
                                detailLabelStyle
                              }
                            >
                              Profile
                            </p>

                            <p
                              style={{
                                margin:
                                  "6px 0 0",
                                color:
                                  "rgba(232,111,0,0.72)",
                                fontSize: 9,
                                fontWeight: 850,
                                lineHeight: 1.4,
                              }}
                            >
                              Waiting for creator
                            </p>
                          </>
                        )}
                      </div>

                      {/* STATUS */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            "flex-end",
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
                          {creator.status}
                        </span>

                        <CreatorStatusButton
                          userId={creator.user_id}
                          currentStatus={
                            creator.status as
                              | "active"
                              | "suspended"
                          }
                        />
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
            Crown Link · Creator Management
          </span>
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
        border:
          "1px solid rgba(201,151,50,0.10)",
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
          border:
            "1px solid rgba(201,151,50,0.13)",
          background:
            "rgba(201,151,50,0.035)",
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
            color:
              "rgba(247,241,232,0.25)",
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

function CreatorDetail({
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
          color:
            "rgba(247,241,232,0.73)",
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

const countPillStyle = {
  padding: "5px 8px",
  borderRadius: 999,
  border:
    "1px solid rgba(201,151,50,0.10)",
  background:
    "rgba(201,151,50,0.025)",
  color:
    "rgba(217,177,92,0.58)",
  fontSize: 7,
  fontWeight: 950,
  textTransform: "uppercase" as const,
  letterSpacing: 0.6,
};

const completeProfileStyle = {
  padding: "4px 7px",
  borderRadius: 999,
  border:
    "1px solid rgba(201,151,50,0.12)",
  background:
    "rgba(201,151,50,0.03)",
  color: "#d9b15c",
  fontSize: 6,
  fontWeight: 950,
  letterSpacing: 0.6,
  textTransform: "uppercase" as const,
};

const incompleteProfileStyle = {
  padding: "4px 7px",
  borderRadius: 999,
  border:
    "1px solid rgba(232,111,0,0.14)",
  background:
    "rgba(232,111,0,0.035)",
  color: "#e86f00",
  fontSize: 6,
  fontWeight: 950,
  letterSpacing: 0.6,
  textTransform: "uppercase" as const,
};

const activeStatusStyle = {
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

const emptyStateStyle = {
  padding: "30px 22px",
  borderRadius: 18,
  border:
    "1px dashed rgba(201,151,50,0.14)",
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
  border:
    "1px solid rgba(201,151,50,0.14)",
  background:
    "rgba(201,151,50,0.035)",
  color: "#c99732",
  fontSize: 14,
};