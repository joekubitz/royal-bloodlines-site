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

  /*
    We use the secure admin Supabase client below because this page
    needs to see every creator account, including creators who
    have not completed a Crown Link profile yet.
  */
  const adminSupabase = createAdminClient();

  /*
    Load agencies for:
    1. The Add Creator form
    2. Showing each creator's official assigned agency
  */
  const { data: agencies } = await adminSupabase
    .from("crownlink_agencies")
    .select("id, name, status")
    .order("name", { ascending: true });

  /*
    Load every Crown Link creator account.
  */
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

  /*
    Load completed creator profiles.
  */
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

  /*
    Load auth users so creators who have not completed
    their profile can still be identified by email.
  */
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

  /*
    Create lookup maps so we can combine:
    user_roles
    auth.users
    crownlink_profiles
    crownlink_agencies
  */
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

  const activeAgencies = (agencies ?? []).filter(
    (agency) => agency.status === "active"
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
          maxWidth: 1100,
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
            Creators
          </h1>

          <p
            style={{
              marginTop: 10,
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Create and manage Crown Link creator access.
          </p>
        </div>

        <AddCreatorForm
          agencies={activeAgencies.map(
            (agency) => agency.name
          )}
        />

        {/* CREATOR SUMMARY */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginTop: 32,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              padding: 18,
              borderRadius: 15,
              background: "rgba(20,10,10,0.75)",
              border:
                "1px solid rgba(211,163,60,0.2)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.45)",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Total Creators
            </p>

            <p
              style={{
                margin: "7px 0 0",
                fontSize: 27,
                fontWeight: 900,
                color: "#d3a33c",
              }}
            >
              {creators.length}
            </p>
          </div>

          <div
            style={{
              padding: 18,
              borderRadius: 15,
              background: "rgba(20,10,10,0.75)",
              border:
                "1px solid rgba(211,163,60,0.2)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.45)",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Profiles Complete
            </p>

            <p
              style={{
                margin: "7px 0 0",
                fontSize: 27,
                fontWeight: 900,
                color: "#b8f5c2",
              }}
            >
              {completedCount}
            </p>
          </div>

          <div
            style={{
              padding: 18,
              borderRadius: 15,
              background: "rgba(20,10,10,0.75)",
              border:
                "1px solid rgba(211,163,60,0.2)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.45)",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Awaiting Setup
            </p>

            <p
              style={{
                margin: "7px 0 0",
                fontSize: 27,
                fontWeight: 900,
                color: "#ffd98a",
              }}
            >
              {incompleteCount}
            </p>
          </div>
        </div>

        {/* CREATOR LIST */}

        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              Creator Accounts
            </h2>

            <span
              style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: 13,
              }}
            >
              {creators.length} total
            </span>
          </div>

          {creators.length === 0 ? (
            <div
              style={{
                padding: 24,
                borderRadius: 16,
                border:
                  "1px solid rgba(211,163,60,0.2)",
                background: "rgba(20,10,10,0.75)",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              No Crown Link creator accounts have been
              created yet.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 14,
              }}
            >
              {creators.map((creator) => {
                const profile = profileMap.get(
                  creator.user_id
                );

                const authUser = authUserMap.get(
                  creator.user_id
                );

                const assignedAgency = creator.agency_id
                  ? agencyMap.get(creator.agency_id)
                  : null;

                const profileCompleted = Boolean(profile);

                const displayName =
                  profile?.display_name?.trim() ||
                  (profile?.tiktok_username
                    ? `@${profile.tiktok_username}`
                    : authUser?.email ||
                      "Creator Account");

                const email =
                  authUser?.email || "No email available";

                const agencyName =
                  assignedAgency?.name ||
                  profile?.agency_name ||
                  "No agency assigned";

                return (
                  <div
                    key={creator.user_id}
                    style={{
                      padding: 20,
                      borderRadius: 16,
                      border:
                        "1px solid rgba(211,163,60,0.2)",
                      background:
                        "rgba(20,10,10,0.75)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                          "space-between",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          minWidth: 240,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <h3
                            style={{
                              margin: 0,
                              fontSize: 19,
                              fontWeight: 900,
                            }}
                          >
                            {displayName}
                          </h3>

                          <span
                            style={{
                              padding: "5px 9px",
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 800,
                              textTransform:
                                "uppercase",
                              letterSpacing: 1,
                              color: profileCompleted
                                ? "#b8f5c2"
                                : "#ffd98a",
                              background:
                                profileCompleted
                                  ? "rgba(60,180,90,0.10)"
                                  : "rgba(211,163,60,0.10)",
                              border:
                                profileCompleted
                                  ? "1px solid rgba(80,210,110,0.22)"
                                  : "1px solid rgba(211,163,60,0.25)",
                            }}
                          >
                            {profileCompleted
                              ? "Profile Complete"
                              : "Profile Not Completed"}
                          </span>
                        </div>

                        {profileCompleted ? (
                          <>
                            <p
                              style={{
                                margin: "7px 0 0",
                                color:
                                  "rgba(255,255,255,0.55)",
                                fontSize: 13,
                              }}
                            >
                              @
                              {
                                profile?.tiktok_username
                              }
                              {" • "}
                              {agencyName}
                              {" • "}
                              {(
                                profile?.diamond_level ?? 0
                              ).toLocaleString()}{" "}
                              diamonds
                            </p>

                            <p
                              style={{
                                margin: "5px 0 0",
                                color:
                                  "rgba(255,255,255,0.3)",
                                fontSize: 12,
                              }}
                            >
                              {email}
                            </p>
                          </>
                        ) : (
                          <>
                            <p
                              style={{
                                margin: "7px 0 0",
                                color:
                                  "rgba(255,255,255,0.55)",
                                fontSize: 13,
                              }}
                            >
                              {email}
                            </p>

                            <p
                              style={{
                                margin: "5px 0 0",
                                color:
                                  "rgba(255,255,255,0.35)",
                                fontSize: 12,
                              }}
                            >
                              {agencyName}
                              {" • "}
                              Waiting for creator to
                              complete profile setup
                            </p>
                          </>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            padding: "7px 12px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            color:
                              creator.status === "active"
                                ? "#b8f5c2"
                                : "#ffb0b0",
                            background:
                              creator.status === "active"
                                ? "rgba(60,180,90,0.12)"
                                : "rgba(255,70,70,0.1)",
                            border:
                              creator.status === "active"
                                ? "1px solid rgba(80,210,110,0.25)"
                                : "1px solid rgba(255,80,80,0.25)",
                          }}
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}