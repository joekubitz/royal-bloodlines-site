"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import AgentTop10Graphic, {
  Top10Creator,
} from "./AgentTop10Graphic";

export default function AgentTop10DownloadButton({
  creators,
}: {
  creators: Top10Creator[];
}) {
  const graphicRef =
    useRef<HTMLDivElement>(null);

  const [loading, setLoading] =
    useState(false);

  async function downloadGraphic() {
    if (!graphicRef.current) {
      return;
    }

    setLoading(true);

    try {
      const dataUrl = await toPng(
        graphicRef.current,
        {
          cacheBust: true,
          pixelRatio: 1,
          backgroundColor: "#000000",
        }
      );

      const link =
        document.createElement("a");

      link.download =
        "Royals-Bloodline-Top-10-Creators.png";

      link.href = dataUrl;

      link.click();
    } catch (error) {
      console.error(
        "Top 10 graphic export failed:",
        error
      );

      alert(
        "Unable to generate the Top 10 graphic."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={downloadGraphic}
        disabled={loading}
        className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Generating..."
          : "Download Top 10"}
      </button>

      {/* Hidden export area */}

      <div
        style={{
          position: "fixed",
          left: "-99999px",
          top: 0,
          pointerEvents: "none",
        }}
      >
        <AgentTop10Graphic
          ref={graphicRef}
          creators={creators}
        />
      </div>
    </>
  );
}