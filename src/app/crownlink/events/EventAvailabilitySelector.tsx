"use client";

import { useState } from "react";

type TimeSlot = {
  id: string;
  slot_time: string;
};

type EventAvailabilitySelectorProps = {
  eventId: string;
  timeSlots: TimeSlot[];
  initiallySelectedTimeSlotIds: string[];
  isSignedUp: boolean;
};

export default function EventAvailabilitySelector({
  eventId,
  timeSlots,
  initiallySelectedTimeSlotIds,
  isSignedUp,
}: EventAvailabilitySelectorProps) {
  const [selectedTimeSlotId, setSelectedTimeSlotId] =
    useState<string | null>(
      initiallySelectedTimeSlotIds[0] ?? null
    );

  const [loadingTimeSlotId, setLoadingTimeSlotId] =
    useState<string | null>(null);

  const [error, setError] = useState("");

  function formatTime(timeString: string) {
    const [hourString, minuteString] =
      timeString.split(":");

    let hour = Number(hourString);
    const minute = minuteString || "00";

    const suffix = hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;

    return `${hour}:${minute} ${suffix}`;
  }

  async function selectTimeSlot(timeSlotId: string) {
    if (!isSignedUp) {
      setError(
        "Sign up for the event before selecting your battle time."
      );
      return;
    }

    if (selectedTimeSlotId === timeSlotId) {
      return;
    }

    setLoadingTimeSlotId(timeSlotId);
    setError("");

    try {
      /*
       * If another time is already selected,
       * remove it first.
       */
      if (selectedTimeSlotId) {
        const removeResponse = await fetch(
          "/api/crownlink/events/availability",
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              eventId,
              timeSlotId: selectedTimeSlotId,
            }),
          }
        );

        const removeData =
          await removeResponse.json();

        if (!removeResponse.ok) {
          setError(
            removeData.error ||
              "Unable to change battle time."
          );
          return;
        }
      }

      /*
       * Save the newly selected time.
       */
      const response = await fetch(
        "/api/crownlink/events/availability",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventId,
            timeSlotId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to save battle time."
        );
        return;
      }

      setSelectedTimeSlotId(timeSlotId);
    } catch (error) {
      console.error(
        "UPDATE EVENT AVAILABILITY ERROR:",
        error
      );

      setError(
        "Unable to update battle time."
      );
    } finally {
      setLoadingTimeSlotId(null);
    }
  }

  if (timeSlots.length === 0) {
    return (
      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 14,
          border:
            "1px solid rgba(255,255,255,0.07)",
          background:
            "rgba(255,255,255,0.025)",
        }}
      >
        <p
          style={{
            margin: 0,
            color:
              "rgba(255,255,255,0.45)",
            fontSize: 13,
          }}
        >
          Battle times have not been posted yet.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 18,
        padding: 16,
        borderRadius: 14,
        background:
          "rgba(211,163,60,0.04)",
        border:
          "1px solid rgba(211,163,60,0.15)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#d3a33c",
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: 1.5,
          textTransform: "uppercase",
        }}
      >
        Select Your Battle Time
      </p>

      <p
        style={{
          margin: "7px 0 0",
          color:
            "rgba(255,255,255,0.55)",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        Choose the one time you want to battle.
        Selecting another time will replace your
        current selection.
      </p>

      {!isSignedUp && (
        <p
          style={{
            margin: "10px 0 0",
            color: "#ffcc8a",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Sign up for this event before selecting
          a battle time.
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginTop: 14,
        }}
      >
        {timeSlots.map((timeSlot) => {
          const selected =
            selectedTimeSlotId ===
            timeSlot.id;

          const loading =
            loadingTimeSlotId ===
            timeSlot.id;

          return (
            <button
              key={timeSlot.id}
              type="button"
              onClick={() =>
                selectTimeSlot(
                  timeSlot.id
                )
              }
              disabled={
                loadingTimeSlotId !== null ||
                !isSignedUp
              }
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: selected
                  ? "1px solid rgba(211,163,60,0.75)"
                  : "1px solid rgba(255,255,255,0.1)",
                background: selected
                  ? "rgba(211,163,60,0.18)"
                  : "rgba(255,255,255,0.035)",
                color: selected
                  ? "#f2c75c"
                  : "rgba(255,255,255,0.68)",
                fontSize: 13,
                fontWeight: 800,
                cursor: isSignedUp
                  ? "pointer"
                  : "not-allowed",
                opacity:
                  loadingTimeSlotId !== null &&
                  !loading
                    ? 0.55
                    : 1,
              }}
            >
              {loading
                ? "Saving..."
                : `${selected ? "✓ " : ""}${formatTime(
                    timeSlot.slot_time
                  )}`}
            </button>
          );
        })}
      </div>

      {selectedTimeSlotId && (
        <p
          style={{
            margin: "12px 0 0",
            color: "#b8f5c2",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          ✓ Battle time selected
        </p>
      )}

      {error && (
        <p
          style={{
            margin: "12px 0 0",
            color: "#ffaaaa",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}