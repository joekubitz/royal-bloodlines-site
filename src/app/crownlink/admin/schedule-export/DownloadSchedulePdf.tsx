"use client";

import { useState } from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

type DownloadSchedulePdfProps = {
  targetId: string;
  eventName: string;
  dateLabel: string;
};

export default function DownloadSchedulePdf({
  targetId,
  eventName,
  dateLabel,
}: DownloadSchedulePdfProps) {
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

      const image = new Image();
      image.src = dataUrl;

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
          reject(new Error("The schedule image could not be prepared."));
      });

      const orientation =
        image.width >= image.height ? "landscape" : "portrait";

      const pdf = new jsPDF({
        orientation,
        unit: "px",
        format: [image.width, image.height],
        hotfixes: ["px_scaling"],
      });

      pdf.addImage(
        dataUrl,
        "PNG",
        0,
        0,
        image.width,
        image.height,
        undefined,
        "FAST"
      );

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

      pdf.save(
        `${safeEventName || "crown-link"}-${safeDate || "schedule"}.pdf`
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "The schedule PDF could not be downloaded."
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
        {downloading ? "Creating PDF..." : "Download PDF"}
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
