"use client";

import { useState } from "react";

type Props = {
  signupId: string;
};

export default function RestoreSignupButton({
  signupId,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRestore() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/crownlink/admin/events/restore-signup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            signupId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.error ||
            "Unable to restore signup."
        );
        setLoading(false);
        return;
      }

      window.location.reload();
    } catch (error) {
      console.error(
        "Restore signup error:",
        error
      );

      setError(
        "Something went wrong restoring the signup."
      );
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleRestore}
        disabled={loading}
        style={{
          padding: "9px 13px",
          borderRadius: 10,
          border:
            "1px solid rgba(211,163,60,0.35)",
          background:
            "rgba(211,163,60,0.10)",
          color: "#d3a33c",
          fontWeight: 800,
          fontSize: 12,
          cursor: loading
            ? "not-allowed"
            : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading
          ? "Restoring..."
          : "Restore Signup"}
      </button>

      {error && (
        <p
          style={{
            margin: "7px 0 0",
            color: "#ffaaaa",
            fontSize: 11,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}