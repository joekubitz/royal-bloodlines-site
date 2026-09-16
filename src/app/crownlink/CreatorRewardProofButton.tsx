"use client";

import { useState } from "react";

type Props = {
  rewardId: string;
};

export default function CreatorRewardProofButton({
  rewardId,
}: Props) {
  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function viewProof() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/crownlink/rewards/${rewardId}/proof`,
        {
          method: "GET",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to view proof."
        );
      }

      window.open(
        data.url,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to view proof."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={viewProof}
        disabled={loading}
        style={{
          padding: "9px 13px",
          borderRadius: 999,
          border:
            "1px solid rgba(34,197,94,0.35)",
          background:
            "rgba(34,197,94,0.12)",
          color: "#86efac",
          fontSize: 9,
          fontWeight: 950,
          cursor:
            loading
              ? "wait"
              : "pointer",
        }}
      >
        {loading
          ? "Opening..."
          : "View Delivery Proof"}
      </button>

      {error && (
        <p
          style={{
            margin: "6px 0 0",
            color: "#fca5a5",
            fontSize: 9,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}