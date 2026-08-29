"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/supabase/client";

type Props = {
  eventId: string;
  initiallySignedUp: boolean;
};

export default function EventSignupButton({
  eventId,
  initiallySignedUp,
}: Props) {
  const [signedUp, setSignedUp] = useState(initiallySignedUp);
  const [matched, setMatched] = useState(false);
  const [checkingMatch, setCheckingMatch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkApprovedMatch() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCheckingMatch(false);
        return;
      }

      const { data: approvedMatch, error: matchError } = await supabase
        .from("crownlink_matches")
        .select("id")
        .eq("event_id", eventId)
        .eq("status", "approved")
        .or(
          `creator_one_id.eq.${user.id},creator_two_id.eq.${user.id}`
        )
        .maybeSingle();

      if (matchError) {
        console.error("Match check error:", matchError);
      }

      setMatched(Boolean(approvedMatch));
      setCheckingMatch(false);
    }

    checkApprovedMatch();
  }, [eventId]);

  async function handleClick() {
    if (matched) {
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/crownlink/login";
      return;
    }

    if (signedUp) {
      // Re-check immediately before cancelling.
      // This prevents cancellation if the match was approved
      // after the page originally loaded.
      const { data: approvedMatch, error: matchError } = await supabase
        .from("crownlink_matches")
        .select("id")
        .eq("event_id", eventId)
        .eq("status", "approved")
        .or(
          `creator_one_id.eq.${user.id},creator_two_id.eq.${user.id}`
        )
        .maybeSingle();

      if (matchError) {
        setError(matchError.message);
        setLoading(false);
        return;
      }

      if (approvedMatch) {
        setMatched(true);
        setError(
          "Your signup is locked because your battle has already been approved."
        );
        setLoading(false);
        return;
      }

      const { error: cancelError } = await supabase
        .from("crownlink_event_signups")
        .update({
          status: "cancelled",
        })
        .eq("event_id", eventId)
        .eq("user_id", user.id);

      if (cancelError) {
        setError(cancelError.message);
        setLoading(false);
        return;
      }

      setSignedUp(false);
      setLoading(false);
      return;
    }

    const { data: existingSignup } = await supabase
      .from("crownlink_event_signups")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingSignup) {
      const { error: updateError } = await supabase
        .from("crownlink_event_signups")
        .update({
          status: "signed_up",
        })
        .eq("id", existingSignup.id);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("crownlink_event_signups")
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: "signed_up",
        });

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }
    }

    setSignedUp(true);
    setLoading(false);
  }

  const isDisabled = loading || checkingMatch || matched;

  return (
    <div
      style={{
        marginTop: 18,
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        style={{
          padding: "12px 18px",
          borderRadius: 12,
          border: matched
            ? "1px solid rgba(211,163,60,0.28)"
            : signedUp
            ? "1px solid rgba(255,255,255,0.15)"
            : "none",
          background: matched
            ? "rgba(211,163,60,0.08)"
            : signedUp
            ? "rgba(255,255,255,0.05)"
            : "linear-gradient(135deg, #d3a33c, #9e6f22)",
          color: matched
            ? "#d3a33c"
            : signedUp
            ? "white"
            : "#080503",
          fontWeight: 900,
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: loading || checkingMatch ? 0.6 : 1,
        }}
      >
        {checkingMatch
          ? "Checking..."
          : loading
          ? "Saving..."
          : matched
          ? "🔒 Matched — Signup Locked"
          : signedUp
          ? "Cancel Signup"
          : "Sign Up"}
      </button>

      {matched ? (
        <span
          style={{
            marginLeft: 12,
            color: "#b8f5c2",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          ✓ Battle approved
        </span>
      ) : signedUp ? (
        <span
          style={{
            marginLeft: 12,
            color: "#b8f5c2",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          ✓ You’re signed up
        </span>
      ) : null}

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
    </div>
  );
}