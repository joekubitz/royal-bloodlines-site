"use client";

import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../supabase/client";

type NewAgentFormProps = {
  suggestedSortOrder: number;
};

const MAX_IMAGE_SIZE = 6 * 1024 * 1024;

const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

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
  const supabase = useMemo(() => createClient(), []);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [bioShort, setBioShort] = useState("");
  const [bio, setBio] = useState("");
  const [joinLink, setJoinLink] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [sortOrder, setSortOrder] = useState(
    suggestedSortOrder.toString()
  );

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
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
    const previousAutomaticSlug = makeSlug(name);

    setName(value);

    if (!slug || slug === previousAutomaticSlug) {
      setSlug(makeSlug(value));
    }
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0] ?? null;

    setErrorMessage("");

    if (!selectedFile) {
      setImageFile(null);
      setImagePreview("");
      return;
    }

    if (!allowedImageTypes.includes(selectedFile.type)) {
      setErrorMessage(
        "Please choose a JPG, PNG, or WebP image."
      );
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_IMAGE_SIZE) {
      setErrorMessage(
        "The image must be 6 MB or smaller."
      );
      event.target.value = "";
      return;
    }

    setImageFile(selectedFile);
    setImagePreview(URL.createObjectURL(selectedFile));
  }

  function getFileExtension(file: File) {
    const extensionFromName = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (
      extensionFromName &&
      ["jpg", "jpeg", "png", "webp"].includes(
        extensionFromName
      )
    ) {
      return extensionFromName === "jpeg"
        ? "jpg"
        : extensionFromName;
    }

    if (file.type === "image/png") {
      return "png";
    }

    if (file.type === "image/webp") {
      return "webp";
    }

    return "jpg";
  }

  async function uploadAgentImage(
    file: File,
    agentSlug: string
  ) {
    const extension = getFileExtension(file);
    const uniquePart = crypto.randomUUID();
    const filePath =
      `${agentSlug}/${Date.now()}-${uniquePart}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("agent-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `Image upload failed: ${uploadError.message}`
      );
    }

    const { data } = supabase.storage
      .from("agent-images")
      .getPublicUrl(filePath);

    return {
      imageUrl: data.publicUrl,
      filePath,
    };
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setIsSaving(true);
    setStatusMessage("");
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
      setErrorMessage(
        "Display order must be a whole number."
      );
      setIsSaving(false);
      return;
    }

    let uploadedImageUrl: string | null = null;
    let uploadedFilePath: string | null = null;

    try {
      if (imageFile) {
        setStatusMessage("Uploading profile picture...");

        const uploadedImage = await uploadAgentImage(
          imageFile,
          trimmedSlug
        );

        uploadedImageUrl = uploadedImage.imageUrl;
        uploadedFilePath = uploadedImage.filePath;
      }

      setStatusMessage("Adding agent...");

      const { error: insertError } = await supabase
        .from("agents")
        .insert({
          name: trimmedName,
          slug: trimmedSlug,
          bio_short: trimmedBioShort,
          bio: trimmedBio,
          join_link: joinLink.trim() || null,
          image: uploadedImageUrl,
          sort_order: parsedSortOrder,
        });

      if (insertError) {
        if (uploadedFilePath) {
          await supabase.storage
            .from("agent-images")
            .remove([uploadedFilePath]);
        }

        if (insertError.code === "23505") {
          throw new Error(
            "That slug is already being used by another agent."
          );
        }

        throw new Error(
          `Unable to add agent: ${insertError.message}`
        );
      }

      router.push("/dashboard/agents");
      router.refresh();
    } catch (error) {
      setStatusMessage("");

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while adding the agent."
      );

      setIsSaving(false);
    }
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
          onChange={(event) =>
            handleNameChange(event.target.value)
          }
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
          onChange={(event) =>
            setSlug(makeSlug(event.target.value))
          }
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
          onChange={(event) =>
            setBioShort(event.target.value)
          }
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
          onChange={(event) =>
            setBio(event.target.value)
          }
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
          onChange={(event) =>
            setJoinLink(event.target.value)
          }
          placeholder="https://..."
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Profile Picture
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageChange}
          disabled={isSaving}
          style={{
            ...inputStyle,
            cursor: "pointer",
          }}
        />

        <span
          style={{
            opacity: 0.65,
            fontSize: 14,
            fontWeight: 400,
          }}
        >
          JPG, PNG, or WebP. Maximum size: 6 MB.
        </span>
      </label>

      {imagePreview && (
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
            src={imagePreview}
            alt="Selected agent preview"
            style={{
              width: 160,
              height: 160,
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
          onChange={(event) =>
            setSortOrder(event.target.value)
          }
          style={inputStyle}
          required
        />
      </label>

      {statusMessage && (
        <p
          style={{
            color: "#d4af37",
            fontWeight: 700,
          }}
        >
          {statusMessage}
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
            cursor: isSaving
              ? "not-allowed"
              : "pointer",
            opacity: isSaving ? 0.6 : 1,
          }}
        >
          {isSaving
            ? "Adding Agent..."
            : "Add Agent"}
        </button>
      </div>
    </form>
  );
}