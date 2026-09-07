"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [recoveryReady, setRecoveryReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkRecoverySession() {
      setCheckingSession(true);
      setErrorMessage("");

      const params = new URLSearchParams(window.location.search);

      const urlError = params.get("error");
      const errorCode = params.get("error_code");
      const errorDescription = params.get("error_description");

      if (urlError) {
        if (!mounted) return;

        let message = "This password reset link is invalid or has expired.";

        if (errorCode === "otp_expired") {
          message =
            "This password reset link has expired or has already been used. Please request a new reset link.";
        } else if (errorDescription) {
          message = errorDescription.replace(/\+/g, " ");
        }

        setRecoveryReady(false);
        setErrorMessage(message);
        setCheckingSession(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        if (!mounted) return;

        setRecoveryReady(true);
        setCheckingSession(false);
        return;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;

        if (event === "PASSWORD_RECOVERY" && session) {
          setRecoveryReady(true);
          setErrorMessage("");
          setCheckingSession(false);
        }
      });

      window.setTimeout(async () => {
        if (!mounted) return;

        const {
          data: { session: delayedSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (delayedSession) {
          setRecoveryReady(true);
          setErrorMessage("");
        } else {
          setRecoveryReady(false);
          setErrorMessage(
            "We could not verify this password reset link. Please request a new reset link."
          );
        }

        setCheckingSession(false);
      }, 1500);

      return () => {
        subscription.unsubscribe();
      };
    }

    let cleanup: (() => void) | undefined;

    checkRecoverySession().then((result) => {
      if (typeof result === "function") {
        cleanup = result;
      }
    });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [supabase]);

  async function handleResetPassword(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!password || !confirmPassword) {
      setErrorMessage("Enter your new password in both fields.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Your password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("The passwords do not match.");
      return;
    }

    if (!recoveryReady) {
      setErrorMessage(
        "Your password reset session is no longer valid. Please request a new reset link."
      );
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setSuccessMessage("Your password has been updated successfully.");

    await supabase.auth.signOut();

    setLoading(false);

    window.setTimeout(() => {
      router.push("/crownlink/login");
    }, 1800);
  }

  return (
    <>
      <main className="cl-page">
        <div className="cl-glow cl-glow-one" />
        <div className="cl-glow cl-glow-two" />

        <section className="cl-card">
          <div className="cl-crown">♛</div>

          <p className="cl-eyebrow">CROWN LINK</p>

          <h1>Reset Password</h1>

          <p className="cl-description">
            Create a new password for your Crown Link account.
          </p>

          {checkingSession ? (
            <div className="cl-status cl-status-neutral">
              Verifying your reset link...
            </div>
          ) : recoveryReady ? (
            <form onSubmit={handleResetPassword} className="cl-form">
              <div className="cl-field">
                <label htmlFor="password">New Password</label>

                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="cl-field">
                <label htmlFor="confirmPassword">Confirm New Password</label>

                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  disabled={loading}
                />
              </div>

              {errorMessage && (
                <div className="cl-status cl-status-error">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="cl-status cl-status-success">
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                className="cl-button"
                disabled={loading || Boolean(successMessage)}
              >
                {loading ? "Updating Password..." : "Update Password"}
              </button>
            </form>
          ) : (
            <>
              <div className="cl-status cl-status-error">
                {errorMessage ||
                  "This password reset link is no longer valid."}
              </div>

              <Link
                href="/crownlink/forgot-password"
                className="cl-button cl-link-button"
              >
                Request New Reset Link
              </Link>
            </>
          )}

          <div className="cl-back-row">
            <Link href="/crownlink/login" className="cl-back-link">
              Back to Sign In
            </Link>
          </div>
        </section>
      </main>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          background: #050505;
          font-family: Arial, Helvetica, sans-serif;
        }

        .cl-page {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 32px 18px;
          background:
            radial-gradient(
              circle at top,
              rgba(183, 91, 23, 0.11),
              transparent 38%
            ),
            linear-gradient(180deg, #080808 0%, #030303 100%);
        }

        .cl-glow {
          position: absolute;
          border-radius: 999px;
          filter: blur(100px);
          pointer-events: none;
        }

        .cl-glow-one {
          width: 320px;
          height: 320px;
          top: -100px;
          left: -120px;
          background: rgba(218, 112, 32, 0.1);
        }

        .cl-glow-two {
          width: 300px;
          height: 300px;
          bottom: -120px;
          right: -100px;
          background: rgba(150, 55, 12, 0.09);
        }

        .cl-card {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 470px;
          padding: 38px 34px 34px;
          border: 1px solid rgba(217, 130, 60, 0.28);
          border-radius: 22px;
          background: rgba(13, 13, 13, 0.96);
          box-shadow:
            0 28px 80px rgba(0, 0, 0, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.02);
        }

        .cl-crown {
          text-align: center;
          font-size: 34px;
          color: #d98745;
          margin-bottom: 10px;
          text-shadow: 0 0 20px rgba(217, 135, 69, 0.22);
        }

        .cl-eyebrow {
          margin: 0 0 9px;
          text-align: center;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.28em;
          color: #c87a3e;
        }

        .cl-card h1 {
          margin: 0;
          text-align: center;
          font-size: clamp(28px, 5vw, 38px);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #f7f3ee;
        }

        .cl-description {
          margin: 13px auto 28px;
          max-width: 340px;
          text-align: center;
          color: #96918b;
          font-size: 14px;
          line-height: 1.6;
        }

        .cl-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .cl-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cl-field label {
          color: #d7d0c9;
          font-size: 13px;
          font-weight: 700;
        }

        .cl-field input {
          width: 100%;
          min-height: 49px;
          padding: 0 14px;
          border: 1px solid #292929;
          border-radius: 10px;
          outline: none;
          background: #0a0a0a;
          color: #f6f3ef;
          font-size: 14px;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .cl-field input::placeholder {
          color: #5f5b58;
        }

        .cl-field input:focus {
          border-color: #b96832;
          box-shadow: 0 0 0 3px rgba(185, 104, 50, 0.11);
        }

        .cl-field input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cl-button {
          width: 100%;
          min-height: 50px;
          border: 1px solid #c7763b;
          border-radius: 10px;
          background: linear-gradient(135deg, #b75e29, #d18447);
          color: #fff;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            filter 0.15s ease,
            opacity 0.15s ease;
        }

        .cl-button:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.08);
        }

        .cl-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cl-link-button {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 18px;
          text-decoration: none;
        }

        .cl-status {
          margin-bottom: 18px;
          padding: 12px 13px;
          border-radius: 10px;
          font-size: 13px;
          line-height: 1.45;
        }

        .cl-form .cl-status {
          margin-bottom: 0;
        }

        .cl-status-neutral {
          border: 1px solid #34302d;
          background: #11100f;
          color: #b5aea7;
          text-align: center;
        }

        .cl-status-error {
          border: 1px solid rgba(214, 72, 72, 0.35);
          background: rgba(150, 30, 30, 0.1);
          color: #ec9c9c;
        }

        .cl-status-success {
          border: 1px solid rgba(78, 170, 106, 0.35);
          background: rgba(30, 130, 62, 0.1);
          color: #9fddaF;
        }

        .cl-back-row {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #202020;
          text-align: center;
        }

        .cl-back-link {
          color: #b96e39;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .cl-back-link:hover {
          color: #e59b5d;
        }

        @media (max-width: 540px) {
          .cl-card {
            padding: 32px 22px 28px;
            border-radius: 18px;
          }
        }
      `}</style>
    </>
  );
}