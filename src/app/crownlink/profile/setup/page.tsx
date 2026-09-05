"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/supabase/client";

export default function CrownLinkProfileSetupPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [tiktokUsername, setTiktokUsername] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [diamondLevel, setDiamondLevel] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [agentRegistrationCode, setAgentRegistrationCode] =
    useState("");
  const [connectedAgentName, setConnectedAgentName] =
    useState("");
  const [connectedAgentUserId, setConnectedAgentUserId] =
    useState<string | null>(null);

  const [tiktokConnected, setTiktokConnected] =
    useState(false);
  const [tiktokMessage, setTiktokMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient();

      const params = new URLSearchParams(
        window.location.search
      );

      const connected = params.get("tiktok_connected");
      const tiktokError = params.get("tiktok_error");

      if (connected === "1") {
        setTiktokMessage(
          "TikTok connected successfully. Your profile information was imported."
        );
      }

      if (tiktokError) {
        const messages: Record<string, string> = {
          missing_code:
            "TikTok did not return an authorization code.",
          invalid_state:
            "The TikTok connection could not be verified. Please try again.",
          token_exchange_failed:
            "TikTok authorization could not be completed.",
          missing_access_token:
            "TikTok did not return the required access information.",
          profile_fetch_failed:
            "We could not retrieve your TikTok profile.",
          missing_profile:
            "TikTok did not return your profile information.",
          missing_username:
            "TikTok did not return your username. Please reconnect your TikTok account.",
          profile_lookup_failed:
            "Your Crown Link profile could not be loaded.",
          profile_update_failed:
            "Your TikTok information could not be saved.",
          profile_creation_failed:
            "Your Crown Link profile could not be created.",
          invalid_creator_account:
            "Your Crown Link creator account could not be verified.",
          missing_agency:
            "Your Crown Link account does not have an assigned agency.",
          invalid_agency:
            "Your assigned agency could not be verified.",
          tiktok_already_connected:
            "That TikTok account is already connected to another Crown Link creator.",
          username_already_connected:
            "That TikTok username is already connected to another Crown Link creator.",
          unexpected:
            "Something unexpected happened while connecting TikTok.",
        };

        setError(
          messages[tiktokError] ||
            decodeURIComponent(tiktokError)
        );
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/crownlink/login");
        return;
      }

      const { data: roleData, error: roleError } =
        await supabase
          .from("user_roles")
          .select("role, status, agency_id")
          .eq("user_id", user.id)
          .single();

      if (roleError || !roleData) {
        console.error(
          "CROWN LINK ROLE ERROR:",
          roleError
        );

        setError(
          "We couldn't verify your Crown Link account."
        );

        setLoading(false);
        return;
      }

      if (roleData.status !== "active") {
        await supabase.auth.signOut();
        router.replace("/crownlink/login");
        return;
      }

      if (roleData.role !== "creator") {
        router.replace("/crownlink");
        return;
      }

      if (!roleData.agency_id) {
        setError(
          "No agency has been assigned to your Crown Link account. Please contact an administrator."
        );

        setLoading(false);
        return;
      }

      const { data: agency, error: agencyError } =
        await supabase
          .from("crownlink_agencies")
          .select("id, name, status")
          .eq("id", roleData.agency_id)
          .single();

      if (
        agencyError ||
        !agency ||
        agency.status !== "active"
      ) {
        console.error(
          "CROWN LINK AGENCY ERROR:",
          agencyError
        );

        setError(
          "Your assigned agency could not be loaded. Please contact an administrator."
        );

        setLoading(false);
        return;
      }

      setAgencyName(agency.name);

      const {
        data: existingProfile,
        error: profileError,
      } = await supabase
        .from("crownlink_profiles")
        .select(
          `
            display_name,
            tiktok_username,
            diamond_level,
            profile_photo_url,
            tiktok_open_id,
            tiktok_connected_at,
            agent_user_id
          `
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "CROWN LINK PROFILE ERROR:",
          profileError
        );

        setError(
          "Your Crown Link profile could not be loaded."
        );

        setLoading(false);
        return;
      }

      if (existingProfile) {
        setDisplayName(
          existingProfile.display_name || ""
        );

        const savedUsername =
          existingProfile.tiktok_username || "";

        if (
          savedUsername &&
          !savedUsername.startsWith("pending_")
        ) {
          setTiktokUsername(savedUsername);
        } else {
          setTiktokUsername("");
        }

        setDiamondLevel(
          existingProfile.diamond_level !== null &&
            existingProfile.diamond_level !== undefined
            ? String(existingProfile.diamond_level)
            : ""
        );

        setProfilePhotoUrl(
          existingProfile.profile_photo_url || ""
        );

        setTiktokConnected(
          Boolean(existingProfile.tiktok_open_id)
        );

        const metadataAgentUserId =
          typeof user.user_metadata
            ?.crownlink_agent_user_id === "string"
            ? user.user_metadata
                .crownlink_agent_user_id
            : null;

        const metadataRegistrationCode =
          typeof user.user_metadata
            ?.crownlink_registration_code === "string"
            ? user.user_metadata
                .crownlink_registration_code
            : "";

        const linkedAgentUserId =
          existingProfile.agent_user_id ||
          metadataAgentUserId;

        if (linkedAgentUserId) {
          setConnectedAgentUserId(
            linkedAgentUserId
          );

          if (metadataRegistrationCode) {
            setAgentRegistrationCode(
              metadataRegistrationCode
            );

            const response = await fetch(
              "/api/crownlink/agent-code/validate",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  code: metadataRegistrationCode,
                }),
              }
            );

            const validation =
              await response.json();

            if (
              response.ok &&
              validation.valid
            ) {
              setConnectedAgentName(
                validation.agentDisplayName ||
                  validation.agentAgencyName ||
                  "Crown Link Agent"
              );
            } else {
              setConnectedAgentName(
                "Crown Link Agent"
              );
            }
          } else {
            setConnectedAgentName(
              "Crown Link Agent"
            );
          }
        }
      }

      if (!existingProfile) {
        const metadataAgentUserId =
          typeof user.user_metadata
            ?.crownlink_agent_user_id === "string"
            ? user.user_metadata
                .crownlink_agent_user_id
            : null;

        const metadataRegistrationCode =
          typeof user.user_metadata
            ?.crownlink_registration_code === "string"
            ? user.user_metadata
                .crownlink_registration_code
            : "";

        if (metadataAgentUserId) {
          setConnectedAgentUserId(
            metadataAgentUserId
          );

          setAgentRegistrationCode(
            metadataRegistrationCode
          );

          if (metadataRegistrationCode) {
            const response = await fetch(
              "/api/crownlink/agent-code/validate",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  code: metadataRegistrationCode,
                }),
              }
            );

            const validation =
              await response.json();

            if (
              response.ok &&
              validation.valid
            ) {
              setConnectedAgentName(
                validation.agentDisplayName ||
                  validation.agentAgencyName ||
                  "Crown Link Agent"
              );
            } else {
              setConnectedAgentName(
                "Crown Link Agent"
              );
            }
          } else {
            setConnectedAgentName(
              "Crown Link Agent"
            );
          }
        }
      }

      setLoading(false);
    }

    checkUser();
  }, [router]);

  async function handleSubmit(
    e: FormEvent
  ) {
    e.preventDefault();

    setSaving(true);
    setError("");

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/crownlink/login");
      return;
    }

    const { data: roleData, error: roleError } =
      await supabase
        .from("user_roles")
        .select("role, status, agency_id")
        .eq("user_id", user.id)
        .single();

    if (
      roleError ||
      !roleData ||
      roleData.role !== "creator" ||
      roleData.status !== "active"
    ) {
      setError(
        "We couldn't verify your Crown Link account."
      );

      setSaving(false);
      return;
    }

    if (!roleData.agency_id) {
      setError(
        "No agency has been assigned to your account."
      );

      setSaving(false);
      return;
    }

    const { data: agency, error: agencyError } =
      await supabase
        .from("crownlink_agencies")
        .select("id, name, status")
        .eq("id", roleData.agency_id)
        .single();

    if (
      agencyError ||
      !agency ||
      agency.status !== "active"
    ) {
      setError(
        "Your assigned agency could not be verified."
      );

      setSaving(false);
      return;
    }

    /*
     * TEMPORARY SOFT LAUNCH:
     *
     * TikTok connection is NOT required while the
     * Crown Link TikTok integration is awaiting
     * production approval.
     *
     * Keep all TikTok fields and connection logic
     * intact so verification can be required again
     * after approval.
     */

    const diamonds = Number(diamondLevel);

    if (
      diamondLevel === "" ||
      Number.isNaN(diamonds) ||
      diamonds < 0
    ) {
      setError(
        "Please enter a valid diamond level."
      );

      setSaving(false);
      return;
    }

    let agentUserId: string | null =
      connectedAgentUserId;

    if (
      !agentUserId &&
      agentRegistrationCode.trim()
    ) {
      const response = await fetch(
        "/api/crownlink/agent-code/validate",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            code: agentRegistrationCode,
          }),
        }
      );

      const validation =
        await response.json();

      if (
        !response.ok ||
        !validation.valid
      ) {
        setError(
          validation.error ||
            "That agent registration code could not be verified."
        );

        setSaving(false);
        return;
      }

      agentUserId =
        validation.agentUserId ?? null;
    }

    /*
     * Only Crown Link-editable information is
     * updated here.
     *
     * If TikTok is connected, the secure TikTok
     * callback remains responsible for verified
     * TikTok username, profile photo, TikTok ID,
     * and TikTok profile information.
     */

    const { error: saveError } =
      await supabase
        .from("crownlink_profiles")
        .update({
          display_name:
            displayName.trim() || null,
          agency_name: agency.name,
          diamond_level: diamonds,
          agent_user_id: agentUserId,
          updated_at:
            new Date().toISOString(),
        })
        .eq("user_id", user.id);

    if (saveError) {
      console.error(saveError);

      setError(
        "We couldn't save your profile. Please try again."
      );

      setSaving(false);
      return;
    }

    router.push("/crownlink");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="cl-loading">
        <div className="cl-loading-mark">
          ♛
        </div>

        <p>Loading Crown Link...</p>

        <style jsx>{`
          .cl-loading {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            background:
              radial-gradient(
                circle at top,
                rgba(88, 7, 12, 0.35),
                transparent 35%
              ),
              #050505;
            color: #f7f1e8;
          }

          .cl-loading-mark {
            color: #c99732;
            font-size: 34px;
          }

          .cl-loading p {
            margin: 0;
            color: rgba(
              247,
              241,
              232,
              0.35
            );
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1px;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="cl-page">
      <div className="cl-glow cl-glow-one" />
      <div className="cl-glow cl-glow-two" />

      <div className="cl-container">
        {/* HEADER */}

        <section className="cl-hero">
          <div className="cl-eyebrow">
            <span />
            ROYALS BLOODLINE
          </div>

          <div className="cl-title-row">
            <div>
              <div className="cl-crown">
                ♛
              </div>

              <h1>
                Crown <span>Link</span>
              </h1>

              <div className="cl-fire-line" />

              <p>
                Complete your creator profile
                and get ready to battle.
              </p>
            </div>

            <div className="cl-step-pill">
              PROFILE SETUP
            </div>
          </div>
        </section>

        <form
          className="cl-card"
          onSubmit={handleSubmit}
        >
          <div className="cl-heading">
            <p className="cl-section-label">
              CREATOR PROFILE
            </p>

            <h2>Set up your profile</h2>

            <p>
              Complete your Crown Link
              information below. TikTok
              verification is temporarily
              optional while the Crown Link
              TikTok integration is awaiting
              approval.
            </p>
          </div>

          {/* TIKTOK */}

          <section className="tiktok-section">
            {!tiktokConnected ? (
              <>
                <div className="tiktok-top">
                  <div className="tiktok-icon">
                    ♪
                  </div>

                  <div className="tiktok-copy">
                    <div className="optional-pill">
                      TEMPORARILY OPTIONAL
                    </div>

                    <strong>
                      TikTok Verification
                    </strong>

                    <span>
                      Crown Link&apos;s TikTok
                      connection is currently
                      awaiting approval. You can
                      finish your profile and use
                      Crown Link without linking
                      TikTok for now.
                    </span>
                  </div>
                </div>

                <div className="review-notice">
                  <span className="review-dot" />

                  TikTok verification will be
                  available once the integration
                  is approved.
                </div>
              </>
            ) : (
              <>
                <div className="connected-profile">
                  {profilePhotoUrl ? (
                    <img
                      src={profilePhotoUrl}
                      alt="TikTok profile"
                    />
                  ) : (
                    <div className="profile-placeholder">
                      ♪
                    </div>
                  )}

                  <div className="connected-copy">
                    <span className="connected-label">
                      ✓ TIKTOK CONNECTED
                    </span>

                    <strong>
                      {displayName ||
                        "TikTok Creator"}
                    </strong>

                    {tiktokUsername && (
                      <small>
                        @{tiktokUsername}
                      </small>
                    )}
                  </div>
                </div>

                <a
                  href="/api/crownlink/tiktok/connect"
                  className="reconnect-button"
                >
                  Connect Different TikTok
                </a>
              </>
            )}
          </section>

          {tiktokMessage && (
            <div className="cl-success">
              ✓ {tiktokMessage}
            </div>
          )}

          <div className="cl-divider">
            <span>PROFILE DETAILS</span>
          </div>

          {/* DISPLAY NAME */}

          <div className="cl-field">
            <label>Display Name</label>

            <input
              type="text"
              placeholder="How should your name appear?"
              value={displayName}
              onChange={(e) =>
                setDisplayName(
                  e.target.value
                )
              }
            />

            <small>
              This is the name other Crown
              Link creators will see.
            </small>
          </div>

          {/* TIKTOK USERNAME */}

          <div className="cl-field">
            <label>TikTok Username</label>

            <div
              className={`username-display ${
                !tiktokConnected
                  ? "not-connected"
                  : ""
              }`}
            >
              <span className="username-at">
                @
              </span>

              <strong>
                {tiktokConnected &&
                tiktokUsername
                  ? tiktokUsername
                  : "TikTok verification pending"}
              </strong>

              {tiktokConnected && (
                <span className="verified">
                  ✓ VERIFIED
                </span>
              )}

              {!tiktokConnected && (
                <span className="pending">
                  PENDING
                </span>
              )}
            </div>

            <small>
              {tiktokConnected
                ? "Your username is verified directly through TikTok and cannot be edited here."
                : "TikTok verification is temporarily optional while the Crown Link integration is under review."}
            </small>
          </div>

          {/* AGENCY */}

          <div className="cl-field">
            <label>Agency</label>

            <div className="locked-display">
              <div>
                <span className="locked-label">
                  ASSIGNED AGENCY
                </span>

                <strong>
                  {agencyName ||
                    "Not Assigned"}
                </strong>
              </div>

              <span className="lock">
                🔒
              </span>
            </div>

            <small>
              Your agency was assigned
              automatically when your Crown
              Link account was created.
            </small>
          </div>

          {/* AGENT */}

          <div className="cl-field">
            <label>Agent</label>

            {connectedAgentUserId ? (
              <>
                <div className="locked-display">
                  <div>
                    <span className="locked-label">
                      CONNECTED AGENT
                    </span>

                    <strong>
                      {connectedAgentName ||
                        "Crown Link Agent"}
                    </strong>

                    {agentRegistrationCode && (
                      <span className="agent-code">
                        Registration Code:{" "}
                        {
                          agentRegistrationCode
                        }
                      </span>
                    )}
                  </div>

                  <span className="lock">
                    🔒
                  </span>
                </div>

                <small>
                  Your agent was connected
                  automatically using the
                  registration code you used
                  when creating your account.
                </small>
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Example: TESTAGENCY"
                  value={
                    agentRegistrationCode
                  }
                  onChange={(e) =>
                    setAgentRegistrationCode(
                      e.target.value
                        .toUpperCase()
                        .replace(
                          /[^A-Z0-9_-]/g,
                          ""
                        )
                    )
                  }
                />

                <small>
                  Enter the registration code
                  provided by your Crown Link
                  agent.
                </small>
              </>
            )}
          </div>

          {/* DIAMONDS */}

          <div className="cl-field">
            <div className="cl-label-row">
              <label>
                Typical Diamond Level
              </label>

              <span>REQUIRED</span>
            </div>

            <input
              type="number"
              min="0"
              step="1"
              placeholder="Example: 250000"
              value={diamondLevel}
              onChange={(e) =>
                setDiamondLevel(
                  e.target.value
                )
              }
              required
            />

            <small>
              Enter your typical diamond count
              for battles. Crown Link uses this
              to help create balanced matchups.
              You can update it later.
            </small>
          </div>

          {error && (
            <div className="cl-error">
              <div className="error-icon">
                !
              </div>

              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={
              saving || !agencyName
            }
            className="cl-save"
          >
            {saving ? (
              "Saving Profile..."
            ) : (
              <>
                Save Creator Profile
                <span>→</span>
              </>
            )}
          </button>

          {!tiktokConnected && (
            <div className="temporary-note">
              <span>♛</span>

              <p>
                You can start using Crown Link
                now. Once TikTok verification
                becomes available, you&apos;ll
                be able to connect your TikTok
                account from Crown Link.
              </p>
            </div>
          )}

          {tiktokConnected && (
            <div className="legal-links">
              By connecting TikTok, you agree
              to the{" "}
              <a href="/crownlink/terms">
                Terms of Service
              </a>{" "}
              and acknowledge the{" "}
              <a href="/crownlink/privacy">
                Privacy Policy
              </a>
              .
            </div>
          )}
        </form>

        <footer className="cl-footer">
          <span>ROYALS BLOODLINE</span>
          <span>
            CROWN LINK · CREATOR SETUP
          </span>
        </footer>
      </div>

      <style jsx>{`
        .cl-page {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 12% 5%,
              rgba(88, 7, 12, 0.45),
              transparent 29%
            ),
            radial-gradient(
              circle at 90% 55%,
              rgba(126, 28, 0, 0.08),
              transparent 28%
            ),
            linear-gradient(
              180deg,
              #080808 0%,
              #040404 52%,
              #010101 100%
            );
          color: #f7f1e8;
          padding: 28px 20px 65px;
        }

        .cl-glow {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(100px);
        }

        .cl-glow-one {
          width: 380px;
          height: 380px;
          left: -180px;
          top: -190px;
          background: rgba(
            112,
            7,
            14,
            0.18
          );
        }

        .cl-glow-two {
          width: 280px;
          height: 280px;
          right: -160px;
          bottom: 30px;
          background: rgba(
            232,
            111,
            0,
            0.04
          );
        }

        .cl-container {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 700px;
          margin: 0 auto;
        }

        .cl-hero {
          position: relative;
          overflow: hidden;
          margin-bottom: 16px;
          padding: 23px 25px;
          border-radius: 22px;
          border: 1px solid
            rgba(201, 151, 50, 0.17);
          background:
            radial-gradient(
              circle at 7% 10%,
              rgba(98, 9, 15, 0.35),
              transparent 38%
            ),
            linear-gradient(
              135deg,
              rgba(39, 5, 8, 0.91),
              rgba(10, 8, 8, 0.96)
                57%,
              rgba(3, 3, 3, 0.98)
            );
          box-shadow: 0 22px 55px
            rgba(0, 0, 0, 0.4);
        }

        .cl-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 8px;
          border-radius: 999px;
          border: 1px solid
            rgba(201, 151, 50, 0.17);
          background: rgba(
            201,
            151,
            50,
            0.035
          );
          color: #d9b15c;
          font-size: 6px;
          font-weight: 950;
          letter-spacing: 1.7px;
        }

        .cl-eyebrow span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #e86f00;
          box-shadow: 0 0 8px
            rgba(232, 111, 0, 0.7);
        }

        .cl-title-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .cl-crown {
          color: #c99732;
          font-size: 27px;
          line-height: 1;
        }

        .cl-hero h1 {
          margin: 8px 0 0;
          color: #f9f4ed;
          font-size: clamp(
            34px,
            8vw,
            48px
          );
          line-height: 0.95;
          font-weight: 950;
          letter-spacing: -2px;
        }

        .cl-hero h1 span {
          color: #d9b15c;
        }

        .cl-fire-line {
          width: 60px;
          height: 2px;
          margin-top: 11px;
          background: linear-gradient(
            90deg,
            #e86f00,
            #c99732,
            transparent
          );
        }

        .cl-hero p {
          margin: 9px 0 0;
          color: rgba(
            247,
            241,
            232,
            0.3
          );
          font-size: 9px;
        }

        .cl-step-pill {
          padding: 6px 9px;
          border-radius: 999px;
          border: 1px solid
            rgba(201, 151, 50, 0.12);
          color: rgba(
            217,
            177,
            92,
            0.6
          );
          font-size: 6px;
          font-weight: 950;
          letter-spacing: 1px;
        }

        .cl-card {
          padding: 25px;
          border-radius: 21px;
          border: 1px solid
            rgba(201, 151, 50, 0.13);
          background: linear-gradient(
            145deg,
            rgba(19, 15, 15, 0.96),
            rgba(5, 5, 5, 0.98)
          );
          box-shadow: 0 20px 50px
            rgba(0, 0, 0, 0.32);
        }

        .cl-heading {
          margin-bottom: 21px;
        }

        .cl-section-label {
          margin: 0 !important;
          color: #c99732 !important;
          font-size: 6px !important;
          font-weight: 950;
          letter-spacing: 1.8px;
        }

        .cl-heading h2 {
          margin: 6px 0 0;
          color: #f9f4ed;
          font-size: 22px;
          font-weight: 950;
          letter-spacing: -0.5px;
        }

        .cl-heading p {
          margin: 7px 0 0;
          max-width: 540px;
          color: rgba(
            247,
            241,
            232,
            0.3
          );
          font-size: 9px;
          line-height: 1.65;
        }

        .tiktok-section {
          padding: 16px;
          border-radius: 14px;
          border: 1px solid
            rgba(201, 151, 50, 0.11);
          background: linear-gradient(
            135deg,
            rgba(24, 10, 10, 0.74),
            rgba(0, 0, 0, 0.24)
          );
        }

        .tiktok-top {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .tiktok-icon,
        .profile-placeholder {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f7f1e8;
          color: #080808;
          font-weight: 950;
        }

        .tiktok-icon {
          width: 39px;
          height: 39px;
          border-radius: 11px;
          font-size: 18px;
        }

        .tiktok-copy {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 5px;
        }

        .optional-pill {
          padding: 4px 6px;
          border-radius: 999px;
          background: rgba(
            232,
            111,
            0,
            0.07
          );
          border: 1px solid
            rgba(232, 111, 0, 0.16);
          color: #e86f00;
          font-size: 5px;
          font-weight: 950;
          letter-spacing: 0.9px;
        }

        .tiktok-copy strong {
          color: #f9f4ed;
          font-size: 11px;
          font-weight: 950;
        }

        .tiktok-copy span {
          color: rgba(
            247,
            241,
            232,
            0.27
          );
          font-size: 8px;
          line-height: 1.55;
        }

        .review-notice {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 13px;
          padding-top: 11px;
          border-top: 1px solid
            rgba(201, 151, 50, 0.06);
          color: rgba(
            247,
            241,
            232,
            0.22
          );
          font-size: 7px;
        }

        .review-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #c99732;
        }

        .connected-profile {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .connected-profile img,
        .profile-placeholder {
          width: 52px;
          height: 52px;
          border-radius: 13px;
          object-fit: cover;
          border: 1px solid
            rgba(201, 151, 50, 0.3);
        }

        .connected-copy {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .connected-label {
          color: #b8f5c2;
          font-size: 6px;
          font-weight: 950;
          letter-spacing: 1px;
        }

        .connected-copy strong {
          color: #f9f4ed;
          font-size: 13px;
        }

        .connected-copy small {
          color: #d9b15c;
          font-size: 8px;
        }

        .reconnect-button {
          display: inline-block;
          margin-top: 12px;
          color: rgba(
            217,
            177,
            92,
            0.55
          );
          text-decoration: none;
          font-size: 7px;
          font-weight: 900;
        }

        .cl-success {
          margin-top: 12px;
          padding: 10px 11px;
          border-radius: 10px;
          border: 1px solid
            rgba(80, 210, 110, 0.18);
          background: rgba(
            60,
            180,
            90,
            0.06
          );
          color: #b8f5c2;
          font-size: 8px;
        }

        .cl-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 24px 0 18px;
          color: rgba(
            201,
            151,
            50,
            0.38
          );
          font-size: 6px;
          font-weight: 950;
          letter-spacing: 1.4px;
        }

        .cl-divider::before,
        .cl-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: rgba(
            201,
            151,
            50,
            0.07
          );
        }

        .cl-field {
          margin-bottom: 18px;
        }

        .cl-field label {
          display: block;
          margin-bottom: 7px;
          color: rgba(
            247,
            241,
            232,
            0.55
          );
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .cl-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .cl-label-row span {
          margin-bottom: 7px;
          color: rgba(
            232,
            111,
            0,
            0.7
          );
          font-size: 5px;
          font-weight: 950;
          letter-spacing: 0.8px;
        }

        .cl-field input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 13px;
          border-radius: 10px;
          border: 1px solid
            rgba(201, 151, 50, 0.1);
          outline: none;
          background: #0b0808;
          color: #f9f4ed;
          font-size: 11px;
        }

        .cl-field input:focus {
          border-color: rgba(
            232,
            111,
            0,
            0.5
          );
          box-shadow: 0 0 0 3px
            rgba(232, 111, 0, 0.05);
        }

        .cl-field input::placeholder {
          color: rgba(
            247,
            241,
            232,
            0.15
          );
        }

        .cl-field small {
          display: block;
          margin-top: 6px;
          color: rgba(
            247,
            241,
            232,
            0.2
          );
          font-size: 7px;
          line-height: 1.5;
        }

        .username-display,
        .locked-display {
          min-height: 49px;
          box-sizing: border-box;
          border-radius: 10px;
        }

        .username-display {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 13px;
          border: 1px solid
            rgba(80, 210, 110, 0.18);
          background: rgba(
            60,
            180,
            90,
            0.04
          );
        }

        .username-display.not-connected {
          border-color: rgba(
            201,
            151,
            50,
            0.08
          );
          background: #090707;
        }

        .username-at {
          color: #c99732;
          font-size: 10px;
          font-weight: 950;
        }

        .username-display strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #f9f4ed;
          font-size: 10px;
        }

        .username-display.not-connected
          strong {
          color: rgba(
            247,
            241,
            232,
            0.27
          );
        }

        .verified,
        .pending {
          margin-left: auto;
          padding: 4px 6px;
          border-radius: 999px;
          white-space: nowrap;
          font-size: 5px;
          font-weight: 950;
          letter-spacing: 0.8px;
        }

        .verified {
          color: #b8f5c2;
          background: rgba(
            60,
            180,
            90,
            0.07
          );
        }

        .pending {
          color: #d9b15c;
          border: 1px solid
            rgba(201, 151, 50, 0.12);
          background: rgba(
            201,
            151,
            50,
            0.03
          );
        }

        .locked-display {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 11px 13px;
          border: 1px solid
            rgba(201, 151, 50, 0.14);
          background: rgba(
            201,
            151,
            50,
            0.035
          );
        }

        .locked-display > div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .locked-label {
          color: rgba(
            247,
            241,
            232,
            0.21
          );
          font-size: 5px;
          font-weight: 950;
          letter-spacing: 1px;
        }

        .locked-display strong {
          color: #d9b15c;
          font-size: 10px;
          font-weight: 950;
        }

        .agent-code {
          color: rgba(
            247,
            241,
            232,
            0.25
          );
          font-size: 6px;
          font-weight: 800;
        }

        .lock {
          opacity: 0.45;
          font-size: 12px;
        }

        .cl-error {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-bottom: 15px;
          padding: 10px 11px;
          border-radius: 10px;
          border: 1px solid
            rgba(143, 48, 48, 0.25);
          background: rgba(
            91,
            17,
            20,
            0.13
          );
          color: #efaaaa;
          font-size: 8px;
          line-height: 1.5;
        }

        .error-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 17px;
          height: 17px;
          border-radius: 6px;
          background: rgba(
            143,
            48,
            48,
            0.15
          );
          color: #e89191;
          font-size: 8px;
          font-weight: 950;
        }

        .cl-save {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid
            rgba(232, 111, 0, 0.34);
          background: linear-gradient(
            135deg,
            #e86f00,
            #b84800
          );
          color: #120603;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          cursor: pointer;
        }

        .cl-save:hover:not(:disabled) {
          filter: brightness(1.05);
        }

        .cl-save:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .temporary-note {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-top: 13px;
          padding: 10px 11px;
          border-radius: 10px;
          border: 1px solid
            rgba(201, 151, 50, 0.08);
          background: rgba(
            201,
            151,
            50,
            0.025
          );
        }

        .temporary-note > span {
          flex-shrink: 0;
          color: #c99732;
          font-size: 11px;
        }

        .temporary-note p {
          margin: 0;
          color: rgba(
            247,
            241,
            232,
            0.22
          );
          font-size: 7px;
          line-height: 1.55;
        }

        .legal-links {
          margin-top: 14px;
          text-align: center;
          color: rgba(
            247,
            241,
            232,
            0.2
          );
          font-size: 7px;
          line-height: 1.55;
        }

        .legal-links a {
          color: rgba(
            217,
            177,
            92,
            0.75
          );
          text-decoration: none;
        }

        .cl-footer {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 34px;
          padding-top: 15px;
          border-top: 1px solid
            rgba(201, 151, 50, 0.07);
          color: rgba(
            247,
            241,
            232,
            0.11
          );
          font-size: 6px;
          font-weight: 950;
          letter-spacing: 1.7px;
        }

        @media (max-width: 600px) {
          .cl-page {
            padding: 18px 13px 40px;
          }

          .cl-hero {
            padding: 19px;
          }

          .cl-card {
            padding: 20px 17px;
          }

          .cl-title-row {
            align-items: flex-start;
          }

          .cl-step-pill {
            display: none;
          }

          .tiktok-top {
            flex-direction: column;
          }

          .verified,
          .pending {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}