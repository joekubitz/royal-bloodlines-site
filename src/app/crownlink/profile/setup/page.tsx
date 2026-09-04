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
  const [agentRegistrationCode, setAgentRegistrationCode] = useState("");
  const [connectedAgentName, setConnectedAgentName] = useState("");
  const [connectedAgentUserId, setConnectedAgentUserId] = useState<string | null>(null);

  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [tiktokMessage, setTiktokMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient();

      const params = new URLSearchParams(window.location.search);

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

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role, status, agency_id")
        .eq("user_id", user.id)
        .single();

      if (roleError || !roleData) {
        console.error("CROWN LINK ROLE ERROR:", roleError);

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

      const { data: agency, error: agencyError } = await supabase
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

      const { data: existingProfile, error: profileError } =
        await supabase
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
          typeof user.user_metadata?.crownlink_agent_user_id === "string"
            ? user.user_metadata.crownlink_agent_user_id
            : null;

        const metadataRegistrationCode =
          typeof user.user_metadata?.crownlink_registration_code === "string"
            ? user.user_metadata.crownlink_registration_code
            : "";

        const linkedAgentUserId =
          existingProfile.agent_user_id || metadataAgentUserId;

        if (linkedAgentUserId) {
          setConnectedAgentUserId(linkedAgentUserId);

          if (metadataRegistrationCode) {
            setAgentRegistrationCode(metadataRegistrationCode);

            const response = await fetch(
              "/api/crownlink/agent-code/validate",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  code: metadataRegistrationCode,
                }),
              }
            );

            const validation = await response.json();

            if (response.ok && validation.valid) {
              setConnectedAgentName(
                validation.agentDisplayName ||
                  validation.agentAgencyName ||
                  "Crown Link Agent"
              );
            } else {
              setConnectedAgentName("Crown Link Agent");
            }
          } else {
            setConnectedAgentName("Crown Link Agent");
          }
        }
      }

      if (!existingProfile) {
        const metadataAgentUserId =
          typeof user.user_metadata?.crownlink_agent_user_id === "string"
            ? user.user_metadata.crownlink_agent_user_id
            : null;

        const metadataRegistrationCode =
          typeof user.user_metadata?.crownlink_registration_code === "string"
            ? user.user_metadata.crownlink_registration_code
            : "";

        if (metadataAgentUserId) {
          setConnectedAgentUserId(metadataAgentUserId);
          setAgentRegistrationCode(metadataRegistrationCode);

          if (metadataRegistrationCode) {
            const response = await fetch(
              "/api/crownlink/agent-code/validate",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  code: metadataRegistrationCode,
                }),
              }
            );

            const validation = await response.json();

            if (response.ok && validation.valid) {
              setConnectedAgentName(
                validation.agentDisplayName ||
                  validation.agentAgencyName ||
                  "Crown Link Agent"
              );
            } else {
              setConnectedAgentName("Crown Link Agent");
            }
          } else {
            setConnectedAgentName("Crown Link Agent");
          }
        }
      }

      setLoading(false);
    }

    checkUser();
  }, [router]);

  async function handleSubmit(e: FormEvent) {
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

    const { data: roleData, error: roleError } = await supabase
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

    const { data: agency, error: agencyError } = await supabase
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
      TikTok must be connected before the creator can finish
      their Crown Link profile. The username now comes directly
      from TikTok instead of being manually entered.
    */
    if (!tiktokConnected || !tiktokUsername) {
      setError(
        "Please connect your TikTok account before saving your Crown Link profile."
      );

      setSaving(false);
      return;
    }

    const diamonds = Number(diamondLevel);

    if (
      diamondLevel === "" ||
      Number.isNaN(diamonds) ||
      diamonds < 0
    ) {
      setError("Please enter a valid diamond level.");
      setSaving(false);
      return;
    }

    let agentUserId: string | null = connectedAgentUserId;

    if (!agentUserId && agentRegistrationCode.trim()) {
      const response = await fetch(
        "/api/crownlink/agent-code/validate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: agentRegistrationCode,
          }),
        }
      );

      const validation = await response.json();

      if (!response.ok || !validation.valid) {
        setError(
          validation.error ||
            "That agent registration code could not be verified."
        );
        setSaving(false);
        return;
      }

      agentUserId = validation.agentUserId ?? null;
    }

    /*
      Only Crown Link-editable information is updated here.

      TikTok username, profile photo, TikTok ID, and TikTok
      profile URL were already saved by the secure TikTok
      callback and are intentionally not overwritten here.
    */
    const { error: saveError } = await supabase
      .from("crownlink_profiles")
      .update({
        display_name: displayName.trim() || null,
        agency_name: agency.name,
        diamond_level: diamonds,
        agent_user_id: agentUserId,
        updated_at: new Date().toISOString(),
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
      <main className="cl-page loading">
        <p>Loading Crown Link...</p>

        <style jsx>{`
          .cl-page {
            min-height: 100vh;
            background: #080303;
            color: white;
          }

          .loading {
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="cl-page">
      <div className="cl-container">
        <div className="cl-brand">
          <div className="cl-crown">♛</div>

          <p className="cl-agency">
            ROYALS BLOODLINE
          </p>

          <h1>Crown Link</h1>

          <p className="cl-subtitle">
            Build your creator profile.
          </p>
        </div>

        <form
          className="cl-card"
          onSubmit={handleSubmit}
        >
          <div className="cl-heading">
            <h2>Your Creator Profile</h2>

            <p>
              Connect your TikTok account and complete
              your Crown Link information.
            </p>
          </div>

          <div className="tiktok-section">
            {!tiktokConnected ? (
              <>
                <div className="tiktok-icon">
                  ♪
                </div>

                <div className="tiktok-copy">
                  <strong>Connect your TikTok</strong>

                  <span>
                    Import your TikTok username, display
                    name, and profile photo automatically.
                  </span>
                </div>

                <a
                  href="/api/crownlink/tiktok/connect"
                  className="tiktok-button"
                >
                  Continue with TikTok
                </a>
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

                  <div>
                    <span className="connected-label">
                      ✓ TIKTOK CONNECTED
                    </span>

                    <strong>
                      {displayName || "TikTok Creator"}
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
          </div>

          {tiktokMessage && (
            <div className="cl-success">
              ✓ {tiktokMessage}
            </div>
          )}

          <div className="cl-divider">
            <span>PROFILE DETAILS</span>
          </div>

          <div className="cl-field">
            <label>Display Name</label>

            <input
              type="text"
              placeholder="Display Name"
              value={displayName}
              onChange={(e) =>
                setDisplayName(e.target.value)
              }
            />

            {tiktokConnected && (
              <small>
                Imported from TikTok. You can adjust your
                Crown Link display name if needed.
              </small>
            )}
          </div>

          <div className="cl-field">
            <label>TikTok Username</label>

            <div
              className={`username-display ${
                !tiktokConnected ? "not-connected" : ""
              }`}
            >
              <span className="username-at">@</span>

              <strong>
                {tiktokConnected && tiktokUsername
                  ? tiktokUsername
                  : "Connect TikTok to import username"}
              </strong>

              {tiktokConnected && (
                <span className="verified">
                  ✓ VERIFIED
                </span>
              )}
            </div>

            <small>
              {tiktokConnected
                ? "Your username is verified directly through TikTok and cannot be edited here."
                : "Connect your TikTok account above to import and verify your username."}
            </small>
          </div>

          <div className="cl-field">
            <label>Agency</label>

            <div className="agency-display">
              <div>
                <span className="agency-label">
                  ASSIGNED AGENCY
                </span>

                <strong>
                  {agencyName || "Not Assigned"}
                </strong>
              </div>

              <span className="agency-lock">
                🔒
              </span>
            </div>

            <small>
              Your agency is assigned by a Crown Link
              administrator and cannot be changed here.
            </small>
          </div>

          <div className="cl-field">
            <label>Agent</label>

            {connectedAgentUserId ? (
              <>
                <div className="agency-display">
                  <div>
                    <span className="agency-label">
                      CONNECTED AGENT
                    </span>

                    <strong>
                      {connectedAgentName || "Crown Link Agent"}
                    </strong>

                    {agentRegistrationCode && (
                      <small className="agent-code">
                        Registration Code: {agentRegistrationCode}
                      </small>
                    )}
                  </div>

                  <span className="agency-lock">
                    🔒
                  </span>
                </div>

                <small>
                  Your agent was connected automatically from the
                  registration code used to create your account.
                </small>
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Example: TESTAGENCY"
                  value={agentRegistrationCode}
                  onChange={(e) =>
                    setAgentRegistrationCode(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9_-]/g, "")
                    )
                  }
                />

                <small>
                  If your agent gave you a Crown Link registration code,
                  enter it here to connect your profile to their team.
                </small>
              </>
            )}
          </div>

          <div className="cl-field">
            <label>Diamond Level *</label>

            <input
              type="number"
              min="0"
              step="1"
              placeholder="Example: 250000"
              value={diamondLevel}
              onChange={(e) =>
                setDiamondLevel(e.target.value)
              }
              required
            />

            <small>
              Enter your current monthly diamond count.
              You can update this later.
            </small>
          </div>

          {error && (
            <div className="cl-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              saving ||
              !agencyName ||
              !tiktokConnected ||
              !tiktokUsername
            }
            className="cl-save"
          >
            {saving
              ? "Saving Profile..."
              : tiktokConnected
                ? "Save Creator Profile"
                : "Connect TikTok to Continue"}
          </button>

          <div className="legal-links">
            By connecting TikTok, you agree to the{" "}
            <a href="/crownlink/terms">
              Terms of Service
            </a>{" "}
            and acknowledge the{" "}
            <a href="/crownlink/privacy">
              Privacy Policy
            </a>
            .
          </div>
        </form>
      </div>

      <style jsx>{`
        .cl-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(105, 18, 25, 0.45),
              transparent 35%
            ),
            linear-gradient(
              135deg,
              #080303 0%,
              #160607 45%,
              #030303 100%
            );
          color: white;
          padding: 50px 20px;
        }

        .cl-container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }

        .cl-brand {
          text-align: center;
          margin-bottom: 32px;
        }

        .cl-crown {
          color: #d3a33c;
          font-size: 42px;
        }

        .cl-agency {
          margin: 5px 0 10px;
          color: #d3a33c;
          font-size: 12px;
          letter-spacing: 4px;
          font-weight: 800;
        }

        .cl-brand h1 {
          margin: 0;
          font-size: 52px;
          line-height: 1;
          font-weight: 900;
        }

        .cl-subtitle {
          margin: 14px 0 0;
          color: rgba(255, 255, 255, 0.55);
        }

        .cl-card {
          padding: 32px;
          border-radius: 22px;
          background: rgba(20, 10, 10, 0.8);
          border: 1px solid rgba(211, 163, 60, 0.25);
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
        }

        .cl-heading {
          margin-bottom: 24px;
        }

        .cl-heading h2 {
          margin: 0 0 8px;
          font-size: 25px;
        }

        .cl-heading p {
          margin: 0;
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
          line-height: 1.6;
        }

        .tiktok-section {
          padding: 20px;
          margin-bottom: 25px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.32);
        }

        .tiktok-icon {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          background: white;
          color: black;
          font-size: 24px;
          font-weight: 900;
        }

        .tiktok-copy {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .tiktok-copy strong {
          font-size: 17px;
        }

        .tiktok-copy span {
          color: rgba(255, 255, 255, 0.48);
          font-size: 12px;
          line-height: 1.5;
        }

        .tiktok-button {
          display: block;
          box-sizing: border-box;
          width: 100%;
          margin-top: 15px;
          padding: 13px;
          border-radius: 11px;
          background: white;
          color: #050505;
          text-align: center;
          text-decoration: none;
          font-size: 14px;
          font-weight: 900;
        }

        .connected-profile {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .connected-profile img,
        .profile-placeholder {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
          border: 2px solid rgba(211, 163, 60, 0.6);
        }

        .profile-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.07);
          color: #d3a33c;
          font-size: 24px;
        }

        .connected-profile div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .connected-label {
          color: #90e6a2;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.4px;
        }

        .connected-profile strong {
          font-size: 18px;
        }

        .connected-profile small {
          color: #d3a33c;
        }

        .reconnect-button {
          display: inline-block;
          margin-top: 14px;
          color: rgba(255, 255, 255, 0.45);
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;
        }

        .cl-success {
          padding: 12px 14px;
          margin-bottom: 20px;
          border-radius: 10px;
          background: rgba(60, 180, 90, 0.08);
          border: 1px solid rgba(80, 210, 110, 0.22);
          color: #b8f5c2;
          font-size: 13px;
        }

        .cl-divider {
          display: flex;
          align-items: center;
          margin: 28px 0 22px;
          color: rgba(255, 255, 255, 0.25);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .cl-divider::before,
        .cl-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
        }

        .cl-divider span {
          padding: 0 12px;
        }

        .cl-field {
          margin-bottom: 21px;
        }

        .cl-field label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 800;
        }

        .cl-field input {
          width: 100%;
          box-sizing: border-box;
          padding: 14px 15px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.45);
          color: white;
          font-size: 15px;
          outline: none;
        }

        .cl-field input:focus {
          border-color: rgba(211, 163, 60, 0.7);
          box-shadow: 0 0 0 3px rgba(211, 163, 60, 0.08);
        }

        .cl-field small {
          display: block;
          margin-top: 7px;
          color: rgba(255, 255, 255, 0.35);
          font-size: 11px;
          line-height: 1.5;
        }

        .username-display {
          display: flex;
          align-items: center;
          gap: 6px;
          min-height: 50px;
          padding: 0 15px;
          box-sizing: border-box;
          border-radius: 12px;
          border: 1px solid rgba(80, 210, 110, 0.24);
          background: rgba(60, 180, 90, 0.05);
        }

        .username-display.not-connected {
          border-color: rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.35);
        }

        .username-at {
          color: #d3a33c;
          font-weight: 900;
        }

        .username-display strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }

        .username-display.not-connected strong {
          color: rgba(255, 255, 255, 0.35);
          font-weight: 600;
        }

        .verified {
          margin-left: auto;
          color: #90e6a2;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
          white-space: nowrap;
        }

        .agency-display {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 56px;
          padding: 12px 15px;
          box-sizing: border-box;
          border-radius: 12px;
          border: 1px solid rgba(211, 163, 60, 0.28);
          background: rgba(211, 163, 60, 0.06);
        }

        .agency-display div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .agency-label {
          color: rgba(255, 255, 255, 0.35);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .agency-display strong {
          color: #d3a33c;
          font-size: 15px;
        }

        .agency-display .agent-code {
          margin-top: 2px;
          color: rgba(255, 255, 255, 0.45);
          font-size: 10px;
          font-weight: 700;
        }

        .agency-lock {
          opacity: 0.55;
          font-size: 16px;
        }

        .cl-error {
          padding: 12px 14px;
          margin-bottom: 18px;
          border-radius: 10px;
          background: rgba(255, 60, 60, 0.08);
          border: 1px solid rgba(255, 80, 80, 0.25);
          color: #ffaaaa;
          font-size: 13px;
        }

        .cl-save {
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(
            135deg,
            #d3a33c,
            #9e6f22
          );
          color: #080503;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
        }

        .cl-save:hover {
          transform: translateY(-1px);
        }

        .cl-save:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .legal-links {
          margin-top: 16px;
          text-align: center;
          color: rgba(255, 255, 255, 0.3);
          font-size: 10px;
          line-height: 1.6;
        }

        .legal-links a {
          color: rgba(211, 163, 60, 0.8);
          text-decoration: none;
        }

        @media (max-width: 600px) {
          .cl-page {
            padding: 30px 15px;
          }

          .cl-card {
            padding: 25px 20px;
          }

          .cl-brand h1 {
            font-size: 44px;
          }

          .verified {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}