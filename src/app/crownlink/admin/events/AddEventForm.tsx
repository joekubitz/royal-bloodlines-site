"use client";

import { FormEvent, useState } from "react";

export default function AddEventForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prizeInformation, setPrizeInformation] =
    useState("");

  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");

  const [battleIntervalMinutes, setBattleIntervalMinutes] =
    useState("10");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    const interval =
      Number(battleIntervalMinutes);

    if (
      !Number.isInteger(interval) ||
      interval <= 0
    ) {
      setError(
        "Battle interval must be at least 1 minute."
      );
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(
        "/api/crownlink/admin/events",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name,
            description,
            prizeInformation,
            eventDate,
            eventTime,
            battleIntervalMinutes:
              interval,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Could not create event."
        );
        setSaving(false);
        return;
      }

      setSuccess(
        "Event created successfully."
      );

      setName("");
      setDescription("");
      setPrizeInformation("");
      setEventDate("");
      setEventTime("");
      setBattleIntervalMinutes("10");
    } catch {
      setError("Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: 28,
        borderRadius: 20,
        background:
          "rgba(20,10,10,0.78)",
        border:
          "1px solid rgba(211,163,60,0.25)",
      }}
    >
      <h2
        style={{
          marginTop: 0,
          marginBottom: 22,
          fontSize: 23,
        }}
      >
        Create Event
      </h2>

      <div
        style={{
          display: "grid",
          gap: 18,
        }}
      >
        <div>
          <label style={labelStyle}>
            Event Name
          </label>

          <input
            type="text"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            placeholder="September Battle Series"
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Event Description
          </label>

          <textarea
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            placeholder="Explain what the event is, how it works, and anything creators should know before signing up."
            rows={5}
            required
            style={textareaStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Prize Information
          </label>

          <textarea
            value={prizeInformation}
            onChange={(e) =>
              setPrizeInformation(
                e.target.value
              )
            }
            placeholder={`Example:
1st Place: 50,000 coins
2nd Place: 25,000 coins
3rd Place: 10,000 coins`}
            rows={5}
            style={textareaStyle}
          />

          <p style={helperTextStyle}>
            Leave this blank if the event
            does not have prizes.
          </p>
        </div>

        <div>
          <label style={labelStyle}>
            First Event Date
          </label>

          <input
            type="date"
            value={eventDate}
            onChange={(e) =>
              setEventDate(e.target.value)
            }
            required
            style={inputStyle}
          />

          <p style={helperTextStyle}>
            For now this creates the first
            required event date. We’ll add
            the additional dates to the
            event next.
          </p>
        </div>

        <div>
          <label style={labelStyle}>
            First Battle Time
          </label>

          <input
            type="time"
            value={eventTime}
            onChange={(e) =>
              setEventTime(e.target.value)
            }
            required
            style={inputStyle}
          />

          <p style={helperTextStyle}>
            This is when the first battle
            of the night will begin.
          </p>
        </div>

        <div>
          <label style={labelStyle}>
            Minutes Between Battles
          </label>

          <input
            type="number"
            min="1"
            step="1"
            value={battleIntervalMinutes}
            onChange={(e) =>
              setBattleIntervalMinutes(
                e.target.value
              )
            }
            required
            style={inputStyle}
          />

          <p style={helperTextStyle}>
            Example: enter 5 for 7:00,
            7:05, 7:10, 7:15. Enter 10
            for 7:00, 7:10, 7:20, 7:30.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background:
                "rgba(255,60,60,0.08)",
              border:
                "1px solid rgba(255,80,80,0.25)",
              color: "#ffaaaa",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background:
                "rgba(60,180,90,0.08)",
              border:
                "1px solid rgba(80,210,110,0.25)",
              color: "#b8f5c2",
              fontSize: 13,
            }}
          >
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "14px 18px",
            border: "none",
            borderRadius: 12,
            background:
              "linear-gradient(135deg, #d3a33c, #9e6f22)",
            color: "#080503",
            fontWeight: 900,
            cursor: saving
              ? "not-allowed"
              : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving
            ? "Creating Event..."
            : "Create Event"}
        </button>
      </div>
    </form>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: 8,
  fontSize: 13,
  fontWeight: 800,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "14px 15px",
  borderRadius: 12,
  border:
    "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.45)",
  color: "white",
  fontSize: 15,
  outline: "none",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 120,
  resize: "vertical" as const,
  fontFamily: "inherit",
  lineHeight: 1.5,
};

const helperTextStyle = {
  margin: "7px 0 0",
  color: "rgba(255,255,255,0.4)",
  fontSize: 11,
};