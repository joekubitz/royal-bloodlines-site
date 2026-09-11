"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/supabase/client";

import { replyToTicket } from "./actions";

type Message = {
  id: string;
  ticket_id: string;
  sender_user_id: string;
  sender_type: "creator" | "support";
  message: string;
  created_at: string;
  read_by_creator: boolean;
  read_by_support: boolean;
};

type Props = {
  ticketId: string;
  ticketOwnerUserId: string;
};

export default function TicketConversation({
  ticketId,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [delivery, setDelivery] = useState("");

  useEffect(() => {
    loadConversation();
  }, [ticketId]);

  async function markCreatorMessagesRead() {
    const { data, error } = await supabase
      .from("crownlink_support_messages")
      .update({
        read_by_support: true,
      })
      .eq("ticket_id", ticketId)
      .eq("sender_type", "creator")
      .eq("read_by_support", false)
      .select("id");

    if (error) {
      console.error("Mark support read error:", error);
      return false;
    }

    return Boolean(data && data.length > 0);
  }

  async function loadConversation() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("User load error:", userError);
      }

      setCurrentUserId(user?.id ?? null);

      const markedAnyRead =
        await markCreatorMessagesRead();

      const { data, error: messageError } = await supabase
        .from("crownlink_support_messages")
        .select(
          `
          id,
          ticket_id,
          sender_user_id,
          sender_type,
          message,
          created_at,
          read_by_creator,
          read_by_support
          `
        )
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (messageError) {
        console.error(
          "Conversation load error:",
          messageError
        );

        setError("Could not load this conversation.");
        return;
      }

      setMessages((data ?? []) as Message[]);

      if (markedAnyRead) {
        router.refresh();
      }
    } catch (err) {
      console.error(
        "Conversation load error:",
        err
      );

      setError("Could not load this conversation.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    const trimmedReply = reply.trim();

    if (!trimmedReply) {
      return;
    }

    setSending(true);
    setError("");

    try {
      setDelivery("");
      const result = await replyToTicket(ticketId, trimmedReply);
      setDelivery(`Reply saved. ${result.warning || "Creator notifications sent."}`);

      setReply("");

      await loadConversation();

      router.refresh();
    } catch (err) {
      console.error(
        "Send support reply error:",
        err
      );

      setError(
        err instanceof Error ? err.message : "Something went wrong while sending your message."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop:
          "1px solid rgba(201,151,50,0.09)",
      }}
    >
      {delivery && <p role="status" style={{ color: "#c99732", fontSize: 12 }}>{delivery}</p>}
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
        Conversation
      </p>

      <div
        style={{
          marginTop: 12,
          padding: 14,
          borderRadius: 15,
          background:
            "rgba(0,0,0,0.25)",
          border:
            "1px solid rgba(255,255,255,0.04)",
          maxHeight: 360,
          overflowY: "auto",
        }}
      >
        {loading ? (
          <p
            style={{
              margin: 0,
              color:
                "rgba(247,241,232,0.35)",
              fontSize: 10,
            }}
          >
            Loading conversation...
          </p>
        ) : messages.length === 0 ? (
          <p
            style={{
              margin: 0,
              color:
                "rgba(247,241,232,0.3)",
              fontSize: 10,
              lineHeight: 1.6,
            }}
          >
            No messages yet. Send the first reply to the creator.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {messages.map((message) => {
              const isSupportMessage =
                message.sender_type ===
                "support";

              const isCurrentUser =
                message.sender_user_id ===
                currentUserId;

              return (
                <div
                  key={message.id}
                  style={{
                    display: "flex",
                    justifyContent:
                      isSupportMessage
                        ? "flex-end"
                        : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "78%",
                      padding:
                        "10px 12px",
                      borderRadius: 14,
                      background:
                        isSupportMessage
                          ? "rgba(232,111,0,0.11)"
                          : "rgba(255,255,255,0.045)",
                      border:
                        isSupportMessage
                          ? "1px solid rgba(232,111,0,0.18)"
                          : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color:
                          isSupportMessage
                            ? "#e98322"
                            : "#d9b15c",
                        fontSize: 7,
                        fontWeight: 950,
                        letterSpacing: 1,
                        textTransform:
                          "uppercase",
                      }}
                    >
                      {isSupportMessage
                        ? isCurrentUser
                          ? "You"
                          : "Support"
                        : "Creator"}
                    </p>

                    <p
                      style={{
                        margin:
                          "5px 0 0",
                        color: "#f7f1e8",
                        fontSize: 11,
                        lineHeight: 1.6,
                        whiteSpace:
                          "pre-wrap",
                      }}
                    >
                      {message.message}
                    </p>

                    <p
                      style={{
                        margin:
                          "6px 0 0",
                        color:
                          "rgba(247,241,232,0.22)",
                        fontSize: 7,
                      }}
                    >
                      {new Date(
                        message.created_at
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 12,
        }}
      >
        <textarea
          value={reply}
          onChange={(event) =>
            setReply(event.target.value)
          }
          placeholder="Write a reply to the creator..."
          rows={4}
          maxLength={4000}
          style={{
            width: "100%",
            boxSizing: "border-box",
            minHeight: 105,
            resize: "vertical",
            padding: "11px 12px",
            borderRadius: 12,
            border:
              "1px solid rgba(201,151,50,0.13)",
            background:
              "rgba(0,0,0,0.34)",
            color: "#f9f4ed",
            outline: "none",
            fontSize: 11,
            lineHeight: 1.6,
          }}
        />

        {error && (
          <div
            style={{
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 11,
              border:
                "1px solid rgba(239,68,68,0.2)",
              background:
                "rgba(239,68,68,0.07)",
              color: "#fca5a5",
              fontSize: 10,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            marginTop: 10,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={sendMessage}
            disabled={
              sending || !reply.trim()
            }
            style={{
              padding: "10px 15px",
              borderRadius: 999,
              border:
                "1px solid rgba(232,111,0,0.35)",
              background:
                sending || !reply.trim()
                  ? "rgba(232,111,0,0.06)"
                  : "linear-gradient(180deg, rgba(232,111,0,0.15), rgba(76,18,0,0.20))",
              color:
                sending || !reply.trim()
                  ? "#9f7655"
                  : "#e98322",
              fontSize: 9,
              fontWeight: 950,
              letterSpacing: 0.7,
              textTransform:
                "uppercase",
              cursor:
                sending || !reply.trim()
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {sending
              ? "Sending..."
              : "Send Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}