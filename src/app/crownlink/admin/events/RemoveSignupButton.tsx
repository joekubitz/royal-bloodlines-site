"use client";

import { useState } from "react";

type Props = {
  signupId: string;
};

export default function RemoveSignupButton({
  signupId,
}: Props) {
  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleRemove() {
    const confirmed = window.confirm(
      "Remove this creator from the event? They will not be able to rejoin unless an admin restores them."
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/crownlink/admin/events/remove-signup",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            signupId,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data?.error ||
            "Unable to remove creator."
        );

        setLoading(false);
        return;
      }

      window.location.reload();
    } catch (error) {
      console.error(
        "Remove signup error:",
        error
      );

      setError(
        "Something went wrong removing the creator."
      );

      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleRemove}
        disabled={loading}
        style={{
          padding: "9px 13px",
          borderRadius: 10,
          border:
            "1px solid rgba(255,90,90,0.35)",
          background:
            "rgba(255,90,90,0.08)",
          color: "#ffaaaa",
          fontWeight: 800,
          fontSize: 12,
          cursor: loading
            ? "not-allowed"
            : "pointer",
          opacity: loading
            ? 0.6
            : 1,
        }}
      >
        {loading
          ? "Removing..."
          : "Remove Creator"}
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