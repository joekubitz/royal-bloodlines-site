"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/supabase/client";

type Props = {
  eventId: string;
  initiallySignedUp: boolean;
};

type SignupStatus =
  | "signed_up"
  | "cancelled"
  | "removed"
  | null;

export default function EventSignupButton({
  eventId,
  initiallySignedUp,
}: Props) {
  const router = useRouter();

  const [signupStatus, setSignupStatus] =
    useState<SignupStatus>(
      initiallySignedUp ? "signed_up" : null
    );

  const [matched, setMatched] = useState(false);
  const [checkingStatus, setCheckingStatus] =
    useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStatus() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCheckingStatus(false);
        return;
      }

      const {
        data: signup,
        error: signupError,
      } = await supabase
        .from("crownlink_event_signups")
        .select("status")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (signupError) {
        console.error(
          "Signup status check error:",
          signupError
        );
      } else if (signup) {
        setSignupStatus(
          signup.status as SignupStatus
        );
      } else {
        setSignupStatus(null);
      }

      const {
        data: approvedMatch,
        error: matchError,
      } = await supabase
        .from("crownlink_matches")
        .select("id")
        .eq("event_id", eventId)
        .eq("status", "approved")
        .or(
          `creator_one_id.eq.${user.id},creator_two_id.eq.${user.id}`
        )
        .maybeSingle();

      if (matchError) {
        console.error(
          "Match check error:",
          matchError
        );
      }

      setMatched(Boolean(approvedMatch));
      setCheckingStatus(false);
    }

    loadStatus();
  }, [eventId]);

  async function handleClick() {
    if (
      matched ||
      signupStatus === "removed"
    ) {
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

    const {
      data: currentSignup,
      error: currentSignupError,
    } = await supabase
      .from("crownlink_event_signups")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (currentSignupError) {
      setError(currentSignupError.message);
      setLoading(false);
      return;
    }

    if (currentSignup?.status === "removed") {
      setSignupStatus("removed");

      setError(
        "You were removed from this event by an admin and cannot rejoin unless an admin restores your signup."
      );

      setLoading(false);
      return;
    }

    if (currentSignup?.status === "signed_up") {
      const {
        data: approvedMatch,
        error: matchError,
      } = await supabase
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

      const { error: cancelError } =
        await supabase
          .from("crownlink_event_signups")
          .update({
            status: "cancelled",
          })
          .eq("id", currentSignup.id);

      if (cancelError) {
        setError(cancelError.message);
        setLoading(false);
        return;
      }

      setSignupStatus("cancelled");
      setLoading(false);

      router.refresh();
      return;
    }

    if (currentSignup?.status === "cancelled") {
      const { error: updateError } =
        await supabase
          .from("crownlink_event_signups")
          .update({
            status: "signed_up",
          })
          .eq("id", currentSignup.id)
          .eq("status", "cancelled");

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSignupStatus("signed_up");
      setLoading(false);

      router.refresh();
      return;
    }

    const { error: insertError } =
      await supabase
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

    setSignupStatus("signed_up");
    setLoading(false);

    router.refresh();
  }

  const signedUp =
    signupStatus === "signed_up";

  const removed =
    signupStatus === "removed";

  const isDisabled =
    loading ||
    checkingStatus ||
    matched ||
    removed;

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
          border:
            matched || removed
              ? "1px solid rgba(211,163,60,0.28)"
              : signedUp
              ? "1px solid rgba(255,255,255,0.15)"
              : "none",
          background:
            matched || removed
              ? "rgba(211,163,60,0.08)"
              : signedUp
              ? "rgba(255,255,255,0.05)"
              : "linear-gradient(135deg, #d3a33c, #9e6f22)",
          color:
            matched || removed
              ? "#d3a33c"
              : signedUp
              ? "white"
              : "#080503",
          fontWeight: 900,
          cursor: isDisabled
            ? "not-allowed"
            : "pointer",
          opacity:
            loading || checkingStatus
              ? 0.6
              : 1,
        }}
      >
        {checkingStatus
          ? "Checking..."
          : loading
          ? "Saving..."
          : removed
          ? "🔒 Removed from Event"
          : matched
          ? "🔒 Matched — Signup Locked"
          : signedUp
          ? "Cancel Signup"
          : "Sign Up"}
      </button>

      {removed ? (
        <span
          style={{
            marginLeft: 12,
            color: "#ffb3b3",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Admin approval required to rejoin
        </span>
      ) : matched ? (
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