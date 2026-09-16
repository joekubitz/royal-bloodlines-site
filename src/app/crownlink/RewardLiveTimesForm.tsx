"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  rewardId: string;
  initialTimes?: string | null;
  initialTimezone?: string | null;
};

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
];

export default function RewardLiveTimesForm({
  rewardId,
  initialTimes,
  initialTimezone,
}: Props) {
  const router = useRouter();

  const [liveTimes, setLiveTimes] = useState(
    initialTimes || ""
  );

  const [timezone, setTimezone] = useState(
    initialTimezone || "America/Chicago"
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveLiveTimes() {
    if (!liveTimes.trim()) {
      setError(
        "Please enter the times you typically go LIVE."
      );
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/crownlink/rewards/${rewardId}/live-times`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            liveTimes,
            timezone,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to save your LIVE times."
        );
      }

      setMessage(
        "Your typical LIVE times have been saved."
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your LIVE times."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        border:
          "1px solid rgba(245,158,11,0.22)",
        background:
          "rgba(245,158,11,0.05)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#fbbf24",
          fontSize: 9,
          fontWeight: 950,
          textTransform: "uppercase",
          letterSpacing: 1.7,
        }}
      >
        Help Us Catch You LIVE
      </p>

      <p
        style={{
          margin: "7px 0 0",
          color:
            "rgba(247,241,232,0.60)",
          fontSize: 11,
          lineHeight: 1.6,
        }}
      >
        Add the times you are typically streaming so
        our team has a better chance of catching you
        online to deliver this reward.
      </p>

      <p
        style={{
          margin: "8px 0 0",
          color: "#fbbf24",
          fontSize: 10,
          lineHeight: 1.55,
          fontWeight: 800,
        }}
      >
        This does not guarantee your reward will be
        dropped at a specific time or immediately when
        you go LIVE. These times are only used as a
        guide. Rewards will be delivered when a team
        member is available.
      </p>

      <div
        style={{
          marginTop: 14,
        }}
      >
        <label
          style={{
            display: "block",
            marginBottom: 6,
            color:
              "rgba(247,241,232,0.70)",
            fontSize: 10,
            fontWeight: 900,
          }}
        >
          Typical LIVE Times
        </label>

        <textarea
          value={liveTimes}
          onChange={(event) =>
            setLiveTimes(event.target.value)
          }
          placeholder={`Example:
Monday-Thursday: 7 PM-10 PM
Friday: 9 PM-12 AM
Weekends: Varies`}
          style={{
            width: "100%",
            minHeight: 110,
            padding: 12,
            borderRadius: 12,
            border:
              "1px solid rgba(255,255,255,0.10)",
            background: "#080808",
            color: "#f9f4ed",
            resize: "vertical",
            fontSize: 11,
          }}
        />
      </div>

      <div
        style={{
          marginTop: 12,
        }}
      >
        <label
          style={{
            display: "block",
            marginBottom: 6,
            color:
              "rgba(247,241,232,0.70)",
            fontSize: 10,
            fontWeight: 900,
          }}
        >
          Timezone
        </label>

        <select
          value={timezone}
          onChange={(event) =>
            setTimezone(event.target.value)
          }
          style={{
            width: "100%",
            maxWidth: 320,
            padding: "10px 11px",
            borderRadius: 12,
            border:
              "1px solid rgba(255,255,255,0.10)",
            background: "#080808",
            color: "#f9f4ed",
          }}
        >
          {TIMEZONES.map((zone) => (
            <option
              key={zone.value}
              value={zone.value}
            >
              {zone.label}
            </option>
          ))}
        </select>
      </div>

      {message ? (
        <p
          style={{
            margin: "12px 0 0",
            color: "#86efac",
            fontSize: 10,
            fontWeight: 850,
          }}
        >
          ✓ {message}
        </p>
      ) : null}

      {error ? (
        <p
          style={{
            margin: "12px 0 0",
            color: "#fca5a5",
            fontSize: 10,
            fontWeight: 850,
          }}
        >
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={saveLiveTimes}
        disabled={saving}
        style={{
          marginTop: 14,
          padding: "10px 15px",
          borderRadius: 999,
          border:
            "1px solid rgba(232,111,0,0.40)",
          background: "#e86f00",
          color: "#080808",
          fontSize: 9,
          fontWeight: 950,
          cursor: saving
            ? "wait"
            : "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving
          ? "Saving..."
          : "Save LIVE Times"}
      </button>
    </div>
  );
}