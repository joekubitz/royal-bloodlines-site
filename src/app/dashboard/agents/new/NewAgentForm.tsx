"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../supabase/client";

type NewAgentFormProps = {
  suggestedSortOrder: number;
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #444",
  background: "#0b0b0d",
  color: "#fff",
  fontSize: "16px",
};

const labelStyle = {
  display: "grid",
  gap: "8px",
  fontWeight: 700,
};

export default function NewAgentForm({
  suggestedSortOrder,
}: NewAgentFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [bioShort, setBioShort] = useState("");
  const [bio, setBio] = useState("");
  const [joinLink, setJoinLink] = useState("");
  const [image, setImage] = useState("");
  const [sortOrder, setSortOrder] = useState(
    suggestedSortOrder.toString()
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function makeSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-");
  }

  function handleNameChange(value: string) {
    setName(value);

    if (!slug || slug === makeSlug(name)) {
      setSlug(makeSlug(value));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setErrorMessage("");

    const trimmedName = name.trim();
    const trimmedSlug = makeSlug(slug);
    const trimmedBioShort = bioShort.trim();
    const trimmedBio = bio.trim();
    const parsedSortOrder = Number(sortOrder);

    if (
      !trimmedName ||
      !trimmedSlug ||
      !trimmedBioShort ||
      !trimmedBio
    ) {
      setErrorMessage(
        "Name, slug, short bio, and full bio are required."
      );
      setIsSaving(false);
      return;
    }

    if (!Number.isInteger(parsedSortOrder)) {
      setErrorMessage("Display order must be a whole number.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from("agents").insert({
      name: trimmedName,
      slug: trimmedSlug,
      bio_short: trimmedBioShort,
      bio: trimmedBio,
      join_link: joinLink.trim() || null,
      image: image.trim() || null,
      sort_order: parsedSortOrder,
    });

    if (error) {
      if (error.code === "23505") {
        setErrorMessage(
          "That slug is already being used by another agent."
        );
      } else {
        setErrorMessage(`Unable to add agent: ${error.message}`);
      }

      setIsSaving(false);
      return;
    }

    router.push("/dashboard/agents");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: 20,
        border: "1px solid #333",
        borderRadius: 16,
        padding: 22,
      }}
    >
      <label style={labelStyle}>
        Name
        <input
          type="text"
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
          placeholder="Example: Jane Doe - Team Royal"
          style={inputStyle}
          required
        />
      </label>

      <label style={labelStyle}>
        Slug
        <input
          type="text"
          value={slug}
          onChange={(event) => setSlug(makeSlug(event.target.value))}
          placeholder="jane-doe"
          style={inputStyle}
          required
        />

        <span
          style={{
            opacity: 0.65,
            fontSize: 14,
            fontWeight: 400,
          }}
        >
          Agent page: /agents/{slug || "agent-name"}
        </span>
      </label>

      <label style={labelStyle}>
        Short Bio
        <textarea
          value={bioShort}
          onChange={(event) => setBioShort(event.target.value)}
          rows={4}
          placeholder="A short description shown on the agent list."
          style={{
            ...inputStyle,
            resize: "vertical",
            fontFamily: "inherit",
          }}
          required
        />
      </label>

      <label style={labelStyle}>
        Full Bio
        <textarea
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          rows={14}
          placeholder="The full agent bio shown on their profile page."
          style={{
            ...inputStyle,
            resize: "vertical",
            fontFamily: "inherit",
            lineHeight: 1.6,
          }}
          required
        />
      </label>

      <label style={labelStyle}>
        Join Link
        <input
          type="url"
          value={joinLink}
          onChange={(event) => setJoinLink(event.target.value)}
          placeholder="https://..."
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Image Path
        <input
          type="text"
          value={image}
          onChange={(event) => setImage(event.target.value)}
          placeholder="/agents/example.png"
          style={inputStyle}
        />

        <span
          style={{
            opacity: 0.65,
            fontSize: 14,
            fontWeight: 400,
          }}
        >
          Leave this blank for now if the image has not been added yet.
        </span>
      </label>

      {image && (
        <div>
          <p
            style={{
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            Image Preview
          </p>

          <img
            src={image}
            alt="Agent preview"
            style={{
              width: 140,
              height: 140,
              objectFit: "cover",
              borderRadius: 14,
              border: "1px solid #444",
            }}
          />
        </div>
      )}

      <label style={labelStyle}>
        Display Order
        <input
          type="number"
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
          style={inputStyle}
          required
        />
      </label>

      {errorMessage && (
        <p
          style={{
            color: "#ff6868",
            fontWeight: 700,
          }}
        >
          {errorMessage}
        </p>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 8,
        }}
      >
        <button
          type="submit"
          disabled={isSaving}
          style={{
            background: "#d4af37",
            color: "#000",
            border: "none",
            padding: "12px 22px",
            borderRadius: 10,
            fontWeight: 900,
            cursor: "pointer",
            opacity: isSaving ? 0.6 : 1,
          }}
        >
          {isSaving ? "Adding Agent..." : "Add Agent"}
        </button>
      </div>
    </form>
  );
}