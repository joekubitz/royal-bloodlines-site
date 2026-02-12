"use client";

import { useMemo, useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function ApplyPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [serverMsg, setServerMsg] = useState<string>("");

  const inputStyle: React.CSSProperties = useMemo(
    () => ({
      width: "100%",
      padding: "12px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.35)",
      color: "white",
      outline: "none",
    }),
    []
  );

  const labelStyle: React.CSSProperties = { display: "block", marginBottom: 14 };
  const titleStyle: React.CSSProperties = {
    fontWeight: 800,
    marginBottom: 8,
    letterSpacing: 0.2,
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setServerMsg("");

    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload = {
      // Section 1
      fullName: String(fd.get("fullName") || ""),
      displayName: String(fd.get("displayName") || ""),
      tiktok: String(fd.get("tiktok") || ""),
      email: String(fd.get("email") || ""),
      discord: String(fd.get("discord") || ""),
      country: String(fd.get("country") || ""),
      is18: String(fd.get("is18") || "") === "Yes",

      // Section 2
      tiktokDuration: String(fd.get("tiktokDuration") || ""),
      inAgency: String(fd.get("inAgency") || ""),
      agencyName: String(fd.get("agencyName") || ""),
      recruitedBefore: String(fd.get("recruitedBefore") || ""),
      recruitedHowMany: String(fd.get("recruitedHowMany") || ""),
      role: String(fd.get("role") || ""),
      roleOther: String(fd.get("roleOther") || ""),

      // Section 3
      knowCreators: String(fd.get("knowCreators") || ""),
      recruit30: String(fd.get("recruit30") || ""),
      recruitPlan: String(fd.get("recruitPlan") || ""),
      helpedGrow: String(fd.get("helpedGrow") || ""),
      growthExplain: String(fd.get("growthExplain") || ""),
      creatorTypes: fd.getAll("creatorTypes").map(String),

      // Section 4
      hoursPerWeek: String(fd.get("hoursPerWeek") || ""),
      willRecruit3: String(fd.get("willRecruit3") || ""),
      followPolicies: String(fd.get("followPolicies") || ""),

      // Section 5
      whyAgent: String(fd.get("whyAgent") || ""),
      strongRecruiter: String(fd.get("strongRecruiter") || ""),
      leadershipMeans: String(fd.get("leadershipMeans") || ""),

      // Section 6
      agree18: fd.get("agree18") === "on",
      agreeNotBound: fd.get("agreeNotBound") === "on",
      agreeRecruit3: fd.get("agreeRecruit3") === "on",
      agreeFollow: fd.get("agreeFollow") === "on",
    };

    // Front-end auto-reject (still logs on sheet as auto-reject too)
    if (!payload.is18 || !payload.agree18) {
      setStatus("error");
      setServerMsg("You must be 18+ to apply.");
      return;
    }

    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(json?.error || "Bad response");

      setStatus("success");
      setServerMsg(json?.status ? `Status: ${json.status}` : "Submitted!");
      form.reset();
    } catch (err: any) {
      setStatus("error");
      setServerMsg(err?.message || "Something went wrong. Try again.");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(70% 55% at 50% 0%, rgba(255,215,0,0.14), transparent 60%), radial-gradient(60% 50% at 20% 20%, rgba(255,140,0,0.10), transparent 55%), #070707",
        padding: "56px 16px",
        color: "white",
        display: "flex",
        justifyContent: "center",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <div style={{ width: "100%", maxWidth: 980 }}>
        {/* HERO BANNER */}
        <div
          style={{
            borderRadius: 22,
            overflow: "hidden",
            position: "relative",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 30px 100px rgba(0,0,0,0.75)",
            marginBottom: 22,
          }}
        >
          <img
            src="/agent-banner.png"
            alt="Royals Bloodline Agent Application"
            style={{
              width: "100%",
              height: 420,
              objectFit: "cover",
              display: "block",
              filter: "saturate(1.05) contrast(1.05)",
            }}
          />

          {/* overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.72) 70%, rgba(7,7,7,0.95) 100%)",
            }}
          />

          {/* glow */}
          <div
            style={{
              position: "absolute",
              inset: -40,
              background:
                "radial-gradient(50% 35% at 50% 35%, rgba(255,215,0,0.22), transparent 60%)",
              pointerEvents: "none",
            }}
          />

          {/* hero text */}
          <div
            style={{
              position: "absolute",
              left: 22,
              right: 22,
              bottom: 18,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                fontFamily:
                  'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
                fontSize: 36,
                fontWeight: 800,
                letterSpacing: 0.8,
                textShadow: "0 6px 30px rgba(0,0,0,0.65)",
              }}
            >
              👑 Royals Bloodline Agent Application
            </div>

            <div style={{ color: "rgba(255,255,255,0.75)", maxWidth: 720 }}>
              Complete the application below. Leadership will review and follow up.
            </div>

            <div
              style={{
                height: 2,
                width: 280,
                borderRadius: 999,
                background:
                  "linear-gradient(90deg, rgba(255,215,0,0.0), rgba(255,215,0,0.95), rgba(255,215,0,0.0))",
                marginTop: 6,
              }}
            />
          </div>
        </div>

        {/* FORM CARD */}
        <form
          onSubmit={onSubmit}
          style={{
            borderRadius: 20,
            padding: 18,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 20px 70px rgba(0,0,0,0.60)",
            backdropFilter: "blur(10px)",
          }}
        >
          {/* Section 1 */}
          <SectionTitle text="Section 1: Basic Information" />
          <Field label="Full Name *" name="fullName" required inputStyle={inputStyle} />
          <Field label="Preferred Display Name" name="displayName" inputStyle={inputStyle} />
          <Field label="TikTok Username *" name="tiktok" required placeholder="@username" inputStyle={inputStyle} />
          <Field label="Email Address *" name="email" type="email" required inputStyle={inputStyle} />
          <Field label="Discord Username (include numbers) *" name="discord" required placeholder="name#0000 or name" inputStyle={inputStyle} />
          <Field label="Country of Residence *" name="country" required inputStyle={inputStyle} />

          <label style={labelStyle}>
            <div style={titleStyle}>Age (Confirm you are 18+) *</div>
            <select name="is18" required style={inputStyle} defaultValue="">
              <option value="" disabled>Select</option>
              <option value="Yes">Yes (I am 18+)</option>
              <option value="No">No</option>
            </select>
          </label>

          {/* Section 2 */}
          <SectionTitle text="Section 2: TikTok Experience & Background" />

          <label style={labelStyle}>
            <div style={titleStyle}>How long have you been active on TikTok? *</div>
            <select name="tiktokDuration" required style={inputStyle} defaultValue="">
              <option value="" disabled>Select</option>
              <option value="Less than 3 months">Less than 3 months</option>
              <option value="3–6 months">3–6 months</option>
              <option value="6–12 months">6–12 months</option>
              <option value="1+ year">1+ year</option>
            </select>
          </label>

          <label style={labelStyle}>
            <div style={titleStyle}>Are you currently part of a TikTok agency? *</div>
            <select name="inAgency" required style={inputStyle} defaultValue="">
              <option value="" disabled>Select</option>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </label>

          <Field label="If yes, enter agency name" name="agencyName" inputStyle={inputStyle} />

          <label style={labelStyle}>
            <div style={titleStyle}>Have you ever recruited creators before? *</div>
            <select name="recruitedBefore" required style={inputStyle} defaultValue="">
              <option value="" disabled>Select</option>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </label>

          <Field label="If yes, how many?" name="recruitedHowMany" inputStyle={inputStyle} />

          <label style={labelStyle}>
            <div style={titleStyle}>What is your current TikTok role? *</div>
            <select name="role" required style={inputStyle} defaultValue="">
              <option value="" disabled>Select</option>
              <option value="Creator">Creator</option>
              <option value="Moderator">Moderator</option>
              <option value="Recruiter">Recruiter</option>
              <option value="Agency Agent">Agency Agent</option>
              <option value="Viewer / Supporter">Viewer / Supporter</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <Field label="If Other, please specify" name="roleOther" inputStyle={inputStyle} />

          {/* Section 3 */}
          <SectionTitle text="Section 3: Recruiting Ability (MOST IMPORTANT)" />

          <label style={labelStyle}>
            <div style={titleStyle}>Do you currently know creators who would join Royals Bloodline? *</div>
            <select name="knowCreators" required style={inputStyle} defaultValue="">
              <option value="" disabled>Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </label>

          <label style={labelStyle}>
            <div style={titleStyle}>How many creators could you realistically recruit within 30 days? *</div>
            <select name="recruit30" required style={inputStyle} defaultValue="">
              <option value="" disabled>Select</option>
              <option value="0">0</option>
              <option value="1–2">1–2</option>
              <option value="3–5">3–5</option>
              <option value="6+">6+</option>
            </select>
          </label>

          <label style={labelStyle}>
            <div style={titleStyle}>How do you plan to recruit creators? *</div>
            <textarea name="recruitPlan" required rows={4} style={{ ...inputStyle, resize: "vertical" }} />
          </label>

          <label style={labelStyle}>
            <div style={titleStyle}>Have you helped any creators grow before? *</div>
            <select name="helpedGrow" required style={inputStyle} defaultValue="">
              <option value="" disabled>Select</option>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </label>

          <label style={labelStyle}>
            <div style={titleStyle}>If yes, explain briefly</div>
            <textarea name="growthExplain" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </label>

          <fieldset
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 14,
              padding: 14,
              marginBottom: 18,
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <legend
              style={{
                padding: "0 8px",
                color: "rgba(255,255,255,0.85)",
                fontWeight: 800,
              }}
            >
              What type of creators do you plan to recruit? *
            </legend>

            <Check name="creatorTypes" value="New creators" label="New creators" />
            <Check name="creatorTypes" value="Established creators" label="Established creators" />
            <Check name="creatorTypes" value="Gamers" label="Gamers" />
            <Check name="creatorTypes" value="Entertainers" label="Entertainers" />
            <Check name="creatorTypes" value="All types" label="All types" />
          </fieldset>

          {/* Section 4 */}
          <SectionTitle text="Section 4: Activity & Commitment" />

          <label style={labelStyle}>
            <div style={titleStyle}>How many hours per week can you dedicate to recruiting? *</div>
            <select name="hoursPerWeek" required style={inputStyle} defaultValue="">
              <option value="" disabled>Select</option>
              <option value="1–3">1–3</option>
              <option value="4–7">4–7</option>
              <option value="8–15">8–15</option>
              <option value="15+">15+</option>
            </select>
          </label>

          <label style={labelStyle}>
            <div style={titleStyle}>Are you willing to recruit at least 3 ready creators? *</div>
            <select name="willRecruit3" required style={inputStyle} defaultValue="">
              <option value="" disabled>Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </label>

          <label style={labelStyle}>
            <div style={titleStyle}>Are you willing to follow Royals Bloodline leadership and policies? *</div>
            <select name="followPolicies" required style={inputStyle} defaultValue="">
              <option value="" disabled>Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </label>

          {/* Section 5 */}
          <SectionTitle text="Section 5: Character & Fit" />

          <label style={labelStyle}>
            <div style={titleStyle}>Why do you want to become a Royals Bloodline Agent? *</div>
            <textarea name="whyAgent" required rows={4} style={{ ...inputStyle, resize: "vertical" }} />
          </label>

          <label style={labelStyle}>
            <div style={titleStyle}>What makes you a strong recruiter? *</div>
            <textarea name="strongRecruiter" required rows={4} style={{ ...inputStyle, resize: "vertical" }} />
          </label>

          <label style={labelStyle}>
            <div style={titleStyle}>What does leadership mean to you? *</div>
            <textarea name="leadershipMeans" required rows={4} style={{ ...inputStyle, resize: "vertical" }} />
          </label>

          {/* Section 6 */}
          <SectionTitle text="Section 6: Agreement (Required)" />

          <div style={{ marginBottom: 18 }}>
            <Check name="agree18" label="I confirm I am 18+" required />
            <Check name="agreeNotBound" label="I am not currently bound to another agency (or can leave)" required />
            <Check name="agreeRecruit3" label="I understand I must recruit 3 ready creators" required />
            <Check name="agreeFollow" label="I agree to follow Royals Bloodline leadership" required />
          </div>

          <button
            type="submit"
            disabled={status === "submitting"}
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,215,0,0.35)",
              background:
                status === "submitting"
                  ? "linear-gradient(180deg, rgba(255,215,0,0.65), rgba(255,215,0,0.45))"
                  : "linear-gradient(180deg, rgba(255,215,0,0.95), rgba(255,215,0,0.75))",
              fontWeight: 900,
              cursor: status === "submitting" ? "not-allowed" : "pointer",
              boxShadow: "0 10px 40px rgba(255,215,0,0.10)",
            }}
          >
            {status === "submitting" ? "Submitting..." : "👑 Submit Agent Application"}
          </button>

          {status !== "idle" && (
            <p
              style={{
                marginTop: 14,
                color: status === "success" ? "rgba(255,255,255,0.85)" : "#ffb4b4",
              }}
            >
              {status === "success" ? `✅ Submitted! ${serverMsg}` : `❌ ${serverMsg}`}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}

function SectionTitle({ text }: { text: string }) {
  return (
    <div
      style={{
        margin: "22px 0 12px",
        fontWeight: 900,
        fontSize: 18,
        color: "rgba(255,255,255,0.92)",
        letterSpacing: 0.3,
      }}
    >
      {text}
      <div
        style={{
          height: 1,
          background:
            "linear-gradient(90deg, rgba(255,215,0,0.0), rgba(255,215,0,0.25), rgba(255,215,0,0.0))",
          marginTop: 10,
        }}
      />
    </div>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
  type = "text",
  inputStyle,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  inputStyle: React.CSSProperties;
}) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>{label}</div>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        type={type}
        style={inputStyle}
      />
    </label>
  );
}

function Check({
  name,
  value,
  label,
  required,
}: {
  name: string;
  value?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
      <input
        type="checkbox"
        name={name}
        value={value}
        required={required}
        style={{ transform: "scale(1.15)" }}
      />
      <span style={{ color: "rgba(255,255,255,0.85)" }}>{label}</span>
    </label>
  );
}
