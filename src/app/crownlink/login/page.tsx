"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/app/supabase/client";

export default function CrownLinkLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const supabase = createClient();

    const {
      data,
      error: loginError,
    } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", data.user.id)
      .single();

    if (roleError || !userRole) {
      console.error("CROWN LINK ROLE ERROR:", roleError);

      await supabase.auth.signOut();

      setError(
        roleError
          ? `Role error: ${roleError.message}`
          : "No Crown Link role was found for this account."
      );

      setLoading(false);
      return;
    }

    if (userRole.status !== "active") {
      await supabase.auth.signOut();

      setError(
        "Your Crown Link account is currently suspended."
      );

      setLoading(false);
      return;
    }

    if (!["admin", "creator", "agent"].includes(userRole.role)) {
      await supabase.auth.signOut();

      setError(
        "Your account does not have Crown Link access."
      );

      setLoading(false);
      return;
    }

    if (userRole.role === "admin") {
      window.location.href = "/crownlink/admin";
      return;
    }

    if (userRole.role === "agent") {
      window.location.href = "/crownlink/agent";
      return;
    }

    window.location.href = "/crownlink";
  }

  return (
    <main className="cl-page">
      <div className="cl-red-glow cl-red-glow-one" />
      <div className="cl-red-glow cl-red-glow-two" />
      <div className="cl-orange-glow" />

      <div className="cl-shell">
        {/* BRAND SIDE */}
        <section className="cl-brand-side">
          <div className="cl-brand-content">
            <div className="cl-brand-pill">
              <span className="cl-brand-dot" />
              <span>ROYALS BLOODLINE</span>
            </div>

            <div className="cl-crown">♛</div>

            <p className="cl-eyebrow">
              THE BATTLE NETWORK
            </p>

            <h1>
              Crown
              <br />
              <span>Link</span>
            </h1>

            <div className="cl-title-line" />

            <p className="cl-tagline">
              Connect. Match. Battle.
            </p>

            <p className="cl-description">
              The Royals Bloodline battle platform for creators,
              agents, matchmaking, events, and competition.
            </p>

            <div className="cl-brand-footer">
              <span>ROYALS BLOODLINE</span>
              <span className="cl-brand-footer-dot" />
              <span>CROWN LINK</span>
            </div>
          </div>
        </section>

        {/* LOGIN SIDE */}
        <section className="cl-login-side">
          <div className="cl-login-top">
            <p className="cl-section-eyebrow">
              ACCOUNT ACCESS
            </p>

            <h2>Welcome Back</h2>

            <p>
              Sign in to continue to Crown Link.
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="cl-field">
              <label htmlFor="email">
                Email Address
              </label>

              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
                autoComplete="email"
              />
            </div>

            <div className="cl-field">
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="cl-error">
                <div className="cl-error-dot" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="cl-login-button"
            >
              <span>
                {loading
                  ? "Signing In..."
                  : "Enter Crown Link"}
              </span>

              {!loading && (
                <span className="cl-arrow">
                  →
                </span>
              )}
            </button>
          </form>

          <div className="cl-divider">
            <span>New to Crown Link?</span>
          </div>

          <Link
            href="/crownlink/register"
            className="cl-register-button"
          >
            <span>Create Creator Account</span>
            <span className="cl-register-arrow">
              →
            </span>
          </Link>

          <p className="cl-register-note">
            A valid registration code from your agent is
            required to create an account.
          </p>

          <div className="cl-access-note">
            <div className="cl-access-icon">
              ♛
            </div>

            <div>
              <strong>Approved Access Only</strong>

              <p>
                Crown Link is available to approved agency
                creators and agents.
              </p>
            </div>
          </div>
        </section>
      </div>

      <p className="cl-bottom-brand">
        ROYALS BLOODLINE · CROWN LINK
      </p>

      <style jsx>{`
        .cl-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          box-sizing: border-box;

          background:
            radial-gradient(
              circle at 12% 10%,
              rgba(88, 7, 12, 0.5),
              transparent 32%
            ),
            radial-gradient(
              circle at 88% 78%,
              rgba(74, 5, 10, 0.2),
              transparent 32%
            ),
            radial-gradient(
              circle at 90% 12%,
              rgba(232, 111, 0, 0.055),
              transparent 25%
            ),
            linear-gradient(
              180deg,
              #080808 0%,
              #030303 52%,
              #000000 100%
            );

          color: #f7f1e8;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          padding: 36px 20px 26px;
        }

        .cl-red-glow {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
          filter: blur(100px);
        }

        .cl-red-glow-one {
          width: 420px;
          height: 420px;
          left: -180px;
          top: -150px;
          background: rgba(102, 6, 13, 0.24);
        }

        .cl-red-glow-two {
          width: 380px;
          height: 380px;
          right: -180px;
          bottom: -160px;
          background: rgba(74, 5, 10, 0.17);
        }

        .cl-orange-glow {
          position: absolute;
          width: 260px;
          height: 260px;
          right: 5%;
          top: 2%;
          border-radius: 999px;
          background: rgba(232, 111, 0, 0.045);
          filter: blur(90px);
          pointer-events: none;
        }

        .cl-shell {
          width: 100%;
          max-width: 1050px;

          position: relative;
          z-index: 2;

          display: grid;
          grid-template-columns:
            minmax(0, 1.05fr)
            minmax(390px, 0.95fr);

          border-radius: 30px;

          border:
            1px solid rgba(201, 151, 50, 0.19);

          background:
            linear-gradient(
              145deg,
              rgba(18, 15, 15, 0.95),
              rgba(5, 5, 5, 0.97)
            );

          box-shadow:
            0 35px 100px rgba(0, 0, 0, 0.68),
            0 0 65px rgba(88, 7, 12, 0.1),
            inset 0 1px 0
              rgba(255, 255, 255, 0.025);

          overflow: hidden;
        }

        /* LEFT SIDE */

        .cl-brand-side {
          position: relative;
          overflow: hidden;

          padding: 58px 50px;

          display: flex;
          align-items: center;

          background:
            radial-gradient(
              circle at 20% 20%,
              rgba(106, 7, 14, 0.42),
              transparent 44%
            ),
            radial-gradient(
              circle at 80% 90%,
              rgba(232, 111, 0, 0.065),
              transparent 34%
            ),
            linear-gradient(
              145deg,
              rgba(47, 5, 9, 0.92),
              rgba(14, 8, 9, 0.97) 54%,
              rgba(5, 5, 5, 0.98)
            );

          border-right:
            1px solid rgba(201, 151, 50, 0.14);
        }

        .cl-brand-side::after {
          content: "";

          position: absolute;

          width: 310px;
          height: 310px;

          left: -120px;
          bottom: -160px;

          border-radius: 50%;

          border:
            1px solid rgba(201, 151, 50, 0.07);
        }

        .cl-brand-content {
          position: relative;
          z-index: 2;

          width: 100%;
        }

        .cl-brand-pill {
          display: inline-flex;
          align-items: center;
          gap: 9px;

          padding: 7px 11px;

          border-radius: 999px;

          border:
            1px solid rgba(201, 151, 50, 0.24);

          background:
            rgba(201, 151, 50, 0.055);

          color: #d9b15c;

          font-size: 8px;
          font-weight: 950;
          letter-spacing: 2.4px;

          margin-bottom: 42px;
        }

        .cl-brand-dot {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: #c99732;

          box-shadow:
            0 0 11px rgba(201, 151, 50, 0.58);
        }

        .cl-crown {
          color: #c99732;

          font-size: 54px;
          line-height: 1;

          text-shadow:
            0 0 26px rgba(201, 151, 50, 0.14);

          margin-bottom: 18px;
        }

        .cl-eyebrow {
          margin: 0 0 8px;

          color: #c99732;

          font-size: 9px;
          font-weight: 950;
          letter-spacing: 3.4px;
        }

        .cl-brand-side h1 {
          margin: 0;

          font-size: clamp(56px, 7vw, 82px);

          line-height: 0.84;

          font-weight: 950;

          letter-spacing: -4px;

          text-transform: uppercase;

          color: #f9f4ed;

          text-shadow:
            0 8px 35px rgba(0, 0, 0, 0.55);
        }

        .cl-brand-side h1 span {
          color: #e86f00;

          text-shadow:
            0 0 26px rgba(232, 111, 0, 0.15);
        }

        .cl-title-line {
          width: 85px;
          height: 3px;

          margin-top: 25px;

          background:
            linear-gradient(
              90deg,
              #e86f00,
              #c99732,
              transparent
            );

          box-shadow:
            0 0 13px rgba(232, 111, 0, 0.25);
        }

        .cl-tagline {
          margin: 22px 0 0;

          color: #d9b15c;

          font-size: 15px;
          font-weight: 900;

          letter-spacing: 0.5px;
        }

        .cl-description {
          max-width: 410px;

          margin: 13px 0 0;

          color:
            rgba(247, 241, 232, 0.42);

          font-size: 12px;
          line-height: 1.7;
        }

        .cl-brand-footer {
          display: flex;
          align-items: center;
          gap: 10px;

          margin-top: 48px;

          color:
            rgba(247, 241, 232, 0.22);

          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.7px;
        }

        .cl-brand-footer-dot {
          width: 3px;
          height: 3px;

          border-radius: 50%;

          background:
            rgba(201, 151, 50, 0.5);
        }

        /* LOGIN SIDE */

        .cl-login-side {
          padding: 55px 48px;

          background:
            linear-gradient(
              145deg,
              rgba(14, 14, 14, 0.94),
              rgba(5, 5, 5, 0.98)
            );
        }

        .cl-login-top {
          margin-bottom: 30px;
        }

        .cl-section-eyebrow {
          margin: 0;

          color: #c99732;

          font-size: 8px;
          font-weight: 950;
          letter-spacing: 2.6px;
        }

        .cl-login-top h2 {
          margin: 7px 0 0;

          font-size: 31px;

          font-weight: 950;

          letter-spacing: -1px;

          color: #f9f4ed;
        }

        .cl-login-top p:last-child {
          margin: 8px 0 0;

          color:
            rgba(247, 241, 232, 0.42);

          font-size: 13px;
        }

        .cl-field {
          margin-bottom: 19px;
        }

        .cl-field label {
          display: block;

          margin-bottom: 8px;

          color:
            rgba(247, 241, 232, 0.68);

          font-size: 10px;
          font-weight: 900;

          letter-spacing: 0.8px;

          text-transform: uppercase;
        }

        .cl-field input {
          width: 100%;

          box-sizing: border-box;

          padding: 14px 15px;

          border-radius: 13px;

          border:
            1px solid rgba(255, 255, 255, 0.085);

          background:
            rgba(0, 0, 0, 0.46);

          color: #f9f4ed;

          font-size: 14px;

          outline: none;

          transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease,
            background 0.18s ease;
        }

        .cl-field input:focus {
          border-color:
            rgba(201, 151, 50, 0.48);

          background:
            rgba(0, 0, 0, 0.6);

          box-shadow:
            0 0 0 3px
              rgba(201, 151, 50, 0.055);
        }

        .cl-field input::placeholder {
          color:
            rgba(247, 241, 232, 0.2);
        }

        .cl-error {
          display: flex;
          align-items: flex-start;
          gap: 10px;

          margin-bottom: 18px;

          padding: 12px 13px;

          border-radius: 12px;

          border:
            1px solid rgba(160, 30, 37, 0.38);

          background:
            rgba(88, 7, 12, 0.24);

          color: #e9a8aa;

          font-size: 12px;
          line-height: 1.45;
        }

        .cl-error-dot {
          width: 6px;
          height: 6px;

          flex-shrink: 0;

          margin-top: 5px;

          border-radius: 50%;

          background: #a81d26;

          box-shadow:
            0 0 10px rgba(168, 29, 38, 0.45);
        }

        .cl-login-button {
          width: 100%;

          box-sizing: border-box;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 14px 16px;

          border-radius: 13px;

          border:
            1px solid rgba(232, 111, 0, 0.42);

          background:
            linear-gradient(
              135deg,
              #b84e00,
              #e86f00
            );

          color: #fff7ed;

          font-size: 12px;
          font-weight: 950;

          letter-spacing: 0.7px;

          text-transform: uppercase;

          cursor: pointer;

          box-shadow:
            0 12px 30px rgba(0, 0, 0, 0.32),
            0 0 22px rgba(232, 111, 0, 0.08);

          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease,
            opacity 0.15s ease;
        }

        .cl-login-button:hover {
          transform: translateY(-1px);

          box-shadow:
            0 15px 35px rgba(0, 0, 0, 0.38),
            0 0 28px rgba(232, 111, 0, 0.12);
        }

        .cl-login-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .cl-arrow {
          font-size: 17px;
        }

        .cl-divider {
          display: flex;
          align-items: center;
          gap: 12px;

          margin: 25px 0 17px;

          color:
            rgba(247, 241, 232, 0.25);

          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 1.7px;
          font-weight: 900;
        }

        .cl-divider::before,
        .cl-divider::after {
          content: "";

          flex: 1;

          height: 1px;

          background:
            rgba(201, 151, 50, 0.11);
        }

        :global(.cl-register-button) {
          width: 100%;

          box-sizing: border-box;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 13px 15px;

          border-radius: 13px;

          border:
            1px solid rgba(201, 151, 50, 0.24);

          background:
            rgba(201, 151, 50, 0.045);

          color: #d9b15c;

          text-decoration: none;

          font-size: 11px;
          font-weight: 950;

          text-transform: uppercase;
          letter-spacing: 0.65px;

          transition:
            background 0.15s ease,
            border-color 0.15s ease,
            transform 0.15s ease;
        }

        :global(.cl-register-button:hover) {
          transform: translateY(-1px);

          background:
            rgba(201, 151, 50, 0.075);

          border-color:
            rgba(201, 151, 50, 0.4);
        }

        .cl-register-arrow {
          font-size: 15px;
        }

        .cl-register-note {
          margin: 10px 0 0;

          color:
            rgba(247, 241, 232, 0.28);

          font-size: 10px;
          line-height: 1.5;

          text-align: center;
        }

        .cl-access-note {
          display: flex;
          gap: 12px;
          align-items: flex-start;

          margin-top: 27px;

          padding-top: 21px;

          border-top:
            1px solid rgba(201, 151, 50, 0.1);
        }

        .cl-access-icon {
          width: 32px;
          height: 32px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 10px;

          border:
            1px solid rgba(201, 151, 50, 0.18);

          background:
            rgba(201, 151, 50, 0.045);

          color: #c99732;

          font-size: 15px;
        }

        .cl-access-note strong {
          display: block;

          color:
            rgba(249, 244, 237, 0.72);

          font-size: 10px;
          font-weight: 900;
        }

        .cl-access-note p {
          margin: 5px 0 0;

          color:
            rgba(247, 241, 232, 0.3);

          font-size: 10px;
          line-height: 1.5;
        }

        .cl-bottom-brand {
          position: relative;
          z-index: 2;

          margin: 20px 0 0;

          color:
            rgba(247, 241, 232, 0.16);

          font-size: 8px;
          font-weight: 900;

          letter-spacing: 2.5px;
        }

        @media (max-width: 850px) {
          .cl-page {
            justify-content: flex-start;
          }

          .cl-shell {
            max-width: 520px;

            grid-template-columns: 1fr;
          }

          .cl-brand-side {
            padding: 38px 30px;

            border-right: none;

            border-bottom:
              1px solid rgba(201, 151, 50, 0.14);
          }

          .cl-brand-pill {
            margin-bottom: 25px;
          }

          .cl-crown {
            font-size: 42px;
          }

          .cl-brand-side h1 {
            font-size: clamp(50px, 14vw, 70px);
          }

          .cl-brand-footer {
            display: none;
          }

          .cl-login-side {
            padding: 38px 30px;
          }
        }

        @media (max-width: 520px) {
          .cl-page {
            padding: 18px 13px 22px;
          }

          .cl-shell {
            border-radius: 22px;
          }

          .cl-brand-side {
            padding: 30px 22px;
          }

          .cl-login-side {
            padding: 30px 22px;
          }

          .cl-brand-side h1 {
            letter-spacing: -3px;
          }

          .cl-description {
            font-size: 11px;
          }
        }
      `}</style>
    </main>
  );
}