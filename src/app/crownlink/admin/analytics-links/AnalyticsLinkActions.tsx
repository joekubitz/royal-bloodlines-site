"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AnalyticsLinkActions({
  requestId,
}: {
  requestId: string;
}) {
  const router = useRouter();

  const [loading, setLoading] =
    useState<"approve" | "reject" | null>(null);

  const [error, setError] =
    useState("");

  async function handleAction(
    action: "approve" | "reject"
  ) {
    setLoading(action);
    setError("");

    try {
      const response = await fetch(
        "/api/crownlink/admin/analytics-links",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestId,
            action,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to update request."
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update request."
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-w-[210px]">
      <div className="flex gap-3">
        <button
          type="button"
          disabled={loading !== null}
          onClick={() =>
            handleAction("approve")
          }
          className="flex-1 rounded-xl bg-green-700 px-4 py-3 text-sm font-bold transition hover:bg-green-600 disabled:opacity-50"
        >
          {loading === "approve"
            ? "Approving..."
            : "Approve"}
        </button>

        <button
          type="button"
          disabled={loading !== null}
          onClick={() =>
            handleAction("reject")
          }
          className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
        >
          {loading === "reject"
            ? "Rejecting..."
            : "Reject"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}