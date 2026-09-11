"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EventOption = {
  id: string;
  name: string;
  event_date: string;
};

export default function EventBattleSelector({
  events,
  selectedEventId,
}: {
  events: EventOption[];
  selectedEventId: string;
}) {
  const router = useRouter();
  const [changing, setChanging] = useState(false);

  function formatDate(dateString: string) {
    const date = new Date(`${dateString}T12:00:00`);

    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function handleChange(value: string) {
    setChanging(true);

    if (value === "all") {
      router.push("/bloodline-arena/admin/battles?eventId=all");
      return;
    }

    router.push(
      `/bloodline-arena/admin/battles?eventId=${encodeURIComponent(value)}`
    );
  }

  return (
    <section
      style={{
        marginBottom: 18,
        padding: 20,
        borderRadius: 18,
        border: "1px solid rgba(201,151,50,0.16)",
        background:
          "linear-gradient(145deg, rgba(17,13,13,0.96), rgba(4,4,4,0.98))",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#c99732",
          fontSize: 7,
          fontWeight: 950,
          letterSpacing: 1.8,
          textTransform: "uppercase",
        }}
      >
        Battle Event
      </p>

      <h2
        style={{
          margin: "6px 0 0",
          color: "#f9f4ed",
          fontSize: 20,
          fontWeight: 950,
        }}
      >
        Choose Event
      </h2>

      <p
        style={{
          margin: "7px 0 0",
          color: "rgba(247,241,232,0.36)",
          fontSize: 10,
          lineHeight: 1.6,
        }}
      >
        Select an event to only show its approved battles.
      </p>

      <div style={{ marginTop: 14 }}>
        <select
          value={selectedEventId}
          disabled={changing || events.length === 0}
          onChange={(event) => handleChange(event.target.value)}
          style={{
            width: "100%",
            minHeight: 44,
            padding: "0 13px",
            borderRadius: 11,
            border: "1px solid rgba(201,151,50,0.18)",
            background: "#0b0909",
            color: "#f9f4ed",
            fontSize: 11,
            fontWeight: 800,
            outline: "none",
            cursor:
              changing || events.length === 0
                ? "not-allowed"
                : "pointer",
            opacity: changing ? 0.65 : 1,
          }}
        >
          <option value="all">All Events</option>

          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name} — {formatDate(event.event_date)}
            </option>
          ))}
        </select>

        {changing && (
          <p
            style={{
              margin: "8px 0 0",
              color: "#d9b15c",
              fontSize: 8,
              fontWeight: 850,
            }}
          >
            Loading event battles...
          </p>
        )}
      </div>
    </section>
  );
}
