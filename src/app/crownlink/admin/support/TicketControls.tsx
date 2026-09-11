"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTicket } from "./actions";

type TicketStatus = "open" | "in_progress" | "resolved";
type TicketPriority = "low" | "normal" | "high" | "urgent";

type Props = {
  ticketId: string;
  initialStatus: TicketStatus;
  initialPriority: TicketPriority;
  initialAdminNotes: string | null;
};

export default function TicketControls({
  ticketId,
  initialStatus,
  initialPriority,
  initialAdminNotes,
}: Props) {
  const router = useRouter();

  const [status, setStatus] =
    useState<TicketStatus>(initialStatus);

  const [priority, setPriority] =
    useState<TicketPriority>(initialPriority);

  const [adminNotes, setAdminNotes] = useState(
    initialAdminNotes ?? ""
  );

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function saveChanges() {
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const result = await updateTicket(ticketId, status, priority, adminNotes);
      setSuccess(`Changes saved. ${result.warning}`.trim());

      router.refresh();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong while saving the ticket.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: "1px solid rgba(201,151,50,0.09)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#c99732",
          fontSize: 8,
          fontWeight: 950,
          letterSpacing: 1.6,
          textTransform: "uppercase",
        }}
      >
        Ticket Management
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 12,
          marginTop: 12,
        }}
      >
        <label>
          <span style={labelStyle}>Status</span>

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as TicketStatus)
            }
            style={inputStyle}
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>

        <label>
          <span style={labelStyle}>Priority</span>

          <select
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as TicketPriority)
            }
            style={inputStyle}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
      </div>

      <label
        style={{
          display: "block",
          marginTop: 13,
        }}
      >
        <span style={labelStyle}>Private Admin Notes</span>

        <textarea
          value={adminNotes}
          onChange={(event) =>
            setAdminNotes(event.target.value)
          }
          placeholder="Add notes about the issue, troubleshooting, follow-up, or resolution..."
          rows={4}
          maxLength={4000}
          style={{
            ...inputStyle,
            minHeight: 105,
            resize: "vertical",
            lineHeight: 1.6,
          }}
        />
      </label>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 11,
            border: "1px solid rgba(239,68,68,0.2)",
            background: "rgba(239,68,68,0.07)",
            color: "#fca5a5",
            fontSize: 10,
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 11,
            border: "1px solid rgba(34,197,94,0.2)",
            background: "rgba(34,197,94,0.07)",
            color: "#86efac",
            fontSize: 10,
          }}
        >
          {success}
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          onClick={saveChanges}
          disabled={saving}
          style={{
            padding: "10px 15px",
            borderRadius: 999,
            border: "1px solid rgba(232,111,0,0.35)",
            background: saving
              ? "rgba(232,111,0,0.06)"
              : "linear-gradient(180deg, rgba(232,111,0,0.15), rgba(76,18,0,0.20))",
            color: saving ? "#9f7655" : "#e98322",
            fontSize: 9,
            fontWeight: 950,
            letterSpacing: 0.7,
            textTransform: "uppercase",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: 7,
  color: "rgba(247,241,232,0.38)",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: 1.2,
  textTransform: "uppercase" as const,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "11px 12px",
  borderRadius: 12,
  border: "1px solid rgba(201,151,50,0.13)",
  background: "rgba(0,0,0,0.34)",
  color: "#f9f4ed",
  outline: "none",
  fontSize: 11,
};