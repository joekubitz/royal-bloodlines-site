"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RemoveEventDateButtonProps = {
  eventDateId: string;
};

export default function RemoveEventDateButton({
  eventDateId,
}: RemoveEventDateButtonProps) {
  const router = useRouter();

  const [removing, setRemoving] =
    useState(false);
  const [error, setError] =
    useState("");

  async function handleRemove() {
    const confirmed = window.confirm(
      "Remove this required event date?"
    );

    if (!confirmed) {
      return;
    }

    setRemoving(true);
    setError("");

    try {
      const response = await fetch(
        "/api/crownlink/admin/events/dates",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            eventDateId,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Could not remove date."
        );
        return;
      }

      router.refresh();
    } catch {
      setError("Unexpected error.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleRemove}
        disabled={removing}
        title="Remove date"
        style={{
          border: "none",
          background: "transparent",
          color: "#ffaaaa",
          fontSize: 15,
          fontWeight: 900,
          cursor: removing
            ? "not-allowed"
            : "pointer",
          padding: 0,
          lineHeight: 1,
          opacity: removing
            ? 0.5
            : 1,
        }}
      >
        {removing ? "..." : "×"}
      </button>

      {error && (
        <p
          style={{
            margin: "6px 0 0",
            color: "#ffaaaa",
            fontSize: 10,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}