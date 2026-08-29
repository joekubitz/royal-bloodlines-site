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

  const [error, setError] = useState("");

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/crownlink/login");
        return;
      }

      // Get the creator's official Crown Link role + agency assignment
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

      // Look up the official agency assigned by the admin
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
        console.error("CROWN LINK AGENCY ERROR:", agencyError);

        setError(
          "Your assigned agency could not be loaded. Please contact an administrator."
        );

        setLoading(false);
        return;
      }

      setAgencyName(agency.name);

      // Load existing creator profile if one already exists
      const { data: existingProfile } = await supabase
        .from("crownlink_profiles")
        .select(
          "display_name, tiktok_username, diamond_level, profile_photo_url"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingProfile) {
        setDisplayName(existingProfile.display_name || "");
        setTiktokUsername(
          existingProfile.tiktok_username || ""
        );

        setDiamondLevel(
          existingProfile.diamond_level !== null &&
            existingProfile.diamond_level !== undefined
            ? String(existingProfile.diamond_level)
            : ""
        );

        setProfilePhotoUrl(
          existingProfile.profile_photo_url || ""
        );
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

    // Re-check the official agency assignment before saving
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

    const cleanUsername = tiktokUsername
      .trim()
      .replace(/^@/, "");

    if (!cleanUsername) {
      setError("Please enter your TikTok username.");
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

    const tiktokProfileUrl =
      `https://www.tiktok.com/@${cleanUsername}`;

    const { error: saveError } = await supabase
      .from("crownlink_profiles")
      .upsert(
        {
          user_id: user.id,
          display_name: displayName.trim() || null,
          tiktok_username: cleanUsername,

          // Agency comes from the admin assignment
          agency_name: agency.name,

          diamond_level: diamonds,
          profile_photo_url:
            profilePhotoUrl.trim() || null,
          tiktok_profile_url: tiktokProfileUrl,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (saveError) {
      console.error(saveError);

      if (
        saveError.message
          .toLowerCase()
          .includes("tiktok_username")
      ) {
        setError(
          "That TikTok username is already connected to another Crown Link account."
        );
      } else {
        setError(
          "We couldn't save your profile. Please try again."
        );
      }

      setSaving(false);
      return;
    }

    router.push("/crownlink");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="cl-page">
        <p>Loading Crown Link...</p>

        <style jsx>{`
          .cl-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #080303;
            color: white;
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
              This information will be used for Crown Link
              events and battle matchmaking.
            </p>
          </div>

          <div className="cl-field">
            <label>Display Name</label>

            <input
              type="text"
              placeholder="Joe"
              value={displayName}
              onChange={(e) =>
                setDisplayName(e.target.value)
              }
            />
          </div>

          <div className="cl-field">
            <label>TikTok Username *</label>

            <div className="username-input">
              <span>@</span>

              <input
                type="text"
                placeholder="username"
                value={tiktokUsername}
                onChange={(e) =>
                  setTiktokUsername(e.target.value)
                }
                required
              />
            </div>
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

              <span className="agency-lock">🔒</span>
            </div>

            <small>
              Your agency is assigned by a Crown Link
              administrator and cannot be changed here.
            </small>
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

          <div className="cl-field">
            <label>Profile Photo URL</label>

            <input
              type="url"
              placeholder="https://..."
              value={profilePhotoUrl}
              onChange={(e) =>
                setProfilePhotoUrl(e.target.value)
              }
            />

            <small>
              We'll replace this with an easier profile
              photo uploader later.
            </small>
          </div>

          {error && (
            <div className="cl-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !agencyName}
            className="cl-save"
          >
            {saving
              ? "Saving Profile..."
              : "Save Creator Profile"}
          </button>
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
          margin-bottom: 28px;
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

        .username-input {
          display: flex;
          align-items: center;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.45);
          border-radius: 12px;
          overflow: hidden;
        }

        .username-input span {
          padding-left: 15px;
          color: #d3a33c;
          font-weight: 900;
        }

        .username-input input {
          border: none;
          background: transparent;
        }

        .username-input:focus-within {
          border-color: rgba(211, 163, 60, 0.7);
          box-shadow: 0 0 0 3px rgba(211, 163, 60, 0.08);
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
        }
      `}</style>
    </main>
  );
}