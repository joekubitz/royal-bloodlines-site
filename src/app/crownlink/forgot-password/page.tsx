"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/app/supabase/client";

export default function CrownLinkForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    const supabase = createClient();

    // Preserve the Supabase allow-listed callback; the app redirects it
    // to /bloodline-arena/reset-password while retaining the recovery URL.
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/crownlink/reset-password`
        : undefined;

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo,
        }
      );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSuccess(
      "Password reset link sent. Check your email for the next step."
    );
    setLoading(false);
  }

  return (
    <main className="cl-page">
      <div className="cl-red-glow cl-red-glow-one" />
      <div className="cl-red-glow cl-red-glow-two" />
      <div className="cl-orange-glow" />

      <div className="cl-card">
        <div className="cl-crown">♛</div>

        <p className="cl-eyebrow">
          BLOODLINE ARENA ACCOUNT RECOVERY
        </p>

        <h1>Reset Password</h1>

        <p className="cl-description">
          Enter the email address associated with your Bloodline Arena
          account and we’ll send you a password reset link.
        </p>

        <form onSubmit={handleReset}>
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

          {error && (
            <div className="cl-message cl-error">
              {error}
            </div>
          )}

          {success && (
            <div className="cl-message cl-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="cl-reset-button"
          >
            <span>
              {loading
                ? "Sending..."
                : "Send Reset Link"}
            </span>

            {!loading && <span>→</span>}
          </button>
        </form>

        <Link
          href="/bloodline-arena/login"
          className="cl-back-link"
        >
          ← Back to Sign In
        </Link>
      </div>

      <p className="cl-bottom-brand">
        ROYALS BLOODLINE · BLOODLINE ARENA
      </p>

      <style jsx>{`
        .cl-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          box-sizing: border-box;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          padding: 30px 20px;

          color: #f7f1e8;

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

        .cl-card {
          width: 100%;
          max-width: 470px;

          position: relative;
          z-index: 2;

          box-sizing: border-box;

          padding: 46px 42px;

          border-radius: 28px;

          border:
            1px solid rgba(201, 151, 50, 0.19);

          background:
            linear-gradient(
              145deg,
              rgba(18, 15, 15, 0.96),
              rgba(5, 5, 5, 0.98)
            );

          box-shadow:
            0 35px 100px rgba(0, 0, 0, 0.68),
            0 0 65px rgba(88, 7, 12, 0.1);
        }

        .cl-crown {
          color: #c99732;
          font-size: 42px;
          line-height: 1;
          margin-bottom: 18px;
        }

        .cl-eyebrow {
          margin: 0;

          color: #c99732;

          font-size: 8px;
          font-weight: 950;
          letter-spacing: 2.5px;
        }

        h1 {
          margin: 7px 0 0;

          color: #f9f4ed;

          font-size: 34px;
          font-weight: 950;
          letter-spacing: -1.2px;
        }

        .cl-description {
          margin: 12px 0 30px;

          color:
            rgba(247, 241, 232, 0.42);

          font-size: 12px;
          line-height: 1.7;
        }

        .cl-field {
          margin-bottom: 18px;
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
        }

        .cl-field input:focus {
          border-color:
            rgba(201, 151, 50, 0.48);

          box-shadow:
            0 0 0 3px
              rgba(201, 151, 50, 0.055);
        }

        .cl-message {
          margin-bottom: 18px;

          padding: 12px 13px;

          border-radius: 12px;

          font-size: 12px;
          line-height: 1.5;
        }

        .cl-error {
          border:
            1px solid rgba(160, 30, 37, 0.38);

          background:
            rgba(88, 7, 12, 0.24);

          color: #e9a8aa;
        }

        .cl-success {
          border:
            1px solid rgba(201, 151, 50, 0.28);

          background:
            rgba(201, 151, 50, 0.07);

          color: #e4c47d;
        }

        .cl-reset-button {
          width: 100%;

          display: flex;
          align-items: center;
          justify-content: space-between;

          box-sizing: border-box;

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
        }

        .cl-reset-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        :global(.cl-back-link) {
          display: block;

          margin-top: 22px;

          color: #c99732;

          text-align: center;

          text-decoration: none;

          font-size: 10px;
          font-weight: 850;
        }

        :global(.cl-back-link:hover) {
          color: #e86f00;
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

        @media (max-width: 520px) {
          .cl-page {
            padding: 18px 13px;
          }

          .cl-card {
            padding: 34px 24px;
            border-radius: 22px;
          }
        }
      `}</style>
    </main>
  );
}
