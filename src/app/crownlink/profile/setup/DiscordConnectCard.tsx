"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/supabase/client";

type DiscordProfile = {
  discord_user_id: string | null;
  discord_username: string | null;
  discord_connected_at: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Discord connection was canceled.",
  discord_authorization_failed:
    "Discord authorization could not be completed.",
  missing_code:
    "Discord did not return an authorization code.",
  invalid_state:
    "The Discord connection could not be verified. Please try again.",
  token_exchange_failed:
    "Discord authorization could not be completed.",
  profile_fetch_failed:
    "Crown Link could not retrieve your Discord account.",
  profile_update_failed:
    "Your Discord account could not be saved to Crown Link.",
  missing_profile:
    "Your Crown Link creator profile could not be found.",
  missing_configuration:
    "Discord connection is not fully configured yet.",
  invalid_creator_account:
    "Your Crown Link creator account could not be verified.",
  discord_already_connected:
    "That Discord account is already connected to another Crown Link creator.",
  unexpected:
    "Something unexpected happened while connecting Discord.",
};

export default function DiscordConnectCard() {
  const [loading, setLoading] = useState(true);
  const [discordProfile, setDiscordProfile] =
    useState<DiscordProfile>({
      discord_user_id: null,
      discord_username: null,
      discord_connected_at: null,
    });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDiscordConnection() {
      const params = new URLSearchParams(
        window.location.search
      );

      const connected =
        params.get("discord_connected");
      const discordError =
        params.get("discord_error");

      if (connected === "1") {
        setMessage(
          "Discord connected successfully. Crown Link can now send you battle notifications by DM."
        );
      }

      if (discordError) {
        setError(
          ERROR_MESSAGES[discordError] ||
            decodeURIComponent(discordError)
        );
      }

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error: profileError } =
        await supabase
          .from("crownlink_profiles")
          .select(
            `
              discord_user_id,
              discord_username,
              discord_connected_at
            `
          )
          .eq("user_id", user.id)
          .maybeSingle();

      if (profileError) {
        console.error(
          "CROWN LINK DISCORD PROFILE LOAD ERROR:",
          profileError
        );

        setError(
          "Crown Link could not load your Discord connection."
        );
        setLoading(false);
        return;
      }

      if (data) {
        setDiscordProfile({
          discord_user_id:
            data.discord_user_id ?? null,
          discord_username:
            data.discord_username ?? null,
          discord_connected_at:
            data.discord_connected_at ?? null,
        });
      }

      setLoading(false);
    }

    loadDiscordConnection();
  }, []);

  const connected =
    Boolean(discordProfile.discord_user_id);

  return (
    <section className="discord-card">
      <div className="discord-icon">D</div>

      <div className="discord-content">
        <div className="discord-heading-row">
          <div>
            <span className="discord-kicker">
              BATTLE NOTIFICATIONS
            </span>

            <strong>
              {connected
                ? "Discord Connected"
                : "Connect Discord"}
            </strong>
          </div>

          <span
            className={
              connected
                ? "discord-status connected"
                : "discord-status"
            }
          >
            {connected
              ? "✓ CONNECTED"
              : "NOT CONNECTED"}
          </span>
        </div>

        {loading ? (
          <p className="discord-description">
            Checking Discord connection...
          </p>
        ) : connected ? (
          <>
            <p className="discord-description">
              Crown Link can send battle matchups,
              schedule updates, reminders, and other
              battle notifications directly to your
              Discord DMs.
            </p>

            <div className="discord-account">
              <span>CONNECTED DISCORD</span>

              <strong>
                {discordProfile.discord_username ||
                  "Discord User"}
              </strong>
            </div>

            <a
              href="/api/crownlink/discord/connect"
              className="discord-secondary-button"
            >
              Connect Different Discord
            </a>
          </>
        ) : (
          <>
            <p className="discord-description">
              Link your Discord account so Crown Link
              can DM you when you are matched, when
              battle details change, and when reminders
              are sent.
            </p>

            <a
              href="/api/crownlink/discord/connect"
              className="discord-button"
            >
              Connect Discord
              <span>→</span>
            </a>

            <small className="discord-note">
              Crown Link only requests your basic
              Discord identity. It does not read your
              messages.
            </small>
          </>
        )}

        {message && (
          <div className="discord-success">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="discord-error">
            ! {error}
          </div>
        )}
      </div>

      <style jsx>{`
        .discord-card {
          display: grid;
          grid-template-columns: 54px 1fr;
          gap: 15px;
          margin: 18px 0 22px;
          padding: 18px;
          border: 1px solid
            rgba(88, 101, 242, 0.28);
          border-radius: 18px;
          background:
            radial-gradient(
              circle at top right,
              rgba(88, 101, 242, 0.14),
              transparent 45%
            ),
            linear-gradient(
              145deg,
              rgba(15, 15, 20, 0.98),
              rgba(5, 5, 7, 0.98)
            );
        }

        .discord-icon {
          width: 54px;
          height: 54px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid
            rgba(88, 101, 242, 0.38);
          border-radius: 15px;
          background: rgba(88, 101, 242, 0.13);
          color: #9fa8ff;
          font-size: 21px;
          font-weight: 1000;
        }

        .discord-content {
          min-width: 0;
        }

        .discord-heading-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .discord-heading-row > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .discord-kicker {
          color: #8993ff;
          font-size: 7px;
          font-weight: 950;
          letter-spacing: 1.5px;
        }

        .discord-heading-row strong {
          color: #f7f1e8;
          font-size: 15px;
          font-weight: 950;
        }

        .discord-status {
          flex-shrink: 0;
          padding: 6px 8px;
          border: 1px solid
            rgba(247, 241, 232, 0.09);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.025);
          color: rgba(247, 241, 232, 0.36);
          font-size: 6px;
          font-weight: 950;
          letter-spacing: 0.8px;
        }

        .discord-status.connected {
          border-color: rgba(70, 205, 127, 0.22);
          background: rgba(70, 205, 127, 0.08);
          color: #75db9f;
        }

        .discord-description {
          margin: 9px 0 0;
          color: rgba(247, 241, 232, 0.48);
          font-size: 10px;
          line-height: 1.7;
        }

        .discord-account {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 13px;
          padding: 11px 12px;
          border: 1px solid
            rgba(88, 101, 242, 0.16);
          border-radius: 11px;
          background: rgba(88, 101, 242, 0.06);
        }

        .discord-account span {
          color: rgba(159, 168, 255, 0.65);
          font-size: 6px;
          font-weight: 950;
          letter-spacing: 1px;
        }

        .discord-account strong {
          overflow: hidden;
          color: #f7f1e8;
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .discord-button,
        .discord-secondary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 40px;
          margin-top: 13px;
          padding: 0 14px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 9px;
          font-weight: 950;
          transition:
            transform 0.15s ease,
            opacity 0.15s ease;
        }

        .discord-button:hover,
        .discord-secondary-button:hover {
          transform: translateY(-1px);
        }

        .discord-button {
          background: #5865f2;
          color: white;
          box-shadow: 0 8px 25px
            rgba(88, 101, 242, 0.18);
        }

        .discord-secondary-button {
          border: 1px solid
            rgba(88, 101, 242, 0.22);
          background: rgba(88, 101, 242, 0.08);
          color: #aeb5ff;
        }

        .discord-note {
          display: block;
          margin-top: 9px;
          color: rgba(247, 241, 232, 0.28);
          font-size: 8px;
          line-height: 1.5;
        }

        .discord-success,
        .discord-error {
          margin-top: 12px;
          padding: 10px 11px;
          border-radius: 10px;
          font-size: 8px;
          font-weight: 800;
          line-height: 1.5;
        }

        .discord-success {
          border: 1px solid
            rgba(70, 205, 127, 0.2);
          background: rgba(70, 205, 127, 0.07);
          color: #86e2aa;
        }

        .discord-error {
          border: 1px solid
            rgba(220, 72, 72, 0.2);
          background: rgba(220, 72, 72, 0.07);
          color: #ed8e8e;
        }

        @media (max-width: 600px) {
          .discord-card {
            grid-template-columns: 1fr;
          }

          .discord-icon {
            width: 46px;
            height: 46px;
          }

          .discord-heading-row {
            align-items: flex-start;
          }

          .discord-status {
            margin-top: 2px;
          }

          .discord-button,
          .discord-secondary-button {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
