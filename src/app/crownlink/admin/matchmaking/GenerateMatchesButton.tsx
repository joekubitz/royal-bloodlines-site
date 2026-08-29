"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  eventId: string;
  eventName: string;
};

export default function GenerateMatchesButton({
  eventId,
  eventName,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleGenerate() {
    const confirmed = window.confirm(
      `Generate suggested matches for "${eventName}"?`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/crownlink/admin/matchmaking/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Could not generate matches."
        );
        return;
      }

      const matchText =
        result.matchesCreated === 1
          ? "1 suggested match created."
          : `${result.matchesCreated} suggested matches created.`;

      const unmatchedText =
        result.unmatchedCreators?.length > 0
          ? ` ${result.unmatchedCreators.length} creator left unmatched.`
          : "";

      setMessage(
        `${matchText}${unmatchedText}`
      );

      router.refresh();
    } catch {
      setError("Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        style={{
          padding: "13px 18px",
          borderRadius: 12,
          border: "none",
          background:
            "linear-gradient(135deg, #d3a33c, #9e6f22)",
          color: "#080503",
          fontWeight: 900,
          cursor: loading
            ? "not-allowed"
            : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading
          ? "Generating..."
          : "Generate Suggested Matches"}
      </button>

      {message && (
        <p
          style={{
            margin: "10px 0 0",
            color: "#b8f5c2",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          ✓ {message}
        </p>
      )}

      {error && (
        <p
          style={{
            margin: "10px 0 0",
            color: "#ffaaaa",
            fontSize: 12,
            maxWidth: 300,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}