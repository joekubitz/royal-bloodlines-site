"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type AddTimeSlotFormProps = {
  eventId: string;
};

export default function AddTimeSlotForm({
  eventId,
}: AddTimeSlotFormProps) {
  const router = useRouter();

  const [slotTime, setSlotTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/crownlink/admin/events/time-slots",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventId,
            slotTime,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Unable to add time slot."
        );
        return;
      }

      setSlotTime("");
      setMessage("Time slot added.");

      router.refresh();
    } catch (error) {
      console.error(
        "ADD TIME SLOT ERROR:",
        error
      );

      setError("Unable to add time slot.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginTop: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          type="time"
          value={slotTime}
          onChange={(event) =>
            setSlotTime(event.target.value)
          }
          required
          style={{
            padding: "11px 13px",
            borderRadius: 10,
            border:
              "1px solid rgba(211,163,60,0.25)",
            background: "rgba(0,0,0,0.3)",
            color: "white",
            fontSize: 14,
            outline: "none",
          }}
        />

        <button
          type="submit"
          disabled={loading || !slotTime}
          style={{
            padding: "11px 16px",
            borderRadius: 10,
            border: "none",
            background:
              "linear-gradient(135deg, #d3a33c, #9e6f22)",
            color: "#080503",
            fontWeight: 900,
            cursor:
              loading || !slotTime
                ? "not-allowed"
                : "pointer",
            opacity:
              loading || !slotTime ? 0.6 : 1,
          }}
        >
          {loading ? "Adding..." : "+ Add Time Slot"}
        </button>
      </div>

      {message && (
        <p
          style={{
            margin: "8px 0 0",
            color: "#b8f5c2",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {message}
        </p>
      )}

      {error && (
        <p
          style={{
            margin: "8px 0 0",
            color: "#ffaaaa",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {error}
        </p>
      )}
    </form>
  );
}