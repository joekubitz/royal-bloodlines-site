"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/supabase/client";

type AgencyStatusButtonProps = {
  agencyId: string;
  currentStatus: "active" | "inactive";
};

export default function AgencyStatusButton({
  agencyId,
  currentStatus,
}: AgencyStatusButtonProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const nextStatus =
    currentStatus === "active" ? "inactive" : "active";

  async function handleToggle() {
    setSaving(true);
    setError("");

    const supabase = createClient();

    const { error } = await supabase
      .from("crownlink_agencies")
      .update({
        status: nextStatus,
      })
      .eq("id", agencyId);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.refresh();
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
        onClick={handleToggle}
        disabled={saving}
        style={{
          padding: "8px 12px",
          borderRadius: 10,
          border:
            currentStatus === "active"
              ? "1px solid rgba(255,100,100,0.3)"
              : "1px solid rgba(80,210,110,0.3)",
          background:
            currentStatus === "active"
              ? "rgba(255,70,70,0.08)"
              : "rgba(60,180,90,0.1)",
          color:
            currentStatus === "active"
              ? "#ffb0b0"
              : "#b8f5c2",
          fontWeight: 800,
          fontSize: 12,
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving
          ? "Saving..."
          : currentStatus === "active"
          ? "Deactivate"
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