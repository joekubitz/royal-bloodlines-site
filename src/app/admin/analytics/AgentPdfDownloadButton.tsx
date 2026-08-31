"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import AgentPdfReport, {
  AgentPdfData,
} from "./AgentPdfReport";

export default function AgentPdfDownloadButton({
  agent,
}: {
  agent: AgentPdfData;
}) {
  const safeAgent = agent.agent
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "-");

  return (
    <PDFDownloadLink
      document={
        <AgentPdfReport
          agent={agent}
        />
      }
      fileName={`Royals-Bloodline-${safeAgent}-Team-Report.pdf`}
      className="inline-flex items-center justify-center rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
    >
      {({ loading }) =>
        loading
          ? "Preparing..."
          : "Download Team Report"
      }
    </PDFDownloadLink>
  );
}