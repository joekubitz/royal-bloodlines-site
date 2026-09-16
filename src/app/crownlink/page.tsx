import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

import SignOutButton from "./SignOutButton";
import CreatorRewardProofButton from "./CreatorRewardProofButton";
import RewardLiveTimesForm from "./RewardLiveTimesForm";
import DismissibleDashboardAlert from "./DismissibleDashboardAlert";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CrownLinkPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * USER ROLE
   */
  const {
    data: userRole,
    error: roleError,
  } = await supabase
    .from("user_roles")
    .select(`
      role,
      status,
      agency_id
    `)
    .eq("user_id", user.id)
    .single();

  if (
    roleError ||
    !userRole
  ) {
    redirect("/portal");
  }

  if (
    userRole.status !== "active" ||
    ![
      "creator",
      "admin",
      "agent",
    ].includes(userRole.role)
  ) {
    redirect("/portal");
  }

  /*
   * PROFILE
   */
  const {
    data: profile,
  } = await supabase
    .from("crownlink_profiles")
    .select(`
      id,
      display_name,
      tiktok_username,
      diamond_level
    `)
    .eq("user_id", user.id)
    .maybeSingle();

  /*
   * AGENCY
   */
  let agencyName =
    "No agency assigned";

  if (userRole.agency_id) {
    const {
      data: agency,
    } = await supabase
      .from("crownlink_agencies")
      .select("name")
      .eq(
        "id",
        userRole.agency_id
      )
      .maybeSingle();

    if (agency?.name) {
      agencyName =
        agency.name;
    }
  }

  const adminSupabase =
    createAdminClient();

  /*
   * CREATOR REWARDS
   */
  type CreatorReward = {
    id: string;
    reward_month: string | null;
    reward_type: string | null;
    reward_name: string | null;
    level: string | null;
    gift: string | null;
    coins: number | null;
    money: number | string | null;
    dropped: boolean;
    dropped_at: string | null;
    proof_url: string | null;
    typical_live_times: {
      text?: string;
    } | null;
    live_timezone: string | null;
  };

  let creatorRewards: CreatorReward[] = [];

  if (
    userRole.role === "creator" &&
    profile?.id
  ) {
    const {
      data: rewardData,
      error: rewardError,
    } = await adminSupabase
      .from("rewards")
      .select(`
        id,
        reward_month,
        reward_type,
        reward_name,
        level,
        gift,
        coins,
        money,
        dropped,
        dropped_at,
        proof_url,
        typical_live_times,
        live_timezone
      `)
      .eq("creator_id", profile.id)
      .order("dropped", {
        ascending: true,
      })
      .order("created_at", {
        ascending: false,
      });

    if (rewardError) {
      console.error(
        "Creator rewards load error:",
        rewardError
      );
    }

    creatorRewards =
      (rewardData ?? []) as CreatorReward[];
  }

  const pendingCreatorRewards =
    creatorRewards.filter(
      (reward) => !reward.dropped
    );

  const deliveredCreatorRewards =
    creatorRewards.filter(
      (reward) => reward.dropped
    );

  /*
   * ATTENDANCE ENFORCEMENT
   *
   * Only creators need this warning
   * on their main Arena dashboard.
   */
  let attendanceEnforcement: {
    active_strikes: number;
    lifetime_no_shows: number;
    lifetime_replacements: number;
    signup_suspended: boolean;
    suspended_at: string | null;
    suspended_until: string | null;
    prior_suspensions: number;
    last_no_show_at: string | null;
    last_replacement_at: string | null;
  } | null = null;

  if (
    userRole.role ===
    "creator"
  ) {
    const {
      data:
        enforcementData,
      error:
        enforcementError,
    } = await adminSupabase
      .from(
        "crownlink_attendance_enforcement"
      )
      .select(`
        active_strikes,
        lifetime_no_shows,
        lifetime_replacements,
        signup_suspended,
        suspended_at,
        suspended_until,
        prior_suspensions,
        last_no_show_at,
        last_replacement_at
      `)
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

    if (enforcementError) {
      console.error(
        "Bloodline Arena enforcement load error:",
        enforcementError
      );
    }

    attendanceEnforcement =
      enforcementData ??
      null;
  }

  const activeStrikes =
    Number(
      attendanceEnforcement
        ?.active_strikes ??
        0
    );

  const lifetimeNoShows =
    Number(
      attendanceEnforcement
        ?.lifetime_no_shows ??
        0
    );

  const lifetimeReplacements =
    Number(
      attendanceEnforcement
        ?.lifetime_replacements ??
        0
    );

  const signupSuspended =
    Boolean(
      attendanceEnforcement
        ?.signup_suspended
    );

  const suspendedUntil =
    attendanceEnforcement
      ?.suspended_until ??
    null;

  /*
   * NOTIFICATIONS
   */
  const {
    data: notifications,
    error:
      notificationError,
  } = await adminSupabase
    .from(
      "crownlink_notifications"
    )
    .select(`
      id,
      type,
      title,
      message,
      href,
      is_read,
      created_at
    `)
    .eq(
      "user_id",
      user.id
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(10);

  if (
    notificationError
  ) {
    console.error(
      "Bloodline Arena notification load error:",
      notificationError
    );
  }

  const notificationList =
    notifications ?? [];

  const unreadNotifications =
    notificationList.filter(
      (notification) =>
        !notification.is_read
    );

  const unreadNotificationCount =
    unreadNotifications.length;

  const unreadSupportCount =
    unreadNotifications.filter(
      (notification) =>
        notification.type ===
        "support_reply"
    ).length;

  const latestUnreadNotification =
    unreadNotifications[0] ??
    null;

  /*
   * DISPLAY VALUES
   */
  const displayName =
    profile?.display_name?.trim() ||
    (profile?.tiktok_username
      ? `@${profile.tiktok_username}`
      : "Creator");

  const isAgent =
    userRole.role ===
    "agent";

  const rewardDismissKey =
    `rewards-${creatorRewards
      .map(
        (reward) =>
          `${reward.id}:${reward.dropped ? "dropped" : "pending"}`
      )
      .join("|")}`;

  const attendanceDismissKey =
    `attendance-${activeStrikes}-${signupSuspended ? "suspended" : "active"}-${suspendedUntil || "none"}`;

  const notificationDismissKey =
    `notification-${latestUnreadNotification?.id || "none"}-${unreadNotificationCount}`;

  return (
    <main
      style={{
        minHeight: "100vh",
        color: "#f7f1e8",

        background: `
          radial-gradient(
            circle at 14% 7%,
            rgba(88, 7, 12, 0.42),
            transparent 30%
          ),
          radial-gradient(
            circle at 88% 26%,
            rgba(116, 22, 0, 0.10),
            transparent 30%
          ),
          radial-gradient(
            circle at 50% 100%,
            rgba(66, 5, 9, 0.15),
            transparent 38%
          ),
          linear-gradient(
            180deg,
            #080808 0%,
            #040404 46%,
            #010101 100%
          )
        `,

        padding:
          "30px 20px 70px",

        overflowX:
          "hidden",
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
            position:
              "relative",

            overflow:
              "hidden",

            padding:
              "24px 28px",

            borderRadius:
              28,

            border:
              "1px solid rgba(201,151,50,0.22)",

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

            marginBottom:
              22,
          }}
        >
          <div
            style={{
              position:
                "absolute",
              width: 360,
              height: 360,
              borderRadius:
                "50%",
              background:
                "rgba(116,8,15,0.18)",
              filter:
                "blur(95px)",
              left: -120,
              top: -170,
              pointerEvents:
                "none",
            }}
          />

          <div
            style={{
              position:
                "absolute",
              width: 230,
              height: 230,
              borderRadius:
                "50%",
              background:
                "rgba(232,111,0,0.07)",
              filter:
                "blur(75px)",
              right: -50,
              bottom: -110,
              pointerEvents:
                "none",
            }}
          />

          <div
            style={{
              position:
                "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: 9,
                padding:
                  "7px 11px",
                borderRadius:
                  999,
                border:
                  "1px solid rgba(201,151,50,0.25)",
                background:
                  "rgba(201,151,50,0.06)",
                marginBottom:
                  16,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius:
                    "50%",
                  background:
                    "#c99732",
                  boxShadow:
                    "0 0 12px rgba(201,151,50,0.55)",
                }}
              />

              <span
                style={{
                  fontSize: 9,
                  letterSpacing:
                    2.4,
                  fontWeight:
                    950,
                  color:
                    "#d9b15c",
                  textTransform:
                    "uppercase",
                }}
              >
                Royals Bloodline ·
                Bloodline Arena
              </span>
            </div>

            <p
              style={{
                margin: 0,
                color:
                  "#c99732",
                fontSize: 9,
                fontWeight:
                  950,
                letterSpacing:
                  3,
                textTransform:
                  "uppercase",
              }}
            >
              The Battle Network
            </p>

            <h1
              style={{
                margin:
                  "8px 0 0",

                fontSize:
                  "clamp(36px,5vw,54px)",

                lineHeight:
                  0.9,

                fontWeight:
                  950,

                letterSpacing:
                  -3,

                textTransform:
                  "uppercase",

                color:
                  "#f9f4ed",

                textShadow:
                  "0 4px 30px rgba(0,0,0,0.55)",
              }}
            >
              Bloodline
              <br />

              <span
                style={{
                  color:
                    "#e86f00",

                  textShadow:
                    "0 0 24px rgba(232,111,0,0.13)",
                }}
              >
                Arena
              </span>
            </h1>

            <div
              style={{
                width: 72,
                height: 3,

                marginTop:
                  12,

                background:
                  "linear-gradient(90deg, #e86f00, #c99732, transparent)",

                boxShadow:
                  "0 0 12px rgba(232,111,0,0.28)",
              }}
            />

            <p
              style={{
                margin:
                  "10px 0 0",

                color:
                  "rgba(247,241,232,0.5)",

                fontSize:
                  14,

                fontWeight:
                  700,
              }}
            >
              Connect. Match.
              Battle.
            </p>
          </div>
        </section>

        {/* CREATOR PROFILE */}
        <section
          style={{
            padding: 28,

            borderRadius:
              26,

            border:
              "1px solid rgba(201,151,50,0.14)",

            background:
              "linear-gradient(145deg, rgba(18,15,15,0.92), rgba(5,5,5,0.96))",

            boxShadow:
              "0 24px 55px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02)",

            marginBottom:
              22,
          }}
        >
          <div
            style={{
              display:
                "flex",

              alignItems:
                "flex-start",

              justifyContent:
                "space-between",

              gap: 20,

              flexWrap:
                "wrap",
            }}
          >
            <div>
              <p
                style={
                  eyebrowStyle
                }
              >
                Welcome Back
              </p>

              <h2
                style={{
                  margin:
                    "7px 0 0",

                  color:
                    "#f9f4ed",

                  fontSize:
                    "clamp(27px,4vw,36px)",

                  lineHeight:
                    1.05,

                  fontWeight:
                    950,

                  letterSpacing:
                    -1,
                }}
              >
                {displayName}
              </h2>

              {profile?.tiktok_username && (
                <p
                  style={{
                    margin:
                      "8px 0 0",

                    color:
                      "rgba(247,241,232,0.38)",

                    fontSize:
                      13,
                  }}
                >
                  @
                  {
                    profile.tiktok_username
                  }
                </p>
              )}
            </div>

            <div
              style={{
                display:
                  "inline-flex",

                alignItems:
                  "center",

                gap: 8,

                padding:
                  "8px 12px",

                borderRadius:
                  999,

                border:
                  "1px solid rgba(201,151,50,0.19)",

                background:
                  "rgba(201,151,50,0.05)",

                color:
                  "#d9b15c",

                fontSize:
                  9,

                fontWeight:
                  950,

                letterSpacing:
                  1.4,

                textTransform:
                  "uppercase",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,

                  borderRadius:
                    "50%",

                  background:
                    "#c99732",
                }}
              />

              Active
            </div>
          </div>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",

              gap: 13,

              marginTop:
                25,
            }}
          >
            <ProfileStat
              eyebrow="Your Team"
              label="Agency"
              value={
                agencyName
              }
            />

            <ProfileStat
              eyebrow="Battle Profile"
              label="Typical Diamonds"
              value={(
                profile?.diamond_level ??
                0
              ).toLocaleString()}
              featured
            />
          </div>

          <div
            style={{
              display:
                "flex",

              gap: 10,

              flexWrap:
                "wrap",

              marginTop:
                22,

              paddingTop:
                20,

              borderTop:
                "1px solid rgba(201,151,50,0.09)",
            }}
          >
            <Link
              href={
                isAgent
                  ? "/bloodline-arena/agent"
                  : "/bloodline-arena/profile/setup"
              }
              style={
                primaryButtonStyle
              }
            >
              {isAgent
                ? "Agent Dashboard"
                : "Edit Profile"}
            </Link>

            <Link
              href="/bloodline-arena/notifications"
              prefetch={false}
              style={{
                ...secondaryButtonStyle,
                position:
                  "relative",
              }}
            >
              Notifications

              {unreadNotificationCount >
                0 && (
                <span
                  style={{
                    minWidth:
                      20,

                    height:
                      20,

                    padding:
                      "0 6px",

                    marginLeft:
                      8,

                    borderRadius:
                      999,

                    background:
                      "#ef4444",

                    color:
                      "#fff",

                    display:
                      "inline-flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    fontSize:
                      8,

                    fontWeight:
                      950,
                  }}
                >
                  {
                    unreadNotificationCount
                  }
                </span>
              )}
            </Link>

            <div
              style={
                signOutWrapperStyle
              }
            >
              <SignOutButton />
            </div>
          </div>
        </section>

        {/* CREATOR REWARDS */}
        <DismissibleDashboardAlert
          dismissKey={rewardDismissKey}
          ariaLabel="Close rewards alert"
        >
        {userRole.role ===
          "creator" &&
          creatorRewards.length >
            0 && (
            <section
              style={{
                marginBottom:
                  22,

                padding:
                  24,

                borderRadius:
                  24,

                border:
                  pendingCreatorRewards.length >
                  0
                    ? "1px solid rgba(245,158,11,0.38)"
                    : "1px solid rgba(34,197,94,0.25)",

                background:
                  pendingCreatorRewards.length >
                  0
                    ? "linear-gradient(135deg, rgba(92,48,4,0.74), rgba(39,17,3,0.92), rgba(7,7,7,0.98))"
                    : "linear-gradient(135deg, rgba(12,70,35,0.55), rgba(5,30,17,0.90), rgba(5,5,5,0.98))",

                boxShadow:
                  pendingCreatorRewards.length >
                  0
                    ? "0 0 34px rgba(245,158,11,0.08)"
                    : "0 0 30px rgba(34,197,94,0.06)",
              }}
            >
              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "flex-start",

                  justifyContent:
                    "space-between",

                  gap: 18,

                  flexWrap:
                    "wrap",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,

                      color:
                        pendingCreatorRewards.length >
                        0
                          ? "#fbbf24"
                          : "#86efac",

                      fontSize:
                        9,

                      fontWeight:
                        950,

                      letterSpacing:
                        2,

                      textTransform:
                        "uppercase",
                    }}
                  >
                    Creator Rewards
                  </p>

                  <h2
                    style={{
                      margin:
                        "7px 0 0",

                      color:
                        "#f9f4ed",

                      fontSize:
                        22,

                      fontWeight:
                        950,
                    }}
                  >
                    {pendingCreatorRewards.length >
                    0
                      ? `You have ${
                          pendingCreatorRewards.length
                        } pending ${
                          pendingCreatorRewards.length ===
                          1
                            ? "reward"
                            : "rewards"
                        }!`
                      : "Your Rewards"}
                  </h2>

                  <p
                    style={{
                      margin:
                        "7px 0 0",

                      color:
                        "rgba(247,241,232,0.52)",

                      fontSize:
                        12,

                      lineHeight:
                        1.6,
                    }}
                  >
                    {pendingCreatorRewards.length >
                    0
                      ? "Your reward has been recorded and is waiting to be delivered. You do not need to contact anyone unless there is an issue."
                      : "Your delivered reward history is shown below."}
                  </p>
                </div>

                <div
                  style={{
                    display:
                      "flex",

                    gap: 9,

                    flexWrap:
                      "wrap",
                  }}
                >
                  <span
                    style={{
                      padding:
                        "7px 11px",

                      borderRadius:
                        999,

                      background:
                        "rgba(245,158,11,0.10)",

                      border:
                        "1px solid rgba(245,158,11,0.24)",

                      color:
                        "#fbbf24",

                      fontSize:
                        9,

                      fontWeight:
                        950,
                    }}
                  >
                    {
                      pendingCreatorRewards.length
                    }{" "}
                    Pending
                  </span>

                  <span
                    style={{
                      padding:
                        "7px 11px",

                      borderRadius:
                        999,

                      background:
                        "rgba(34,197,94,0.10)",

                      border:
                        "1px solid rgba(34,197,94,0.22)",

                      color:
                        "#86efac",

                      fontSize:
                        9,

                      fontWeight:
                        950,
                    }}
                  >
                    {
                      deliveredCreatorRewards.length
                    }{" "}
                    Delivered
                  </span>
                </div>
              </div>

              <div
                style={{
                  display:
                    "grid",

                  gap: 12,

                  marginTop:
                    20,
                }}
              >
                {creatorRewards.map(
                  (reward) => (
                    <div
                      key={
                        reward.id
                      }
                      style={{
                        padding:
                          18,

                        borderRadius:
                          18,

                        border:
                          reward.dropped
                            ? "1px solid rgba(34,197,94,0.16)"
                            : "1px solid rgba(245,158,11,0.20)",

                        background:
                          "rgba(0,0,0,0.30)",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",

                          alignItems:
                            "flex-start",

                          justifyContent:
                            "space-between",

                          gap: 14,

                          flexWrap:
                            "wrap",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display:
                                "flex",

                              gap: 9,

                              alignItems:
                                "center",

                              flexWrap:
                                "wrap",
                            }}
                          >
                            <strong
                              style={{
                                color:
                                  "#f9f4ed",

                                fontSize:
                                  16,
                              }}
                            >
                              🎁{" "}
                              {reward.gift ||
                                "Reward"}
                            </strong>

                            <span
                              style={{
                                padding:
                                  "5px 8px",

                                borderRadius:
                                  999,

                                background:
                                  reward.dropped
                                    ? "rgba(34,197,94,0.12)"
                                    : "rgba(245,158,11,0.12)",

                                color:
                                  reward.dropped
                                    ? "#86efac"
                                    : "#fbbf24",

                                fontSize:
                                  8,

                                fontWeight:
                                  950,

                                textTransform:
                                  "uppercase",
                              }}
                            >
                              {reward.dropped
                                ? "Delivered"
                                : "Pending"}
                            </span>
                          </div>

                          <p
                            style={{
                              margin:
                                "8px 0 0",

                              color:
                                "rgba(247,241,232,0.48)",

                              fontSize:
                                11,
                            }}
                          >
                            {reward.reward_name ||
                              "Reward"}

                            {reward.level
                              ? ` · ${reward.level}`
                              : ""}
                          </p>

                          <div
                            style={{
                              display:
                                "flex",

                              gap: 16,

                              flexWrap:
                                "wrap",

                              marginTop:
                                12,
                            }}
                          >
                            <span
                              style={{
                                color:
                                  "rgba(247,241,232,0.68)",

                                fontSize:
                                  11,
                              }}
                            >
                              <strong>
                                {Number(
                                  reward.coins ??
                                    0
                                ).toLocaleString()}
                              </strong>{" "}
                              coins
                            </span>

                            {reward.reward_month && (
                              <span
                                style={{
                                  color:
                                    "rgba(247,241,232,0.42)",

                                  fontSize:
                                    11,
                                }}
                              >
                                {
                                  reward.reward_month
                                }
                              </span>
                            )}

                            {reward.dropped_at && (
                              <span
                                style={{
                                  color:
                                    "#86efac",

                                  fontSize:
                                    11,
                                }}
                              >
                                Delivered{" "}
                                {new Date(
                                  reward.dropped_at
                                ).toLocaleDateString(
                                  "en-US",
                                  {
                                    month:
                                      "short",

                                    day:
                                      "numeric",

                                    year:
                                      "numeric",
                                  }
                                )}
                              </span>
                            )}
                          </div>

                          {!reward.dropped && (
                            <RewardLiveTimesForm
                              rewardId={reward.id}
                              initialTimes={
                                reward.typical_live_times
                                  ?.text || ""
                              }
                              initialTimezone={
                                reward.live_timezone
                              }
                            />
                          )}
                        </div>

                        {reward.dropped &&
                          reward.proof_url && (
                            <CreatorRewardProofButton
                              rewardId={
                                reward.id
                              }
                            />
                          )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>
          )}

        </DismissibleDashboardAlert>

        {/* ATTENDANCE / NO-SHOW WARNING */}
        <DismissibleDashboardAlert
          dismissKey={attendanceDismissKey}
          ariaLabel="Close attendance warning"
        >
        {userRole.role ===
          "creator" &&
          (activeStrikes >
            0 ||
            signupSuspended) && (
            <section
              className={
                signupSuspended ||
                activeStrikes >= 2
                  ? "attendance-alert-pulse"
                  : undefined
              }
              style={{
                marginBottom:
                  22,

                padding:
                  22,

                borderRadius:
                  22,

                border:
                  signupSuspended
                    ? "1px solid rgba(239,68,68,0.50)"
                    : activeStrikes >=
                        2
                      ? "1px solid rgba(239,68,68,0.38)"
                      : "1px solid rgba(245,158,11,0.38)",

                background:
                  signupSuspended
                    ? "linear-gradient(135deg, rgba(100,10,15,0.92), rgba(45,5,8,0.95), rgba(8,8,8,0.98))"
                    : activeStrikes >=
                        2
                      ? "linear-gradient(135deg, rgba(90,15,15,0.86), rgba(35,7,7,0.94), rgba(8,8,8,0.98))"
                      : "linear-gradient(135deg, rgba(95,50,5,0.72), rgba(40,18,3,0.92), rgba(8,8,8,0.98))",

                boxShadow:
                  signupSuspended
                    ? "0 0 38px rgba(239,68,68,0.14)"
                    : activeStrikes >=
                        2
                      ? "0 0 34px rgba(239,68,68,0.10)"
                      : "0 0 30px rgba(245,158,11,0.08)",
              }}
            >
              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "flex-start",

                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,

                    borderRadius:
                      15,

                    flex:
                      "0 0 auto",

                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    background:
                      signupSuspended ||
                      activeStrikes >=
                        2
                        ? "rgba(239,68,68,0.12)"
                        : "rgba(245,158,11,0.12)",

                    border:
                      signupSuspended ||
                      activeStrikes >=
                        2
                        ? "1px solid rgba(239,68,68,0.28)"
                        : "1px solid rgba(245,158,11,0.28)",

                    fontSize:
                      21,

                    color:
                      signupSuspended ||
                      activeStrikes >=
                        2
                        ? "#ff9a9a"
                        : "#fbbf24",
                  }}
                >
                  ⚠
                </div>

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <p
                    style={{
                      margin: 0,

                      color:
                        signupSuspended ||
                        activeStrikes >=
                          2
                          ? "#ff8f8f"
                          : "#fbbf24",

                      fontSize:
                        9,

                      fontWeight:
                        950,

                      letterSpacing:
                        2,

                      textTransform:
                        "uppercase",
                    }}
                  >
                    {signupSuspended
                      ? "Battle Signup Suspended"
                      : activeStrikes >=
                          2
                        ? "Final Attendance Warning"
                        : "Attendance Warning"}
                  </p>

                  <h3
                    style={{
                      margin:
                        "7px 0 0",

                      color:
                        "#f9f4ed",

                      fontSize:
                        20,

                      fontWeight:
                        950,
                    }}
                  >
                    {signupSuspended
                      ? "Your battle signup access is suspended."
                      : `You have ${activeStrikes} active no-show ${
                          activeStrikes ===
                          1
                            ? "strike"
                            : "strikes"
                        }.`}
                  </h3>

                  <p
                    style={{
                      margin:
                        "8px 0 0",

                      color:
                        "rgba(247,241,232,0.58)",

                      fontSize:
                        12,

                      lineHeight:
                        1.65,

                      maxWidth:
                        780,
                    }}
                  >
                    {signupSuspended ? (
                      <>
                        You reached
                        the 3 no-show
                        limit and
                        cannot sign up
                        for new
                        Bloodline Arena
                        battles during
                        your
                        suspension.

                        {suspendedUntil && (
                          <>
                            {" "}
                            Your current
                            suspension is
                            scheduled to
                            end{" "}
                            <strong
                              style={{
                                color:
                                  "#f9f4ed",
                              }}
                            >
                              {new Date(
                                suspendedUntil
                              ).toLocaleDateString(
                                "en-US",
                                {
                                  timeZone:
                                    "America/New_York",

                                  month:
                                    "long",

                                  day:
                                    "numeric",

                                  year:
                                    "numeric",
                                }
                              )}
                            </strong>
                            .
                          </>
                        )}
                      </>
                    ) : activeStrikes >=
                      2 ? (
                      <>
                        This is your
                        final warning.
                        One additional
                        no-show will
                        result in a
                        30-day
                        suspension from
                        signing up for
                        Bloodline Arena
                        battles.
                      </>
                    ) : (
                      <>
                        Please make
                        sure you attend
                        battles you
                        sign up for.
                        At 3 active
                        no-show
                        strikes, your
                        ability to sign
                        up for
                        Bloodline Arena
                        battles will
                        be suspended
                        for 30 days.
                      </>
                    )}
                  </p>

                  <div
                    style={{
                      display:
                        "flex",

                      gap: 9,

                      flexWrap:
                        "wrap",

                      marginTop:
                        16,
                    }}
                  >
                    <AttendanceBadge
                      label="Active Strikes"
                      value={`${activeStrikes}/3`}
                      danger={
                        activeStrikes >=
                        2
                      }
                    />

                    <AttendanceBadge
                      label="Lifetime No-Shows"
                      value={String(
                        lifetimeNoShows
                      )}
                    />

                    <AttendanceBadge
                      label="Replacements"
                      value={String(
                        lifetimeReplacements
                      )}
                    />

                    {attendanceEnforcement &&
                      attendanceEnforcement.prior_suspensions >
                        0 && (
                        <AttendanceBadge
                          label="Prior Suspensions"
                          value={String(
                            attendanceEnforcement.prior_suspensions
                          )}
                          danger
                        />
                      )}
                  </div>
                </div>
              </div>
            </section>
          )}

        </DismissibleDashboardAlert>

        {/* NOTIFICATIONS */}
        <DismissibleDashboardAlert
          dismissKey={notificationDismissKey}
          ariaLabel="Close notification alert"
        >
        {unreadNotificationCount >
          0 && (
          <section
            style={{
              marginBottom:
                22,

              padding:
                20,

              borderRadius:
                20,

              border:
                "1px solid rgba(232,111,0,0.30)",

              background:
                "linear-gradient(135deg, rgba(73,15,3,0.82), rgba(27,7,5,0.92), rgba(5,5,5,0.97))",
            }}
          >
            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "space-between",

                alignItems:
                  "flex-start",

                gap: 18,

                flexWrap:
                  "wrap",
              }}
            >
              <div
                style={{
                  display:
                    "flex",

                  gap: 14,

                  minWidth:
                    0,

                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,

                    borderRadius:
                      14,

                    border:
                      "1px solid rgba(232,111,0,0.28)",

                    background:
                      "rgba(232,111,0,0.09)",

                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    color:
                      "#e98322",

                    fontSize:
                      19,

                    fontWeight:
                      950,

                    flex:
                      "0 0 auto",
                  }}
                >
                  🔔
                </div>

                <div
                  style={{
                    minWidth:
                      0,
                  }}
                >
                  <p
                    style={{
                      margin: 0,

                      color:
                        "#e98322",

                      fontSize:
                        8,

                      fontWeight:
                        950,

                      textTransform:
                        "uppercase",

                      letterSpacing:
                        1.8,
                    }}
                  >
                    Notifications ·{" "}
                    {
                      unreadNotificationCount
                    }{" "}
                    Unread
                  </p>

                  <h3
                    style={{
                      margin:
                        "6px 0 0",

                      color:
                        "#f9f4ed",

                      fontSize:
                        16,

                      fontWeight:
                        950,
                    }}
                  >
                    {
                      latestUnreadNotification?.title
                    }
                  </h3>

                  <p
                    style={{
                      margin:
                        "6px 0 0",

                      color:
                        "rgba(247,241,232,0.48)",

                      fontSize:
                        11,

                      lineHeight:
                        1.5,
                    }}
                  >
                    {
                      latestUnreadNotification?.message
                    }
                  </p>
                </div>
              </div>

              <div
                style={{
                  display:
                    "flex",

                  gap: 10,

                  flexWrap:
                    "wrap",
                }}
              >
                <Link
                  href={
                    latestUnreadNotification?.href ||
                    "/bloodline-arena/notifications"
                  }
                  prefetch={
                    false
                  }
                  style={{
                    padding:
                      "9px 13px",

                    borderRadius:
                      999,

                    border:
                      "1px solid rgba(232,111,0,0.32)",

                    background:
                      "rgba(232,111,0,0.10)",

                    color:
                      "#e98322",

                    fontSize:
                      9,

                    fontWeight:
                      950,

                    textDecoration:
                      "none",

                    textTransform:
                      "uppercase",
                  }}
                >
                  Open Latest
                </Link>

                <Link
                  href="/bloodline-arena/notifications"
                  prefetch={
                    false
                  }
                  style={{
                    padding:
                      "9px 13px",

                    borderRadius:
                      999,

                    border:
                      "1px solid rgba(201,151,50,0.24)",

                    background:
                      "rgba(201,151,50,0.06)",

                    color:
                      "#d9b15c",

                    fontSize:
                      9,

                    fontWeight:
                      950,

                    textDecoration:
                      "none",

                    textTransform:
                      "uppercase",
                  }}
                >
                  View All
                </Link>
              </div>
            </div>
          </section>
        )}

        </DismissibleDashboardAlert>

        {/* QUICK ACTIONS */}
        <section>
          <div
            style={{
              marginBottom:
                11,
            }}
          >
            <p
              style={
                eyebrowStyle
              }
            >
              Battle Center
            </p>

            <h2
              style={{
                margin:
                  "6px 0 0",

                color:
                  "#f9f4ed",

                fontSize:
                  "clamp(24px,3vw,30px)",

                fontWeight:
                  950,
              }}
            >
              Quick Actions
            </h2>
          </div>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",

              gap: 14,
            }}
          >
            <ActionCard
              number="01"
              eyebrow="Discover"
              title="Events"
              description={
                signupSuspended
                  ? "Your battle signup access is currently suspended. You can still view upcoming events."
                  : "Browse upcoming Bloodline Arena events and sign up to compete."
              }
              action={
                signupSuspended
                  ? "View Events"
                  : "View Upcoming Events"
              }
              href="/bloodline-arena/events"
              symbol="◇"
              warning={
                signupSuspended
              }
            />

            <ActionCard
              number="02"
              eyebrow="Match Status"
              title="Matchmaking"
              description="Check your event matchmaking status and opponent information."
              action="Check Match Status"
              href="/bloodline-arena/matchmaking"
              symbol="⚔"
            />

            <ActionCard
              number="03"
              eyebrow="Your Schedule"
              title="My Battles"
              description="View your approved battles, opponents, dates, and battle times."
              action="View My Battles"
              href="/bloodline-arena/battles"
              symbol="♛"
              featured
            />

            <ActionCard
              number="04"
              eyebrow="Help Center"
              title="Support"
              description={
                unreadSupportCount >
                0
                  ? `You have ${unreadSupportCount} unread support ${
                      unreadSupportCount ===
                      1
                        ? "reply"
                        : "replies"
                    }.`
                  : "Having an issue? Send a support request."
              }
              action={
                unreadSupportCount >
                0
                  ? "View Support Reply"
                  : "Get Support"
              }
              href="/bloodline-arena/support"
              symbol="?"
              notificationCount={
                unreadSupportCount
              }
            />

            <ActionCard
              number="05"
              eyebrow="Inbox"
              title="Notifications"
              description={
                unreadNotificationCount >
                0
                  ? `You have ${unreadNotificationCount} unread ${
                      unreadNotificationCount ===
                      1
                        ? "notification"
                        : "notifications"
                    }.`
                  : "View battle updates, support replies, announcements, and event alerts."
              }
              action={
                unreadNotificationCount >
                0
                  ? "View Unread Notifications"
                  : "View Notification Center"
              }
              href="/bloodline-arena/notifications"
              symbol="🔔"
              notificationCount={
                unreadNotificationCount
              }
            />

            {userRole.role === "creator" && (
              <ActionCard
                number="06"
                eyebrow="Performance"
                title="Creator Analytics"
                description="View your personal TikTok LIVE Backstage performance, including diamonds, LIVE days, hours, matches, and month-over-month stats."
                action="View My Analytics"
                href="/bloodline-arena/analytics"
                symbol="◈"
                featured
              />
            )}
          </div>
        </section>
      </div>

      {/* FLASH / PULSE FOR SERIOUS ATTENDANCE WARNINGS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes attendanceAlertPulse {
              0%, 100% {
                box-shadow:
                  0 0 30px rgba(239,68,68,0.08);
              }

              50% {
                box-shadow:
                  0 0 45px rgba(239,68,68,0.26);
              }
            }

            .attendance-alert-pulse {
              animation:
                attendanceAlertPulse
                1.8s ease-in-out
                infinite;
            }

            @media (prefers-reduced-motion: reduce) {
              .attendance-alert-pulse {
                animation: none;
              }
            }
          `,
        }}
      />
    </main>
  );
}

function AttendanceBadge({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        padding:
          "8px 11px",

        borderRadius:
          10,

        background:
          danger
            ? "rgba(239,68,68,0.09)"
            : "rgba(255,255,255,0.04)",

        border:
          danger
            ? "1px solid rgba(239,68,68,0.22)"
            : "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <span
        style={{
          color:
            danger
              ? "#ff9a9a"
              : "rgba(247,241,232,0.42)",

          fontSize:
            9,

          fontWeight:
            900,

          textTransform:
            "uppercase",

          letterSpacing:
            0.7,
        }}
      >
        {label}
      </span>

      <span
        style={{
          marginLeft:
            7,

          color:
            danger
              ? "#ffb0b0"
              : "#f9f4ed",

          fontSize:
            11,

          fontWeight:
            950,
        }}
      >
        {value}
      </span>
    </div>
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
        padding:
          20,

        borderRadius:
          19,

        border:
          featured
            ? "1px solid rgba(201,151,50,0.25)"
            : "1px solid rgba(255,255,255,0.06)",

        background:
          "linear-gradient(145deg, rgba(14,14,14,0.94), rgba(5,5,5,0.96))",
      }}
    >
      <p
        style={
          eyebrowStyle
        }
      >
        {eyebrow}
      </p>

      <p
        style={{
          margin:
            "9px 0 0",

          color:
            featured
              ? "#d9b15c"
              : "#f9f4ed",

          fontSize:
            20,

          fontWeight:
            950,
        }}
      >
        {value}
      </p>

      <p
        style={{
          margin:
            "6px 0 0",

          color:
            "rgba(247,241,232,0.32)",

          fontSize:
            9,
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
  notificationCount = 0,
  warning = false,
}: {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  href: string;
  symbol: string;
  featured?: boolean;
  notificationCount?: number;
  warning?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      style={{
        position:
          "relative",

        padding:
          22,

        borderRadius:
          22,

        border:
          warning
            ? "1px solid rgba(239,68,68,0.28)"
            : notificationCount >
                0
              ? "1px solid rgba(239,68,68,0.28)"
              : "1px solid rgba(201,151,50,0.13)",

        background:
          warning
            ? "linear-gradient(145deg, rgba(55,12,14,0.74), rgba(5,5,5,0.96))"
            : "linear-gradient(145deg, rgba(18,15,15,0.92), rgba(5,5,5,0.96))",

        color:
          "#f7f1e8",

        textDecoration:
          "none",

        minHeight:
          230,
      }}
    >
      {notificationCount >
        0 && (
        <div
          style={{
            position:
              "absolute",

            right: 15,
            top: 15,

            minWidth:
              24,

            height:
              24,

            padding:
              "0 7px",

            borderRadius:
              999,

            background:
              "#ef4444",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            fontSize:
              9,

            fontWeight:
              950,
          }}
        >
          {
            notificationCount
          }
        </div>
      )}

      {warning && (
        <div
          style={{
            position:
              "absolute",

            right: 15,
            top: 15,

            padding:
              "5px 8px",

            borderRadius:
              999,

            border:
              "1px solid rgba(239,68,68,0.25)",

            background:
              "rgba(239,68,68,0.10)",

            color:
              "#ff9a9a",

            fontSize:
              7,

            fontWeight:
              950,

            textTransform:
              "uppercase",
          }}
        >
          Signup Suspended
        </div>
      )}

      <p
        style={
          eyebrowStyle
        }
      >
        {number} ·{" "}
        {eyebrow}
      </p>

      <div
        style={{
          marginTop:
            16,

          fontSize:
            22,

          color:
            warning
              ? "#ef4444"
              : featured
                ? "#e86f00"
                : "#d9b15c",
        }}
      >
        {symbol}
      </div>

      <h3
        style={{
          margin:
            "30px 0 0",

          fontSize:
            20,

          fontWeight:
            950,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin:
            "8px 0 0",

          color:
            "rgba(247,241,232,0.37)",

          fontSize:
            11,

          lineHeight:
            1.6,
        }}
      >
        {description}
      </p>

      <p
        style={{
          margin:
            "16px 0 0",

          color:
            warning
              ? "#ff9a9a"
              : "#d9b15c",

          fontSize:
            10,

          fontWeight:
            950,

          textTransform:
            "uppercase",
        }}
      >
        {action} →
      </p>
    </Link>
  );
}

const eyebrowStyle = {
  margin: 0,

  color:
    "#c99732",

  fontSize:
    9,

  fontWeight:
    950,

  letterSpacing:
    2.5,

  textTransform:
    "uppercase" as const,
};

const primaryButtonStyle = {
  padding:
    "11px 16px",

  borderRadius:
    999,

  border:
    "1px solid rgba(232,111,0,0.35)",

  background:
    "linear-gradient(180deg, rgba(232,111,0,0.14), rgba(76,18,0,0.18))",

  color:
    "#e98322",

  fontSize:
    10,

  fontWeight:
    950,

  textDecoration:
    "none",

  textTransform:
    "uppercase" as const,
};

const secondaryButtonStyle = {
  padding:
    "11px 16px",

  borderRadius:
    999,

  border:
    "1px solid rgba(201,151,50,0.24)",

  background:
    "rgba(201,151,50,0.06)",

  color:
    "#d9b15c",

  fontSize:
    10,

  fontWeight:
    950,

  textDecoration:
    "none",

  textTransform:
    "uppercase" as const,
};

const signOutWrapperStyle = {
  display:
    "flex",

  alignItems:
    "center",
};