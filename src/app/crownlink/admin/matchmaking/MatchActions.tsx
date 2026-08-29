"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  matchId: string;
};

export default function MatchActions({
  matchId,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState<
    "approve" | "cancel" | null
  >(null);

  const [error, setError] = useState("");

  async function handleAction(
    action: "approve" | "cancel"
  ) {
    const confirmed = window.confirm(
      action === "approve"
        ? "Approve this matchup?"
        : "Cancel this suggested matchup?"
    );

    if (!confirmed) {
      return;
    }

    setLoading(action);
    setError("");

    try {
      const response = await fetch(
        "/api/crownlink/admin/matchmaking/status",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            matchId,
            action,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error || "Could not update match."
        );
        return;
      }

      router.refresh();
    } catch {
      setError("Unexpected error.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      style={{
        marginTop: 18,
        paddingTop: 16,
        borderTop:
          "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => handleAction("approve")}
          style={{
            padding: "11px 16px",
            borderRadius: 10,
            border: "none",
            background:
              "linear-gradient(135deg, #d3a33c, #9e6f22)",
            color: "#080503",
            fontWeight: 900,
            cursor:
              loading !== null
                ? "not-allowed"
                : "pointer",
            opacity: loading !== null ? 0.6 : 1,
          }}
        >
          {loading === "approve"
            ? "Approving..."
            : "Approve Match"}
        </button>

        <button
          type="button"
          disabled={loading !== null}
          onClick={() => handleAction("cancel")}
          style={{
            padding: "11px 16px",
            borderRadius: 10,
            border:
              "1px solid rgba(255,100,100,0.25)",
            background:
              "rgba(255,70,70,0.06)",
            color: "#ffaaaa",
            fontWeight: 800,
            cursor:
              loading !== null
                ? "not-allowed"
                : "pointer",
            opacity: loading !== null ? 0.6 : 1,
          }}
        >
          {loading === "cancel"
            ? "Cancelling..."
            : "Cancel Match"}
        </button>
      </div>

      {error && (
        <p
          style={{
            margin: "10px 0 0",
            color: "#ffaaaa",
            fontSize: 12,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}