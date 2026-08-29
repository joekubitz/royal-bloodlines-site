"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  userId: string;
  currentStatus: "active" | "suspended";
};

export default function CreatorStatusButton({
  userId,
  currentStatus,
}: Props) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const nextStatus =
    currentStatus === "active" ? "suspended" : "active";

  async function handleClick() {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        "/api/crownlink/admin/creators/status",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            status: nextStatus,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Could not update creator.");
        setSaving(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={saving}
        style={{
          padding: "8px 12px",
          borderRadius: 10,
          border:
            currentStatus === "active"
              ? "1px solid rgba(255,80,80,0.25)"
              : "1px solid rgba(80,210,110,0.25)",
          background:
            currentStatus === "active"
              ? "rgba(255,70,70,0.08)"
              : "rgba(60,180,90,0.1)",
          color:
            currentStatus === "active"
              ? "#ffb0b0"
              : "#b8f5c2",
          fontWeight: 800,
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving
          ? "Saving..."
          : currentStatus === "active"
          ? "Suspend"
          : "Reactivate"}
      </button>

      {error && (
        <span
          style={{
            color: "#ffaaaa",
            fontSize: 11,
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}