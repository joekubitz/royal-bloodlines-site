"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/supabase/client";

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

export default function CreatorTicketConversation({
  ticketId,
  ticketOwnerUserId,
}: Props) {
  const supabase = createClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadConversation();
  }, [ticketId]);

  async function markSupportMessagesRead() {
    const { error } = await supabase
      .from("crownlink_support_messages")
      .update({
        read_by_creator: true,
      })
      .eq("ticket_id", ticketId)
      .eq("sender_type", "support")
      .eq("read_by_creator", false);

    if (error) {
      console.error(
        "Mark support messages read error:",
        error
      );
    }
  }

  async function loadConversation() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("You are no longer signed in.");
        return;
      }

      if (user.id !== ticketOwnerUserId) {
        setError(
          "You do not have permission to view this support conversation."
        );
        return;
      }

      await markSupportMessagesRead();

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
        .order("created_at", {
          ascending: true,
        });

      if (messageError) {
        console.error(
          "Conversation load error:",
          messageError
        );

        setError(
          "Could not load this conversation."
        );

        return;
      }

      setMessages((data ?? []) as Message[]);
    } catch (err) {
      console.error(
        "Conversation load error:",
        err
      );

      setError(
        "Could not load this conversation."
      );
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
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(
          "You are no longer signed in."
        );

        return;
      }

      if (user.id !== ticketOwnerUserId) {
        setError(
          "You do not have permission to reply to this support request."
        );

        return;
      }

      const { error: insertError } =
        await supabase
          .from(
            "crownlink_support_messages"
          )
          .insert({
            ticket_id: ticketId,
            sender_user_id: user.id,
            sender_type: "creator",
            message: trimmedReply,
            read_by_creator: true,
            read_by_support: false,
          });

      if (insertError) {
        console.error(
          "Message insert error:",
          insertError
        );

        setError(
          "Your message could not be sent."
        );

        return;
      }

      setReply("");

      await loadConversation();
    } catch (err) {
      console.error(
        "Send message error:",
        err
      );

      setError(
        "Something went wrong while sending your message."
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
          background: "rgba(0,0,0,0.25)",
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
            No replies yet. Support will
            respond here when your request
            is reviewed.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {messages.map((message) => {
              const isCreator =
                message.sender_type ===
                "creator";

              return (
                <div
                  key={message.id}
                  style={{
                    display: "flex",
                    justifyContent:
                      isCreator
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
                        isCreator
                          ? "rgba(232,111,0,0.11)"
                          : "rgba(255,255,255,0.045)",
                      border:
                        isCreator
                          ? "1px solid rgba(232,111,0,0.18)"
                          : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color:
                          isCreator
                            ? "#e98322"
                            : "#d9b15c",
                        fontSize: 7,
                        fontWeight: 950,
                        letterSpacing: 1,
                        textTransform:
                          "uppercase",
                      }}
                    >
                      {isCreator
                        ? "You"
                        : "Support"}
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

      <textarea
        value={reply}
        onChange={(event) =>
          setReply(event.target.value)
        }
        placeholder="Reply to support..."
        rows={3}
        maxLength={4000}
        style={{
          width: "100%",
          boxSizing: "border-box",
          marginTop: 12,
          minHeight: 90,
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
            textTransform: "uppercase",
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
  );
}