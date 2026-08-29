"use client";

import { FormEvent, useState } from "react";

export default function AddEventForm() {
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/crownlink/admin/events",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            eventDate,
            eventTime,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error || "Could not create event."
        );
        setSaving(false);
        return;
      }

      setSuccess("Event created successfully.");

      setName("");
      setEventDate("");
      setEventTime("");
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
        background: "rgba(20,10,10,0.78)",
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
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            Event Name
          </label>

          <input
            type="text"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            placeholder="Friday Night Battles"
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            Event Date
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
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            Event Time
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

          <p
            style={{
              margin: "7px 0 0",
              color: "rgba(255,255,255,0.4)",
              fontSize: 11,
            }}
          >
            We’ll add timezone handling after the basic
            event system is working.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background: "rgba(255,60,60,0.08)",
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