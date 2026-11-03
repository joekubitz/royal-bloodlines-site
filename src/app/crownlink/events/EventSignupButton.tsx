
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

  const [matched, setMatched] =
    useState(false);

  const [registrationClosed, setRegistrationClosed] =
    useState(false);

  const [checkingStatus, setCheckingStatus] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      setCheckingStatus(true);
      setError("");

      const supabase = createClient();

      // Check event registration status
      const {
        data: event,
        error: eventError,
      } = await supabase
        .from("crownlink_events")
        .select("registration_closed")
        .eq("id", eventId)
        .maybeSingle();

      if (cancelled) return;

      if (eventError || !event) {
        console.error(
          "Event registration check error:",
          eventError
        );

        setError(
          "Unable to verify event registration status."
        );
        setCheckingStatus(false);
        return;
      }

      setRegistrationClosed(
        event.registration_closed === true
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setCheckingStatus(false);
        return;
      }

      // Check creator signup
      const {
        data: signup,
        error: signupError,
      } = await supabase
        .from("crownlink_event_signups")
        .select("status")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (signupError) {
        console.error(
          "Signup status check error:",
          signupError
        );

        setError(
          "Unable to verify your signup status."
        );
        setCheckingStatus(false);
        return;
      }

      setSignupStatus(
        signup
          ? (signup.status as SignupStatus)
          : null
      );

      // Check approved matches
      // Limit to one because creators may have
      // multiple approved battles.
      const {
        data: approvedMatches,
        error: matchError,
      } = await supabase
        .from("crownlink_matches")
        .select("id")
        .eq("event_id", eventId)
        .eq("status", "approved")
        .or(
          `creator_one_id.eq.${user.id},creator_two_id.eq.${user.id}`
        )
        .limit(1);

      if (cancelled) return;

      if (matchError) {
        console.error(
          "Match check error:",
          matchError
        );

        setError(
          "Unable to verify your battle status."
        );
        setCheckingStatus(false);
        return;
      }

      setMatched(
        (approvedMatches?.length ?? 0) > 0
      );

      setCheckingStatus(false);
    }

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  async function handleClick() {
    if (
      loading ||
      checkingStatus ||
      registrationClosed ||
      matched ||
      signupStatus === "removed" ||
      error
    ) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/crownlink/events/signup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (result.status === "removed") {
          setSignupStatus("removed");
        }

        if (
          result.registrationClosed === true ||
          result.status === "registration_closed"
        ) {
          setRegistrationClosed(true);
        }

        if (result.matched) {
          setMatched(true);
        }

        setError(
          result.error ||
            "Could not update your signup."
        );

        return;
      }

      if (result.status === "signed_up") {
        setSignupStatus("signed_up");
      } else if (
        result.status === "cancelled"
      ) {
        setSignupStatus("cancelled");
      }

      router.refresh();
    } catch (error) {
      console.error(
        "Event signup error:",
        error
      );

      setError(
        "Unexpected error. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const signedUp =
    signupStatus === "signed_up";

  const removed =
    signupStatus === "removed";

  const isDisabled =
    loading ||
    checkingStatus ||
    registrationClosed ||
    matched ||
    removed ||
    Boolean(error);

  const isLocked =
    registrationClosed ||
    matched ||
    removed;

  let buttonText = "Sign Up";

  if (checkingStatus) {
    buttonText = "Checking...";
  } else if (loading) {
    buttonText = "Saving...";
  } else if (removed) {
    buttonText = "🔒 Removed from Event";
  } else if (registrationClosed) {
    buttonText = "🔒 Registration Closed";
  } else if (matched) {
    buttonText = "🔒 Matched — Signup Locked";
  } else if (signedUp) {
    buttonText = "Cancel Signup";
  }

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
          border: isLocked
            ? "1px solid rgba(211,163,60,0.28)"
            : signedUp
            ? "1px solid rgba(255,255,255,0.15)"
            : "none",
          background: isLocked
            ? "rgba(211,163,60,0.08)"
            : signedUp
            ? "rgba(255,255,255,0.05)"
            : "linear-gradient(135deg, #d3a33c, #9e6f22)",
          color: isLocked
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
        {buttonText}
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
      ) : registrationClosed ? (
        <span
          style={{
            marginLeft: 12,
            color: signedUp
              ? "#b8f5c2"
              : "#d3a33c",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {signedUp
            ? "✓ You're registered. Matchmaking has been completed."
            : "Matchmaking has been completed. No additional signups are being accepted."}
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
          ✓ You're signed up
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
