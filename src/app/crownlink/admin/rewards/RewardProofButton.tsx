"use client";

import { useState } from "react";

type Props = {
  proofPath: string | null;
};

export default function RewardProofButton({
  proofPath,
}: Props) {
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");

  async function viewProof() {
    if (!proofPath) {
      setError(
        "No proof was uploaded for this reward."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/crownlink/admin/rewards/proof",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            proofPath,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to open proof."
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
          : "Unable to open proof."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={viewProof}
        disabled={loading}
        className="rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-50"
        style={{
          backgroundColor:
            "#16a34a",
          color: "#ffffff",
          border:
            "1px solid #22c55e",
        }}
      >
        {loading
          ? "Opening..."
          : "View Proof"}
      </button>

      {error ? (
        <p className="max-w-[220px] text-xs font-medium text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}