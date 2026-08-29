"use client";

import { useState } from "react";

type AddCreatorFormProps = {
  agencies: string[];
};

export default function AddCreatorForm({
  agencies,
}: AddCreatorFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agencyName, setAgencyName] = useState(
    agencies[0] || ""
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/crownlink/admin/creators",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            agencyName,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error || "Could not create creator."
        );
        setSaving(false);
        return;
      }

      setSuccess(
        `Creator account created for ${email}.`
      );

      setEmail("");
      setPassword("");
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: 22,
        borderRadius: 16,
        border: "1px solid rgba(211,163,60,0.2)",
        background: "rgba(20,10,10,0.75)",
      }}
    >
      <h2
        style={{
          margin: "0 0 6px",
          fontSize: 21,
          fontWeight: 900,
        }}
      >
        Add Creator
      </h2>

      <p
        style={{
          margin: "0 0 20px",
          color: "rgba(255,255,255,0.45)",
          fontSize: 13,
        }}
      >
        Create Crown Link login access for an approved
        creator.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <div>
          <label style={labelStyle}>
            Creator Email
          </label>

          <input
            type="email"
            required
            placeholder="creator@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Temporary Password
          </label>

          <input
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Agency
          </label>

          <select
            required
            value={agencyName}
            onChange={(e) =>
              setAgencyName(e.target.value)
            }
            style={inputStyle}
          >
            {agencies.length === 0 ? (
              <option value="">
                No active agencies
              </option>
            ) : (
              agencies.map((agency) => (
                <option
                  key={agency}
                  value={agency}
                  style={{
                    background: "#160607",
                  }}
                >
                  {agency}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {success && (
        <div style={successStyle}>
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={saving || agencies.length === 0}
        style={{
          marginTop: 18,
          padding: "13px 18px",
          borderRadius: 11,
          border: "none",
          background: "#d3a33c",
          color: "#080503",
          fontWeight: 900,
          cursor:
            saving || agencies.length === 0
              ? "not-allowed"
              : "pointer",
          opacity:
            saving || agencies.length === 0
              ? 0.55
              : 1,
        }}
      >
        {saving
          ? "Creating Account..."
          : "+ Create Creator Account"}
      </button>
    </form>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: 7,
  fontSize: 12,
  fontWeight: 800,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "13px 14px",
  borderRadius: 11,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.45)",
  color: "white",
  outline: "none",
};

const errorStyle = {
  marginTop: 16,
  padding: 12,
  borderRadius: 10,
  background: "rgba(255,60,60,0.08)",
  border: "1px solid rgba(255,80,80,0.25)",
  color: "#ffaaaa",
  fontSize: 13,
};

const successStyle = {
  marginTop: 16,
  padding: 12,
  borderRadius: 10,
  background: "rgba(60,180,90,0.08)",
  border: "1px solid rgba(80,210,110,0.25)",
  color: "#b8f5c2",
  fontSize: 13,
};