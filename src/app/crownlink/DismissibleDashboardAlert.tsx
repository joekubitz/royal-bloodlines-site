"use client";

import {
  ReactNode,
  useEffect,
  useState,
} from "react";

type Props = {
  dismissKey: string;
  ariaLabel?: string;
  children: ReactNode;
};

export default function DismissibleDashboardAlert({
  dismissKey,
  ariaLabel = "Close alert",
  children,
}: Props) {
  const [mounted, setMounted] =
    useState(false);

  const [dismissed, setDismissed] =
    useState(false);

  useEffect(() => {
    setMounted(true);

    try {
      const saved =
        sessionStorage.getItem(
          `bloodline-dashboard-dismissed:${dismissKey}`
        );

      setDismissed(saved === "1");
    } catch {
      setDismissed(false);
    }
  }, [dismissKey]);

  function dismiss() {
    try {
      sessionStorage.setItem(
        `bloodline-dashboard-dismissed:${dismissKey}`,
        "1"
      );
    } catch {
      // If sessionStorage is unavailable,
      // still hide it for the current render.
    }

    setDismissed(true);
  }

  if (!mounted || dismissed) {
    return null;
  }

  return (
    <div
      style={{
        position: "relative",
      }}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label={ariaLabel}
        title="Close"
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          zIndex: 30,

          width: 32,
          height: 32,

          display: "flex",
          alignItems: "center",
          justifyContent: "center",

          borderRadius: 999,

          border:
            "1px solid rgba(255,255,255,0.13)",

          background:
            "rgba(0,0,0,0.48)",

          color:
            "rgba(247,241,232,0.72)",

          fontSize: 18,
          fontWeight: 700,
          lineHeight: 1,

          cursor: "pointer",

          boxShadow:
            "0 8px 22px rgba(0,0,0,0.28)",

          backdropFilter:
            "blur(8px)",
        }}
      >
        ×
      </button>

      {children}
    </div>
  );
}
