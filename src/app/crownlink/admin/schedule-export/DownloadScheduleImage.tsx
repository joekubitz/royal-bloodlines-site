"use client";

import { useState } from "react";
import { toPng } from "html-to-image";

type DownloadScheduleImageProps = {
  targetId: string;
  eventName: string;
  dateLabel: string;
};

export default function DownloadScheduleImage({
  targetId,
  eventName,
  dateLabel,
}: DownloadScheduleImageProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    setError("");
    setDownloading(true);

    try {
      const node = document.getElementById(targetId);

      if (!node) {
        throw new Error("Schedule preview could not be found.");
      }

      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#080808",
      });

      const safeEventName = eventName
        .trim()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();

      const safeDate = dateLabel
        .trim()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();

      const link = document.createElement("a");
      link.download = `${safeEventName || "crown-link"}-${safeDate || "schedule"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "The schedule image could not be downloaded."
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        style={{
          padding: "12px 16px",
          borderRadius: 10,
          border: "1px solid rgba(211,163,60,0.35)",
          background: downloading
            ? "rgba(211,163,60,0.06)"
            : "rgba(211,163,60,0.14)",
          color: downloading ? "rgba(211,163,60,0.55)" : "#d3a33c",
          fontWeight: 900,
          cursor: downloading ? "not-allowed" : "pointer",
        }}
      >
        {downloading ? "Creating Image..." : "Download Image"}
      </button>

      {error && (
        <p
          style={{
            margin: 0,
            color: "#ff9d9d",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
