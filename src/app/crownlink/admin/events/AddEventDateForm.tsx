"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type AddEventDateFormProps = {
  eventId: string;
};

export default function AddEventDateForm({
  eventId,
}: AddEventDateFormProps) {
  const router = useRouter();

  const [eventDate, setEventDate] =
    useState("");
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");

  async function handleSubmit(
    e: FormEvent
  ) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/crownlink/admin/events/dates",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            eventId,
            eventDate,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Could not add event date."
        );
        return;
      }

      setSuccess(
        "Required date added."
      );

      setEventDate("");

      router.refresh();
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
        marginTop: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            flex: "1 1 220px",
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: 7,
              fontSize: 12,
              fontWeight: 800,
              color:
                "rgba(255,255,255,0.7)",
            }}
          >
            Add Required Date
          </label>

          <input
            type="date"
            value={eventDate}
            onChange={(e) =>
              setEventDate(
                e.target.value
              )
            }
            required
            style={{
              width: "100%",
              boxSizing:
                "border-box",
              padding: "12px 13px",
              borderRadius: 11,
              border:
                "1px solid rgba(255,255,255,0.12)",
              background:
                "rgba(0,0,0,0.4)",
              color: "white",
              outline: "none",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "12px 16px",
            borderRadius: 11,
            border: "none",
            background:
              "linear-gradient(135deg, #d3a33c, #9e6f22)",
            color: "#080503",
            fontWeight: 900,
            cursor: saving
              ? "not-allowed"
              : "pointer",
            opacity: saving
              ? 0.6
              : 1,
          }}
        >
          {saving
            ? "Adding..."
            : "Add Date"}
        </button>
      </div>

      {error && (
        <p
          style={{
            margin: "10px 0 0",
            color: "#ffaaaa",
            fontSize: 12,
          }}
        >
          {error}
        </p>
      )}

      {success && (
        <p
          style={{
            margin: "10px 0 0",
            color: "#b8f5c2",
            fontSize: 12,
          }}
        >
          {success}
        </p>
      )}
    </form>
  );
}