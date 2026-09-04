"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type MatchActionsProps = {
  matchId: string;
  eventId: string;
  status: string;
};

type BusyAction = "cancel" | "rematch" | null;

export default function MatchActions({
  matchId,
  eventId,
  status,
}: MatchActionsProps) {
  const router = useRouter();

  const [busyAction, setBusyAction] =
    useState<BusyAction>(null);

  const [error, setError] =
    useState("");

  async function cancelMatch(
    refreshAfter = true
  ) {
    const response = await fetch(
      "/api/crownlink/admin/matchmaking/status",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          matchId,
          action: "cancel",
        }),
      }
    );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
          "Could not cancel this match."
      );
    }

    if (refreshAfter) {
      router.refresh();
    }

    return result;
  }

  async function handleCancel() {
    const confirmed =
      window.confirm(
        "Cancel this match? The creators will remain signed up for the event."
      );

    if (!confirmed) {
      return;
    }

    setBusyAction("cancel");
    setError("");

    try {
      await cancelMatch(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not cancel this match."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRematch() {
    const confirmed =
      window.confirm(
        "Rematch this battle? Crown Link will cancel this matchup and automatically generate a replacement while preserving the other scheduled matches."
      );

    if (!confirmed) {
      return;
    }

    setBusyAction("rematch");
    setError("");

    try {
      /*
       * First remove the current matchup.
       * The creators remain signed up.
       */
      await cancelMatch(false);

      /*
       * Then run the existing generator.
       * It preserves all other active
       * matches and fills the newly open
       * spots where possible.
       */
      const response = await fetch(
        "/api/crownlink/admin/matchmaking/generate",
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
        throw new Error(
          result.error ||
            "The match was cancelled, but Crown Link could not generate a replacement."
        );
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not rematch this battle."
      );

      /*
       * Refresh even after an error because
       * the original match may already have
       * been successfully cancelled.
       */
      router.refresh();
    } finally {
      setBusyAction(null);
    }
  }

  const isBusy =
    busyAction !== null;

  const isActive =
    status === "approved" ||
    status === "suggested";

  if (!isActive) {
    return null;
  }

  return (
    <div
      style={{
        marginTop: 18,
        paddingTop: 16,
        borderTop:
          "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={handleRematch}
          disabled={isBusy}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border:
              "1px solid rgba(211,163,60,0.35)",
            background:
              "rgba(211,163,60,0.10)",
            color: "#d3a33c",
            fontWeight: 900,
            cursor:
              isBusy
                ? "not-allowed"
                : "pointer",
            opacity:
              isBusy ? 0.55 : 1,
          }}
        >
          {busyAction === "rematch"
            ? "Rematching..."
            : "Rematch"}
        </button>

        <button
          type="button"
          onClick={handleCancel}
          disabled={isBusy}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border:
              "1px solid rgba(255,100,100,0.30)",
            background:
              "rgba(255,80,80,0.07)",
            color: "#ffaaaa",
            fontWeight: 900,
            cursor:
              isBusy
                ? "not-allowed"
                : "pointer",
            opacity:
              isBusy ? 0.55 : 1,
          }}
        >
          {busyAction === "cancel"
            ? "Cancelling..."
            : "Cancel Match"}
        </button>
      </div>

      {error && (
        <p
          style={{
            margin:
              "10px 0 0",
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
