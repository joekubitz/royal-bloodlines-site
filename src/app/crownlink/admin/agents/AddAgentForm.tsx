"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AgencyOption = {
  id: string;
  name: string;
};

export default function AddAgentForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tiktokUsername, setTiktokUsername] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);
  const [registrationCode, setRegistrationCode] = useState("");
  const [loadingAgencies, setLoadingAgencies] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAgencies() {
      try {
        const response = await fetch(
          "/api/crownlink/admin/agents/agencies"
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Agencies could not be loaded."
          );
        }

        setAgencies(data.agencies ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Agencies could not be loaded."
        );
      } finally {
        setLoadingAgencies(false);
      }
    }

    loadAgencies();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    const selectedAgency = agencies.find(
      (agency) => agency.id === agencyId
    );

    if (!selectedAgency) {
      setError("Please select an agency.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/crownlink/admin/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          displayName,
          tiktokUsername,
          agencyId: selectedAgency.id,
          agencyName: selectedAgency.name,
          registrationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Agent could not be created.");
      }

      setEmail("");
      setDisplayName("");
      setTiktokUsername("");
      setAgencyId("");
      setRegistrationCode("");

      setMessage(
        data.temporaryPassword
          ? `Agent created. Temporary password: ${data.temporaryPassword}`
          : "Agent created successfully."
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Agent could not be created."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: 22,
        borderRadius: 18,
        border: "1px solid rgba(211,163,60,0.22)",
        background: "rgba(20,10,10,0.78)",
        display: "grid",
        gap: 14,
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 900,
          }}
        >
          Add Agent
        </h2>

        <p
          style={{
            margin: "7px 0 0",
            color: "rgba(255,255,255,0.45)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Create an agent login, assign their Crown Link agency, and give them
          a unique team registration code.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <label style={labelStyle}>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="agent@example.com"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Display Name
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
            placeholder="Agent name"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          TikTok Username
          <input
            type="text"
            value={tiktokUsername}
            onChange={(event) =>
              setTiktokUsername(
                event.target.value.replace(/^@+/, "")
              )
            }
            required
            placeholder="username"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Agency
          <select
            value={agencyId}
            onChange={(event) => setAgencyId(event.target.value)}
            required
            disabled={loadingAgencies}
            style={inputStyle}
          >
            <option value="">
              {loadingAgencies
                ? "Loading agencies..."
                : "Select an agency"}
            </option>

            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Registration Code
          <input
            type="text"
            value={registrationCode}
            onChange={(event) =>
              setRegistrationCode(
                event.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9_-]/g, "")
              )
            }
            required
            placeholder="KELLY4821"
            style={inputStyle}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting || loadingAgencies}
        style={{
          padding: "12px 16px",
          borderRadius: 10,
          border: "1px solid rgba(211,163,60,0.3)",
          background: submitting
            ? "rgba(211,163,60,0.06)"
            : "rgba(211,163,60,0.12)",
          color: submitting
            ? "rgba(211,163,60,0.55)"
            : "#d3a33c",
          fontWeight: 900,
          cursor:
            submitting || loadingAgencies
              ? "not-allowed"
              : "pointer",
        }}
      >
        {submitting ? "Creating Agent..." : "Create Agent"}
      </button>

      {message && (
        <p
          style={{
            margin: 0,
            color: "#b8f5c2",
            fontSize: 12,
            fontWeight: 800,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
      )}

      {error && (
        <p
          style={{
            margin: 0,
            color: "#ffb0b0",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {error}
        </p>
      )}
    </form>
  );
}

const labelStyle = {
  display: "grid",
  gap: 7,
  color: "rgba(255,255,255,0.7)",
  fontSize: 12,
  fontWeight: 800,
};

const inputStyle = {
  width: "100%",
  padding: "12px 13px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#120707",
  color: "white",
  fontSize: 13,
};
