"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PreviewRow = {
  spreadsheetRow: number;
  battleId: string;
  creator: string | null;
  opponent: string | null;
  creatorScore: number | null;
  opponentScore: number | null;
  valid: boolean;
  issues: string[];
};

type PreviewResponse = {
  success?: boolean;
  error?: string;
  fileName?: string;
  totalRows?: number;
  validRows?: number;
  errorRows?: number;
  canImport?: boolean;
  preview?: PreviewRow[];
};

type SaveResponse = {
  success?: boolean;
  error?: string;
  savedCount?: number;
  message?: string;
};

export default function ScoreImportPanel() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [result, setResult] =
    useState<PreviewResponse | null>(null);

  const [saveResult, setSaveResult] =
    useState<SaveResponse | null>(null);

  async function handleScan() {
    if (!file) {
      setResult({
        error: "Choose an Excel file first.",
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setSaveResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "/api/crownlink/battles/import-scores",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      setResult(data);
    } catch {
      setResult({
        error:
          "Something went wrong while scanning the spreadsheet.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (
      !result?.canImport ||
      !result.preview ||
      result.preview.length === 0
    ) {
      return;
    }

    setSaving(true);
    setSaveResult(null);

    try {
      const rows = result.preview.map((row) => ({
        battleId: row.battleId,
        creatorScore: row.creatorScore,
        opponentScore: row.opponentScore,
      }));

      const response = await fetch(
        "/api/crownlink/battles/save-scores",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rows,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setSaveResult({
          error:
            data.error ||
            "The battle scores could not be saved.",
        });
        return;
      }

      setSaveResult(data);

      /*
       * Refresh the server-rendered Battles page
       * so saved scores can appear once we add them
       * to the battle cards.
       */
      router.refresh();
    } catch {
      setSaveResult({
        error:
          "Something went wrong while saving the scores.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      style={{
        marginBottom: 24,
        padding: 20,
        borderRadius: 18,
        border:
          "1px solid rgba(201,151,50,0.16)",
        background:
          "linear-gradient(145deg, rgba(17,13,13,0.96), rgba(4,4,4,0.98))",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#c99732",
          fontSize: 7,
          fontWeight: 950,
          letterSpacing: 1.8,
          textTransform: "uppercase",
        }}
      >
        Battle Results
      </p>

      <h2
        style={{
          margin: "6px 0 0",
          color: "#f9f4ed",
          fontSize: 20,
          fontWeight: 950,
        }}
      >
        Upload Scores
      </h2>

      <p
        style={{
          margin: "7px 0 0",
          color: "rgba(247,241,232,0.36)",
          fontSize: 10,
          lineHeight: 1.6,
        }}
      >
        Upload a Bloodline Arena Excel export after both
        score columns have been completed.
      </p>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(event) => {
            setFile(
              event.target.files?.[0] ?? null
            );
            setResult(null);
            setSaveResult(null);
          }}
          style={{
            color: "#f7f1e8",
            fontSize: 10,
          }}
        />

        <button
          type="button"
          onClick={handleScan}
          disabled={!file || loading || saving}
          style={{
            padding: "9px 13px",
            borderRadius: 10,
            border:
              "1px solid rgba(201,151,50,0.22)",
            background:
              "linear-gradient(135deg, rgba(201,151,50,0.15), rgba(232,111,0,0.09))",
            color: "#d9b15c",
            fontSize: 8,
            fontWeight: 950,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            cursor:
              !file || loading || saving
                ? "not-allowed"
                : "pointer",
            opacity:
              !file || loading || saving
                ? 0.5
                : 1,
          }}
        >
          {loading
            ? "Scanning..."
            : "Scan Spreadsheet"}
        </button>
      </div>

      {result?.error && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            border:
              "1px solid rgba(205,70,70,0.3)",
            background:
              "rgba(120,20,20,0.12)",
            color: "#ffb2b2",
            fontSize: 10,
          }}
        >
          {result.error}
        </div>
      )}

      {result?.preview && (
        <div
          style={{
            marginTop: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <StatPill
              label="Rows"
              value={result.totalRows ?? 0}
            />

            <StatPill
              label="Ready"
              value={result.validRows ?? 0}
            />

            <StatPill
              label="Errors"
              value={result.errorRows ?? 0}
            />
          </div>

          <div
            style={{
              overflowX: "auto",
              borderRadius: 12,
              border:
                "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 700,
                fontSize: 10,
              }}
            >
              <thead>
                <tr>
                  <Header>Row</Header>
                  <Header>Creator</Header>
                  <Header>Score</Header>
                  <Header>Opponent</Header>
                  <Header>Score</Header>
                  <Header>Status</Header>
                </tr>
              </thead>

              <tbody>
                {result.preview.map((row) => (
                  <tr
                    key={`${row.battleId}-${row.spreadsheetRow}`}
                  >
                    <Cell>
                      {row.spreadsheetRow}
                    </Cell>

                    <Cell>
                      {row.creator ?? "Unknown"}
                    </Cell>

                    <Cell>
                      {row.creatorScore ??
                        "—"}
                    </Cell>

                    <Cell>
                      {row.opponent ??
                        "Unknown"}
                    </Cell>

                    <Cell>
                      {row.opponentScore ??
                        "—"}
                    </Cell>

                    <Cell>
                      {row.valid ? (
                        <span
                          style={{
                            color: "#d9b15c",
                            fontWeight: 900,
                          }}
                        >
                          Ready
                        </span>
                      ) : (
                        <span
                          style={{
                            color: "#ff9c9c",
                          }}
                        >
                          {row.issues.join(
                            " · "
                          )}
                        </span>
                      )}
                    </Cell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.canImport && !saveResult?.success && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 12,
                border:
                  "1px solid rgba(201,151,50,0.16)",
                background:
                  "rgba(201,151,50,0.04)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color:
                    "rgba(247,241,232,0.55)",
                  fontSize: 10,
                }}
              >
                Spreadsheet passed validation.
                Nothing has been saved yet.
              </p>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  marginTop: 12,
                  padding: "10px 15px",
                  borderRadius: 10,
                  border:
                    "1px solid rgba(201,151,50,0.3)",
                  background:
                    "linear-gradient(135deg, rgba(201,151,50,0.22), rgba(232,111,0,0.14))",
                  color: "#f0c96a",
                  fontSize: 8,
                  fontWeight: 950,
                  letterSpacing: 0.65,
                  textTransform: "uppercase",
                  cursor: saving
                    ? "not-allowed"
                    : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving
                  ? "Saving Scores..."
                  : "Confirm & Save Scores"}
              </button>
            </div>
          )}

          {saveResult?.error && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 10,
                border:
                  "1px solid rgba(205,70,70,0.3)",
                background:
                  "rgba(120,20,20,0.12)",
                color: "#ffb2b2",
                fontSize: 10,
              }}
            >
              {saveResult.error}
            </div>
          )}

          {saveResult?.success && (
            <div
              style={{
                marginTop: 14,
                padding: 13,
                borderRadius: 10,
                border:
                  "1px solid rgba(201,151,50,0.23)",
                background:
                  "rgba(201,151,50,0.07)",
                color: "#e4c06c",
                fontSize: 10,
                fontWeight: 850,
              }}
            >
              ✓{" "}
              {saveResult.message ??
                "Battle results successfully saved."}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StatPill({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      style={{
        padding: "7px 10px",
        borderRadius: 999,
        border:
          "1px solid rgba(201,151,50,0.13)",
        background:
          "rgba(201,151,50,0.035)",
      }}
    >
      <span
        style={{
          color:
            "rgba(247,241,232,0.3)",
          fontSize: 7,
          fontWeight: 900,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          marginLeft: 6,
          color: "#d9b15c",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function Header({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th
      style={{
        padding: "9px 10px",
        textAlign: "left",
        color: "#d9b15c",
        background:
          "rgba(201,151,50,0.055)",
        borderBottom:
          "1px solid rgba(255,255,255,0.06)",
        fontSize: 8,
        fontWeight: 950,
        textTransform: "uppercase",
      }}
    >
      {children}
    </th>
  );
}

function Cell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <td
      style={{
        padding: "9px 10px",
        color:
          "rgba(247,241,232,0.62)",
        borderBottom:
          "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {children}
    </td>
  );
}