"use client";

import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../supabase/client";
import type { Agent } from "./page";

type EditAgentFormProps = {
  agent: Agent;
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

export default function EditAgentForm({
  agent,
}: EditAgentFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [slug, setSlug] = useState(agent.slug);
  const [name, setName] = useState(agent.name);
  const [bioShort, setBioShort] = useState(agent.bio_short);
  const [bio, setBio] = useState(agent.bio);
  const [joinLink, setJoinLink] = useState(
    agent.join_link ?? ""
  );
  const [currentImage, setCurrentImage] = useState(
    agent.image ?? ""
  );
  const [newImageFile, setNewImageFile] =
    useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] =
    useState("");
  const [sortOrder, setSortOrder] = useState(
    agent.sort_order.toString()
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function makeSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-");
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0] ?? null;

    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedFile) {
      setNewImageFile(null);
      setNewImagePreview("");
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

    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
    }

    setNewImageFile(selectedFile);
    setNewImagePreview(URL.createObjectURL(selectedFile));
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

  function getStorageFilePath(imageUrl: string) {
    const marker =
      "/storage/v1/object/public/agent-images/";

    if (!imageUrl.includes(marker)) {
      return null;
    }

    try {
      const url = new URL(imageUrl);
      const pathStart = url.pathname.indexOf(marker);

      if (pathStart === -1) {
        return null;
      }

      return decodeURIComponent(
        url.pathname.slice(pathStart + marker.length)
      );
    } catch {
      return null;
    }
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
    setSuccessMessage("");
    setErrorMessage("");

    const trimmedSlug = makeSlug(slug);
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
      setErrorMessage(
        "Display order must be a whole number."
      );
      setIsSaving(false);
      return;
    }

    let imageUrlToSave = currentImage || null;
    let newlyUploadedPath: string | null = null;

    try {
      if (newImageFile) {
        setStatusMessage("Uploading new profile picture...");

        const uploadResult = await uploadAgentImage(
          newImageFile,
          trimmedSlug
        );

        imageUrlToSave = uploadResult.imageUrl;
        newlyUploadedPath = uploadResult.filePath;
      }

      setStatusMessage("Saving agent changes...");

      const { error: updateError } = await supabase
        .from("agents")
        .update({
          slug: trimmedSlug,
          name: trimmedName,
          bio_short: trimmedBioShort,
          bio: trimmedBio,
          join_link: joinLink.trim() || null,
          image: imageUrlToSave,
          sort_order: parsedSortOrder,
        })
        .eq("id", agent.id);

      if (updateError) {
        if (newlyUploadedPath) {
          await supabase.storage
            .from("agent-images")
            .remove([newlyUploadedPath]);
        }

        if (updateError.code === "23505") {
          throw new Error(
            "That slug is already being used by another agent."
          );
        }

        throw new Error(
          `Unable to save changes: ${updateError.message}`
        );
      }

      if (newImageFile && currentImage) {
        const oldImagePath =
          getStorageFilePath(currentImage);

        if (oldImagePath) {
          await supabase.storage
            .from("agent-images")
            .remove([oldImagePath]);
        }
      }

      if (newImageFile && imageUrlToSave) {
        setCurrentImage(imageUrlToSave);
        setNewImageFile(null);

        if (newImagePreview) {
          URL.revokeObjectURL(newImagePreview);
        }

        setNewImagePreview("");
      }

      setSlug(trimmedSlug);
      setStatusMessage("");
      setSuccessMessage(
        "Agent changes saved successfully."
      );
      setIsSaving(false);

      router.refresh();
    } catch (error) {
      setStatusMessage("");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving the agent."
      );
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${agent.name}?`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setStatusMessage("Deleting agent...");
    setSuccessMessage("");
    setErrorMessage("");

    const { error: deleteError } = await supabase
      .from("agents")
      .delete()
      .eq("id", agent.id);

    if (deleteError) {
      setStatusMessage("");
      setErrorMessage(
        `Unable to delete agent: ${deleteError.message}`
      );
      setIsDeleting(false);
      return;
    }

    if (currentImage) {
      const imagePath = getStorageFilePath(currentImage);

      if (imagePath) {
        await supabase.storage
          .from("agent-images")
          .remove([imagePath]);
      }
    }

    router.push("/dashboard/agents");
    router.refresh();
  }

  const displayedImage =
    newImagePreview || currentImage;

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
            setName(event.target.value)
          }
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
        Replace Profile Picture
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageChange}
          disabled={isSaving || isDeleting}
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
          Leave this blank to keep the current picture. JPG,
          PNG, or WebP; maximum size 6 MB.
        </span>
      </label>

      {displayedImage && (
        <div>
          <p
            style={{
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            {newImagePreview
              ? "New Image Preview"
              : "Current Image"}
          </p>

          <img
            src={displayedImage}
            alt={`${name || "Agent"} preview`}
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

      {successMessage && (
        <p
          style={{
            color: "#76db8c",
            fontWeight: 700,
          }}
        >
          {successMessage}
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
            cursor:
              isDeleting || isSaving
                ? "not-allowed"
                : "pointer",
            opacity:
              isDeleting || isSaving ? 0.6 : 1,
          }}
        >
          {isDeleting
            ? "Deleting..."
            : "Delete Agent"}
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
            cursor:
              isSaving || isDeleting
                ? "not-allowed"
                : "pointer",
            opacity:
              isSaving || isDeleting ? 0.6 : 1,
          }}
        >
          {isSaving
            ? "Saving..."
            : "Save Changes"}
        </button>
      </div>
    </form>
  );
}