"use client";

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

    if (!["admin", "creator"].includes(userRole.role)) {
      await supabase.auth.signOut();

      setError(
        "Your account does not have Crown Link access."
      );

      setLoading(false);
      return;
    }

    if (userRole.role === "admin") {
      window.location.href = "/crownlink/admin";
    } else {
      window.location.href = "/crownlink";
    }
  }

  return (
    <main className="cl-page">
      <div className="cl-login-container">
        <div className="cl-brand">
          <div className="cl-crown">♛</div>

          <p className="cl-agency">
            ROYALS BLOODLINE
          </p>

          <h1>Crown Link</h1>

          <p className="cl-tagline">
            Connect. Match. Battle.
          </p>
        </div>

        <div className="cl-card">
          <div className="cl-card-header">
            <h2>Welcome Back</h2>

            <p>
              Sign in to your Crown Link account.
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="cl-field">
              <label htmlFor="email">
                Email
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
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="cl-login-button"
            >
              {loading
                ? "Signing In..."
                : "Sign In"}
            </button>
          </form>

          <div className="cl-footer">
            Crown Link is available to approved
            agency creators.
          </div>
        </div>
      </div>

      <style jsx>{`
        .cl-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 50% 10%,
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
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 30px 20px;
        }

        .cl-login-container {
          width: 100%;
          max-width: 470px;
        }

        .cl-brand {
          text-align: center;
          margin-bottom: 30px;
        }

        .cl-crown {
          color: #d3a33c;
          font-size: 42px;
          margin-bottom: 5px;
        }

        .cl-agency {
          margin: 0 0 10px;
          color: #d3a33c;
          font-size: 12px;
          letter-spacing: 4px;
          font-weight: 700;
        }

        .cl-brand h1 {
          margin: 0;
          font-size: clamp(42px, 8vw, 58px);
          line-height: 1;
          font-weight: 850;
          letter-spacing: -2px;
        }

        .cl-tagline {
          color: rgba(255, 255, 255, 0.6);
          margin: 14px 0 0;
          font-size: 15px;
        }

        .cl-card {
          padding: 32px;
          border-radius: 22px;
          background: rgba(20, 10, 10, 0.8);
          border: 1px solid rgba(211, 163, 60, 0.25);
          box-shadow:
            0 25px 80px rgba(0, 0, 0, 0.55),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(15px);
        }

        .cl-card-header {
          margin-bottom: 28px;
        }

        .cl-card-header h2 {
          margin: 0 0 7px;
          font-size: 25px;
        }

        .cl-card-header p {
          margin: 0;
          color: rgba(255, 255, 255, 0.55);
          font-size: 14px;
        }

        .cl-field {
          margin-bottom: 20px;
        }

        .cl-field label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.82);
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
          transition: 0.2s ease;
        }

        .cl-field input:focus {
          border-color: rgba(211, 163, 60, 0.7);
          box-shadow:
            0 0 0 3px rgba(211, 163, 60, 0.08);
        }

        .cl-field input::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }

        .cl-error {
          margin-bottom: 18px;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid rgba(255, 80, 80, 0.3);
          background: rgba(255, 50, 50, 0.08);
          color: #ffaaaa;
          font-size: 13px;
        }

        .cl-login-button {
          width: 100%;
          border: none;
          border-radius: 12px;
          padding: 14px;
          background: linear-gradient(
            135deg,
            #d3a33c,
            #9e6f22
          );
          color: #090603;
          font-weight: 900;
          font-size: 15px;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            opacity 0.15s ease;
        }

        .cl-login-button:hover {
          transform: translateY(-1px);
        }

        .cl-login-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .cl-footer {
          margin-top: 24px;
          padding-top: 20px;
          border-top:
            1px solid rgba(255, 255, 255, 0.07);
          text-align: center;
          color: rgba(255, 255, 255, 0.4);
          font-size: 12px;
        }

        @media (max-width: 520px) {
          .cl-page {
            padding: 24px 15px;
          }

          .cl-card {
            padding: 25px 20px;
          }
        }
      `}</style>
    </main>
  );
}