"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GenerateScheduleSlotsButtonProps = {
  eventId: string;
};

export default function GenerateScheduleSlotsButton({
  eventId,
}: GenerateScheduleSlotsButtonProps) {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  async function handleGenerate() {
    const confirmed = window.confirm(
      "Generate battle times for this event? This will rebuild any previously generated schedule times."
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/crownlink/admin/schedule/generate-slots",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            eventId,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Could not generate schedule times."
        );
        return;
      }

      setMessage(
        result.message ||
          "Schedule times generated."
      );

      router.refresh();
    } catch {
      setError("Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 16,
      }}
    >
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        style={{
          padding: "11px 15px",
          borderRadius: 11,
          border: "none",
          background:
            "linear-gradient(135deg, #d3a33c, #9e6f22)",
          color: "#080503",
          fontWeight: 900,
          cursor: loading
            ? "not-allowed"
            : "pointer",
          opacity: loading
            ? 0.6
            : 1,
        }}
      >
        {loading
          ? "Generating..."
          : "Generate Schedule Times"}
      </button>

      {message && (
        <p
          style={{
            margin: "10px 0 0",
            color: "#b8f5c2",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
      )}

      {error && (
        <p
          style={{
            margin: "10px 0 0",
            color: "#ffaaaa",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}