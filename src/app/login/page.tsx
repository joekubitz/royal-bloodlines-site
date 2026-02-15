"use client";

import { useState } from "react";
import { createClient } from "../supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "40px", maxWidth: "400px", margin: "80px auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Royal Bloodlines Admin Login</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: "12px", marginTop: "12px" }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: "12px", marginTop: "12px" }}
      />

      <button
        onClick={signIn}
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px",
          marginTop: "18px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontWeight: 800,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>

      {error && <p style={{ color: "red", marginTop: 12 }}>{error}</p>}
    </main>
  );
}
