"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  matchId: string;
  creatorOneName: string;
  creatorTwoName: string;
};

type CancelMode =
  | "keep_both"
  | "remove_creator_one"
  | "remove_creator_two"
  | "remove_both";

export default function CancelBattleButton({
  matchId,
  creatorOneName,
  creatorTwoName,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCancel(cancelMode: CancelMode) {
    let confirmationMessage =
      "Are you sure you want to cancel this battle?";

    if (cancelMode === "keep_both") {
      confirmationMessage =
        `Cancel this battle but keep ${creatorOneName} and ${creatorTwoName} signed up for the event?`;
    }

    if (cancelMode === "remove_creator_one") {
      confirmationMessage =
        `Cancel this battle and remove ${creatorOneName} from the event? ${creatorTwoName} will remain signed up.`;
    }

    if (cancelMode === "remove_creator_two") {
      confirmationMessage =
        `Cancel this battle and remove ${creatorTwoName} from the event? ${creatorOneName} will remain signed up.`;
    }

    if (cancelMode === "remove_both") {
      confirmationMessage =
        `Cancel this battle and remove both ${creatorOneName} and ${creatorTwoName} from the event?`;
    }

    const confirmed = window.confirm(confirmationMessage);

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/crownlink/admin/battles/cancel",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            matchId,
            cancelMode,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to cancel battle.");
        setLoading(false);
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("Something went wrong cancelling the battle.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 16,
      }}
    >
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setError("");
            setOpen(true);
          }}
          disabled={loading}
          style={{
            padding: "11px 16px",
            borderRadius: 11,
            border: "1px solid rgba(255,100,100,0.3)",
            background: "rgba(180,40,40,0.12)",
            color: "#ffaaaa",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Cancel Battle
        </button>
      ) : (
        <div
          style={{
            padding: 18,
            borderRadius: 14,
            border: "1px solid rgba(255,100,100,0.22)",
            background: "rgba(120,20,20,0.08)",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 900,
            }}
          >
            Cancel Battle
          </h3>

          <p
            style={{
              margin: "7px 0 16px",
              color: "rgba(255,255,255,0.5)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            What should happen to the creators&apos; event signups?
          </p>

          <div
            style={{
              display: "grid",
              gap: 9,
            }}
          >
            <button
              type="button"
              disabled={loading}
              onClick={() => handleCancel("keep_both")}
              style={optionButtonStyle}
            >
              <strong>Keep Both Signed Up</strong>
              <span style={optionTextStyle}>
                Both creators can be matched again.
              </span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                handleCancel("remove_creator_one")
              }
              style={optionButtonStyle}
            >
              <strong>Remove {creatorOneName}</strong>
              <span style={optionTextStyle}>
                {creatorTwoName} stays signed up.
              </span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                handleCancel("remove_creator_two")
              }
              style={optionButtonStyle}
            >
              <strong>Remove {creatorTwoName}</strong>
              <span style={optionTextStyle}>
                {creatorOneName} stays signed up.
              </span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleCancel("remove_both")}
              style={{
                ...optionButtonStyle,
                border: "1px solid rgba(255,100,100,0.25)",
                color: "#ffaaaa",
              }}
            >
              <strong>Remove Both Creators</strong>
              <span style={optionTextStyle}>
                Neither creator stays in this event.
              </span>
            </button>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setOpen(false);
              setError("");
            }}
            style={{
              marginTop: 12,
              padding: 0,
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.45)",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Never mind
          </button>

          {loading && (
            <p
              style={{
                margin: "12px 0 0",
                color: "#d3a33c",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Cancelling battle...
            </p>
          )}

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
        </div>
      )}
    </div>
  );
}

const optionButtonStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  cursor: "pointer",
  textAlign: "left" as const,
  display: "flex",
  flexDirection: "column" as const,
  gap: 4,
};

const optionTextStyle = {
  color: "rgba(255,255,255,0.45)",
  fontSize: 11,
  fontWeight: 500,
};