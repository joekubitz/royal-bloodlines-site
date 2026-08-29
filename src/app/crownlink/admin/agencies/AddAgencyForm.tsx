"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/supabase/client";

export default function AddAgencyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const cleanName = name.trim();

    if (!cleanName) {
      setError("Enter an agency name.");
      return;
    }

    setSaving(true);
    setError("");

    const supabase = createClient();

    const { error } = await supabase
      .from("crownlink_agencies")
      .insert({
        name: cleanName,
        status: "active",
      });

    if (error) {
      if (
        error.message.toLowerCase().includes("duplicate") ||
        error.message.toLowerCase().includes("unique")
      ) {
        setError("That agency already exists.");
      } else {
        setError(error.message);
      }

      setSaving(false);
      return;
    }

    setName("");
    setSaving(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginBottom: 28,
        padding: 20,
        borderRadius: 16,
        border: "1px solid rgba(211,163,60,0.2)",
        background: "rgba(20,10,10,0.75)",
      }}
    >
      <h2
        style={{
          margin: "0 0 6px",
          fontSize: 20,
          fontWeight: 900,
        }}
      >
        Add Agency
      </h2>

      <p
        style={{
          margin: "0 0 16px",
          color: "rgba(255,255,255,0.45)",
          fontSize: 13,
        }}
      >
        Add another approved agency to Crown Link.
      </p>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Agency name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            flex: "1 1 280px",
            padding: "13px 14px",
            borderRadius: 11,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.45)",
            color: "white",
            outline: "none",
          }}
        />

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "13px 18px",
            borderRadius: 11,
            border: "none",
            background: "#d3a33c",
            color: "#080503",
            fontWeight: 900,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Adding..." : "+ Add Agency"}
        </button>
      </div>

      {error && (
        <p
          style={{
            color: "#ffaaaa",
            fontSize: 13,
            marginTop: 12,
            marginBottom: 0,
          }}
        >
          {error}
        </p>
      )}
    </form>
  );
}