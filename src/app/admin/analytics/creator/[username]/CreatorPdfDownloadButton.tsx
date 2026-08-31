"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import CreatorPdfReport, {
  CreatorPdfStat,
} from "./CreatorPdfReport";

export default function CreatorPdfDownloadButton({
  creator,
  history,
}: {
  creator: CreatorPdfStat;
  history: CreatorPdfStat[];
}) {
  const safeUsername = creator.username
    .replace(/^@/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-");

  return (
    <PDFDownloadLink
      document={
        <CreatorPdfReport
          creator={creator}
          history={history}
        />
      }
      fileName={`Royals-Bloodline-${safeUsername}-Performance-Report.pdf`}
      className="inline-flex items-center justify-center rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
    >
      {({ loading }) =>
        loading
          ? "Preparing PDF..."
          : "Download PDF Report"
      }
    </PDFDownloadLink>
  );
}