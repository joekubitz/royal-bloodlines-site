"use client";

import { useState } from "react";
import { createClient } from "@/app/supabase/client";

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);

    const supabase = createClient();

    await supabase.auth.signOut();

    window.location.href = "/crownlink/login";
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      style={{
        padding: "12px 18px",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        color: "white",
        fontWeight: 800,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? "Signing Out..." : "Sign Out"}
    </button>
  );
}