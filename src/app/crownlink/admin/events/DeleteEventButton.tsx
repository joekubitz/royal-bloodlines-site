"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeleteEventButtonProps = {
  eventId: string;
  eventName: string;
};

export default function DeleteEventButton({
  eventId,
  eventName,
}: DeleteEventButtonProps) {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function handleDelete() {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${eventName}"?\n\nThis will permanently delete the event and its related schedule data.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        "/api/crownlink/admin/events/delete",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            eventId,
          }),
        }
      );

      const text =
        await response.text();

      let data: {
        success?: boolean;
        eventName?: string;
        error?: string;
      } = {};

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Server returned an invalid response (${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not delete event."
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete event."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        style={{
          border:
            "1px solid rgba(255,90,90,0.28)",
          borderRadius: 10,
          padding: "10px 13px",
          background:
            "rgba(255,70,70,0.08)",
          color: "#ffaaaa",
          fontSize: 11,
          fontWeight: 900,
          cursor: loading
            ? "not-allowed"
            : "pointer",
          opacity: loading
            ? 0.55
            : 1,
          whiteSpace: "nowrap",
        }}
      >
        {loading
          ? "Deleting..."
          : "Delete Event"}
      </button>

      {error && (
        <p
          style={{
            margin: "7px 0 0",
            color: "#ffaaaa",
            fontSize: 10,
            maxWidth: 180,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}