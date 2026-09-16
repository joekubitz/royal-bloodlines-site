"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  rewardId: string;
  dropped: boolean;
};

export default function RewardActions({
  rewardId,
  dropped,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function confirmDropped() {
    if (!proof) {
      setError("Please add a proof screenshot.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append("proof", proof);
      formData.append("notes", notes);

      const response = await fetch(
        `/api/crownlink/admin/rewards/${rewardId}/drop`,
        {
          method: "POST",
          body: formData,
        }
      );

      const contentType =
        response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const text = await response.text();

        console.error(
          "Non-JSON reward response:",
          response.status,
          text
        );

        throw new Error(
          `Reward API returned ${response.status}.`
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to mark reward as dropped."
        );
      }

      setOpen(false);
      setProof(null);
      setNotes("");

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to mark reward as dropped."
      );
    } finally {
      setLoading(false);
    }
  }

  if (dropped) {
    return (
      <span
        className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold"
        style={{
          backgroundColor: "#166534",
          color: "#ffffff",
          border: "1px solid #22c55e",
        }}
      >
        ✓ Dropped
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError("");
        }}
        className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-bold shadow-md"
        style={{
          backgroundColor: "#f59e0b",
          color: "#000000",
          border: "1px solid #fbbf24",
        }}
      >
        Mark Dropped
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-950 p-6 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  Mark Reward as Dropped
                </h2>

                <p className="mt-1 text-sm text-zinc-400">
                  Add a proof screenshot before completing this reward.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!loading) {
                    setOpen(false);
                    setError("");
                  }
                }}
                className="text-xl text-zinc-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-semibold">
                Proof Screenshot
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file =
                    event.target.files?.[0] ?? null;

                  setProof(file);
                  setError("");
                }}
                className="mt-2 block w-full rounded-xl border border-zinc-700 bg-black px-3 py-3 text-sm text-zinc-300"
              />

              {proof ? (
                <p className="mt-2 text-xs text-green-300">
                  Selected: {proof.name}
                </p>
              ) : null}
            </div>

            <div className="mt-5">
              <label className="block text-sm font-semibold">
                Notes
              </label>

              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder="Optional notes..."
                className="mt-2 min-h-[100px] w-full resize-y rounded-xl border border-zinc-700 bg-black px-3 py-3 text-sm text-white outline-none focus:border-orange-500"
              />
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!loading) {
                    setOpen(false);
                    setError("");
                  }
                }}
                disabled={loading}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDropped}
                disabled={loading || !proof}
                className="rounded-xl px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  backgroundColor: "#f59e0b",
                  color: "#000000",
                }}
              >
                {loading
                  ? "Saving..."
                  : "Confirm Dropped"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}