"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ArchiveEventButtonProps = {
  eventId: string;
  eventName: string;
};

export default function ArchiveEventButton({
  eventId,
  eventName,
}: ArchiveEventButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleArchive() {
    const confirmed = window.confirm(
      `Archive "${eventName}"?\n\nThe event will be removed from active event pages, but its matches, attendance, scores, replacements, screenshots, and notes will be kept for history.`
    );

    if (!confirmed) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        "/api/crownlink/admin/events/archive",
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to archive event.");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to archive event."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 8,
      }}
    >
      <button
        type="button"
        onClick={handleArchive}
        disabled={busy}
        style={{
          width: "100%",
          padding: "11px 14px",
          borderRadius: 10,
          border: "1px solid rgba(211,163,60,0.28)",
          background: busy
            ? "rgba(211,163,60,0.05)"
            : "rgba(211,163,60,0.1)",
          color: busy
            ? "rgba(255,255,255,0.35)"
            : "#d3a33c",
          fontSize: 12,
          fontWeight: 900,
          cursor: busy ? "not-allowed" : "pointer",
        }}
      >
        {busy ? "Archiving..." : "Archive Event"}
      </button>

      {error && (
        <p
          style={{
            margin: 0,
            color: "#ffb0b0",
            fontSize: 11,
            lineHeight: 1.4,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
