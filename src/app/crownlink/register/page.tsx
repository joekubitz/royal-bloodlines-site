"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/app/supabase/client";

export default function CrownLinkRegisterPage() {
  const [registrationCode, setRegistrationCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;

    setError("");

    const normalizedCode = registrationCode
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "");

    if (!normalizedCode) {
      setError("A registration code is required.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/crownlink/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registrationCode: normalizedCode,
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Your Crown Link account could not be created."
        );
        setLoading(false);
        return;
      }

      const supabase = createClient();

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (loginError) {
        setError(
          "Your account was created, but Crown Link could not sign you in automatically. Please return to the login page and sign in."
        );
        setLoading(false);
        return;
      }

      window.location.href = "/crownlink/profile/setup";
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating your account."
      );
      setLoading(false);
    }
  }

  return (
    <main className="cl-page">
      <div className="cl-register-container">
        <div className="cl-brand">
          <div className="cl-crown">♛</div>
          <p className="cl-agency">ROYALS BLOODLINE</p>
          <h1>Crown Link</h1>
          <p className="cl-tagline">Connect. Match. Battle.</p>
        </div>

        <div className="cl-card">
          <div className="cl-card-header">
            <h2>Create Creator Account</h2>
            <p>
              Enter the registration code from your Crown Link agent,
              then create your login.
            </p>
          </div>

          <form onSubmit={handleRegister}>
            <div className="cl-field">
              <label htmlFor="registrationCode">
                Registration Code
              </label>
              <input
                id="registrationCode"
                type="text"
                placeholder="Enter your agent code"
                value={registrationCode}
                onChange={(e) =>
                  setRegistrationCode(
                    e.target.value.toUpperCase()
                  )
                }
                required
                autoComplete="off"
              />
            </div>

            <div className="cl-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="cl-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div className="cl-field">
              <label htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="cl-error">{error}</div>
            )}

            <button
              type="submit"
              className="cl-register-button"
              disabled={loading}
            >
              {loading
                ? "Creating Account..."
                : "Create Account"}
            </button>
          </form>

          <div className="cl-back">
            Already have an account?{" "}
            <Link href="/crownlink/login">Sign in</Link>
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

        .cl-register-container {
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
          line-height: 1.55;
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
          line-height: 1.45;
        }

        .cl-register-button {
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
        }

        .cl-register-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .cl-back {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          text-align: center;
          color: rgba(255, 255, 255, 0.45);
          font-size: 12px;
        }

        .cl-back :global(a) {
          color: #d3a33c;
          text-decoration: none;
          font-weight: 800;
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
