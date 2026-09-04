"use client";

import { FormEvent, useState } from "react";

export default function AgentBattleProfileForm({
  initialDiamondLevel,
}: {
  initialDiamondLevel: number;
}) {
  const [diamondLevel, setDiamondLevel] = useState(
    String(initialDiamondLevel || 0)
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setMessage("");
    setError("");

    const parsedDiamondLevel = Number(
      diamondLevel.replace(/,/g, "").trim()
    );

    if (
      !Number.isFinite(parsedDiamondLevel) ||
      parsedDiamondLevel < 0
    ) {
      setError("Enter a valid diamond amount.");
      setSaving(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
    }, 15000);

    try {
      const response = await fetch(
        "/api/crownlink/agent/battle-profile",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            diamondLevel: Math.round(parsedDiamondLevel),
          }),
          signal: controller.signal,
        }
      );

      const text = await response.text();

      let result: {
        success?: boolean;
        diamondLevel?: number;
        error?: string;
      } = {};

      if (text) {
        try {
          result = JSON.parse(text);
        } catch {
          throw new Error(
            `The server returned an invalid response (${response.status}).`
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            `Could not update your battle profile (${response.status}).`
        );
      }

      const savedDiamondLevel =
        result.diamondLevel ?? Math.round(parsedDiamondLevel);

      setDiamondLevel(String(savedDiamondLevel));
      setMessage("Battle profile updated.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(
          "The save request timed out. Check the terminal running your Crown Link site for an error."
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Could not update your battle profile."
        );
      }
    } finally {
      window.clearTimeout(timeout);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label
        htmlFor="agent-diamond-level"
        style={{
          display: "block",
          marginBottom: 7,
          color: "rgba(255,255,255,0.55)",
          fontSize: 11,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        Typical Diamonds
      </label>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <input
          id="agent-diamond-level"
          type="number"
          min="0"
          step="1"
          value={diamondLevel}
          onChange={(event) =>
            setDiamondLevel(event.target.value)
          }
          disabled={saving}
          style={{
            flex: "1 1 180px",
            minWidth: 0,
            padding: "12px 13px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.28)",
            color: "white",
            outline: "none",
            fontSize: 14,
            fontWeight: 800,
          }}
        />

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid rgba(211,163,60,0.3)",
            background: "rgba(211,163,60,0.12)",
            color: "#d3a33c",
            fontSize: 12,
            fontWeight: 900,
            cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.65 : 1,
          }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {message ? (
        <p
          style={{
            margin: "8px 0 0",
            color: "#8fd19e",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {message}
        </p>
      ) : null}

      {error ? (
        <p
          style={{
            margin: "8px 0 0",
            color: "#ff8f8f",
            fontSize: 12,
            fontWeight: 800,
            lineHeight: 1.45,
          }}
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
