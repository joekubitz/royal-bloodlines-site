"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../supabase/client";
import type { Agent } from "./page";

type EditAgentFormProps = {
  agent: Agent;
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

export default function EditAgentForm({
  agent,
}: EditAgentFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [slug, setSlug] = useState(agent.slug);
  const [name, setName] = useState(agent.name);
  const [bioShort, setBioShort] = useState(agent.bio_short);
  const [bio, setBio] = useState(agent.bio);
  const [joinLink, setJoinLink] = useState(agent.join_link ?? "");
  const [image, setImage] = useState(agent.image ?? "");
  const [sortOrder, setSortOrder] = useState(
    agent.sort_order.toString()
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const trimmedSlug = slug.trim();
    const trimmedName = name.trim();
    const trimmedBioShort = bioShort.trim();
    const trimmedBio = bio.trim();
    const parsedSortOrder = Number(sortOrder);

    if (
      !trimmedSlug ||
      !trimmedName ||
      !trimmedBioShort ||
      !trimmedBio
    ) {
      setErrorMessage(
        "Slug, name, short bio, and full bio are required."
      );
      setIsSaving(false);
      return;
    }

    if (!Number.isInteger(parsedSortOrder)) {
      setErrorMessage("Display order must be a whole number.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from("agents")
      .update({
        slug: trimmedSlug,
        name: trimmedName,
        bio_short: trimmedBioShort,
        bio: trimmedBio,
        join_link: joinLink.trim() || null,
        image: image.trim() || null,
        sort_order: parsedSortOrder,
      })
      .eq("id", agent.id);

    if (error) {
      if (error.code === "23505") {
        setErrorMessage(
          "That slug is already being used by another agent."
        );
      } else {
        setErrorMessage(`Unable to save changes: ${error.message}`);
      }

      setIsSaving(false);
      return;
    }

    setMessage("Agent changes saved successfully.");
    setIsSaving(false);

    router.refresh();
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${agent.name}?`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("agents")
      .delete()
      .eq("id", agent.id);

    if (error) {
      setErrorMessage(`Unable to delete agent: ${error.message}`);
      setIsDeleting(false);
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
          onChange={(event) => setName(event.target.value)}
          style={inputStyle}
          required
        />
      </label>

      <label style={labelStyle}>
        Slug
        <input
          type="text"
          value={slug}
          onChange={(event) =>
            setSlug(
              event.target.value
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, "-")
                .replace(/-+/g, "-")
            )
          }
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
          For now, use the existing image filename, such as
          /agents/momma-d.jpg.
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

      {message && (
        <p
          style={{
            color: "#76db8c",
            fontWeight: 700,
          }}
        >
          {message}
        </p>
      )}

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
          gap: 12,
          justifyContent: "space-between",
          flexWrap: "wrap",
          marginTop: 8,
        }}
      >
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting || isSaving}
          style={{
            background: "#7e1f1f",
            color: "#fff",
            border: "1px solid #b83b3b",
            padding: "12px 18px",
            borderRadius: 10,
            fontWeight: 800,
            cursor: "pointer",
            opacity: isDeleting || isSaving ? 0.6 : 1,
          }}
        >
          {isDeleting ? "Deleting..." : "Delete Agent"}
        </button>

        <button
          type="submit"
          disabled={isSaving || isDeleting}
          style={{
            background: "#d4af37",
            color: "#000",
            border: "none",
            padding: "12px 22px",
            borderRadius: 10,
            fontWeight: 900,
            cursor: "pointer",
            opacity: isSaving || isDeleting ? 0.6 : 1,
          }}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}