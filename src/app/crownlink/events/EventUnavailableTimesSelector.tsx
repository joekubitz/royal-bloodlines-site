"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EventDate = {
  id: string;
  event_date: string;
};

type ScheduleSlot = {
  id: string;
  event_date_id: string;
  slot_time: string;
};

type UnavailableTime = {
  id: string;
  event_date_id: string;
  blocked_time: string;
};

type EventUnavailableTimesSelectorProps = {
  eventId: string;
  isSignedUp: boolean;
  requiredDates: EventDate[];
  scheduleSlots: ScheduleSlot[];
  unavailableTimes: UnavailableTime[];
};

function formatDate(dateString: string) {
  const date = new Date(
    `${dateString}T12:00:00`
  );

  return date.toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );
}

function formatTime(timeString: string) {
  const [hourString, minuteString] =
    timeString.split(":");

  let hour = Number(hourString);
  const minute = minuteString || "00";

  const suffix =
    hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${minute} ${suffix}`;
}

export default function EventUnavailableTimesSelector({
  eventId,
  isSignedUp,
  requiredDates,
  scheduleSlots,
  unavailableTimes,
}: EventUnavailableTimesSelectorProps) {
  const router = useRouter();

  const [savingKey, setSavingKey] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  async function markUnavailable(
    eventDateId: string,
    blockedTime: string
  ) {
    const key = `${eventDateId}-${blockedTime}`;

    setSavingKey(key);
    setError("");

    try {
      const response = await fetch(
        "/api/crownlink/events/unavailable-times",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            eventId,
            eventDateId,
            blockedTime,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Could not mark that time unavailable."
        );
        return;
      }

      router.refresh();
    } catch {
      setError("Unexpected error.");
    } finally {
      setSavingKey(null);
    }
  }

  async function removeUnavailable(
    unavailableTimeId: string,
    key: string
  ) {
    setSavingKey(key);
    setError("");

    try {
      const response = await fetch(
        "/api/crownlink/events/unavailable-times",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            unavailableTimeId,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Could not remove unavailable time."
        );
        return;
      }

      router.refresh();
    } catch {
      setError("Unexpected error.");
    } finally {
      setSavingKey(null);
    }
  }

  if (!isSignedUp) {
    return (
      <div
        style={{
          marginTop: 18,
          padding: 16,
          borderRadius: 14,
          border:
            "1px solid rgba(255,255,255,0.08)",
          background:
            "rgba(255,255,255,0.025)",
          color:
            "rgba(255,255,255,0.45)",
          fontSize: 13,
        }}
      >
        Sign up for this event before
        marking times you cannot battle.
      </div>
    );
  }

  if (requiredDates.length === 0) {
    return (
      <div
        style={{
          marginTop: 18,
          color:
            "rgba(255,255,255,0.45)",
          fontSize: 13,
        }}
      >
        Required event dates have not
        been added yet.
      </div>
    );
  }

  if (scheduleSlots.length === 0) {
    return (
      <div
        style={{
          marginTop: 18,
          padding: 16,
          borderRadius: 14,
          border:
            "1px solid rgba(211,163,60,0.16)",
          background:
            "rgba(211,163,60,0.035)",
          color:
            "rgba(255,255,255,0.5)",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        Battle times have not been
        generated for this event yet.
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 22,
      }}
    >
      <h4
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 900,
        }}
      >
        Times You Cannot Battle
      </h4>

      <p
        style={{
          margin: "7px 0 0",
          color:
            "rgba(255,255,255,0.48)",
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        You are expected to battle once
        on every required date. Select
        only the specific generated
        battle times you cannot make.
      </p>

      {error && (
        <p
          style={{
            margin: "12px 0 0",
            color: "#ffaaaa",
            fontSize: 12,
          }}
        >
          {error}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gap: 18,
          marginTop: 18,
        }}
      >
        {requiredDates.map(
          (requiredDate) => {
            const dateScheduleSlots =
              scheduleSlots.filter(
                (slot) =>
                  slot.event_date_id ===
                  requiredDate.id
              );

            const dateUnavailableTimes =
              unavailableTimes.filter(
                (item) =>
                  item.event_date_id ===
                  requiredDate.id
              );

            return (
              <div
                key={requiredDate.id}
                style={{
                  padding: 18,
                  borderRadius: 16,
                  border:
                    "1px solid rgba(211,163,60,0.16)",
                  background:
                    "rgba(0,0,0,0.18)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#d3a33c",
                    fontWeight: 900,
                    fontSize: 14,
                  }}
                >
                  {formatDate(
                    requiredDate.event_date
                  )}
                </p>

                {dateScheduleSlots.length ===
                0 ? (
                  <p
                    style={{
                      margin:
                        "12px 0 0",
                      color:
                        "rgba(255,255,255,0.38)",
                      fontSize: 12,
                    }}
                  >
                    No battle times have
                    been generated for
                    this date yet.
                  </p>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 14,
                      }}
                    >
                      {dateScheduleSlots.map(
                        (slot) => {
                          const unavailable =
                            dateUnavailableTimes.find(
                              (item) =>
                                item.blocked_time.startsWith(
                                  slot.slot_time.slice(
                                    0,
                                    5
                                  )
                                )
                            );

                          const key = `${requiredDate.id}-${slot.slot_time}`;

                          const isSaving =
                            savingKey === key;

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={
                                isSaving
                              }
                              onClick={() => {
                                if (
                                  unavailable
                                ) {
                                  removeUnavailable(
                                    unavailable.id,
                                    key
                                  );
                                } else {
                                  markUnavailable(
                                    requiredDate.id,
                                    slot.slot_time
                                  );
                                }
                              }}
                              style={{
                                padding:
                                  "9px 12px",
                                borderRadius:
                                  999,
                                border:
                                  unavailable
                                    ? "1px solid rgba(255,100,100,0.35)"
                                    : "1px solid rgba(255,255,255,0.1)",
                                background:
                                  unavailable
                                    ? "rgba(255,80,80,0.1)"
                                    : "rgba(255,255,255,0.035)",
                                color:
                                  unavailable
                                    ? "#ffaaaa"
                                    : "rgba(255,255,255,0.75)",
                                fontSize: 12,
                                fontWeight: 800,
                                cursor:
                                  isSaving
                                    ? "not-allowed"
                                    : "pointer",
                                opacity:
                                  isSaving
                                    ? 0.5
                                    : 1,
                              }}
                            >
                              {isSaving
                                ? "..."
                                : formatTime(
                                    slot.slot_time
                                  )}
                            </button>
                          );
                        }
                      )}
                    </div>

                    <p
                      style={{
                        margin:
                          "12px 0 0",
                        color:
                          "rgba(255,255,255,0.35)",
                        fontSize: 11,
                      }}
                    >
                      Red times are marked
                      unavailable.
                    </p>
                  </>
                )}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}