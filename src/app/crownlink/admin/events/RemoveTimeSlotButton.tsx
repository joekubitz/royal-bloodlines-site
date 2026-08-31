"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RemoveTimeSlotButtonProps = {
  timeSlotId: string;
};

export default function RemoveTimeSlotButton({
  timeSlotId,
}: RemoveTimeSlotButtonProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRemove() {
    const confirmed = window.confirm(
      "Remove this battle time slot?"
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/crownlink/admin/events/time-slots",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            timeSlotId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Unable to remove time slot."
        );
        return;
      }

      router.refresh();
    } catch (error) {
      console.error(
        "REMOVE TIME SLOT ERROR:",
        error
      );

      setError("Unable to remove time slot.");
    } finally {
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
          border: "none",
          background: "transparent",
          color: "#ff9f9f",
          fontSize: 11,
          fontWeight: 800,
          cursor: loading
            ? "not-allowed"
            : "pointer",
          padding: 0,
          marginLeft: 8,
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Removing..." : "Remove"}
      </button>

      {error && (
        <p
          style={{
            margin: "6px 0 0",
            color: "#ffaaaa",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}