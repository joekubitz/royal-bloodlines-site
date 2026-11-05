
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PreviewRow = {
  spreadsheetRow: number;
  battleId: string;
  creator: string | null;
  creatorOneId: string | null;
  opponent: string | null;
  creatorTwoId: string | null;
  creatorScore: number | null;
  opponentScore: number | null;
  valid: boolean;
  issues: string[];
};

type ReplacementRow = {
  spreadsheetRow: number;
  username: string;
  score: number | null;
  valid: boolean;
  issues: string[];
  battleId: null;
  replacedCreatorId: null;
};

type Assignment = {
  battleId: string;
  side: "creator" | "opponent" | "";
};

type PreviewResponse = {
  success?: boolean;
  error?: string;
  notice?: string;
  totalRows?: number;
  validRows?: number;
  errorRows?: number;
  canImport?: boolean;
  preview?: PreviewRow[];
  replacements?: ReplacementRow[];
};

type SaveResponse = {
  success?: boolean;
  error?: string;
  message?: string;
};

const gold = "#d9b15c";

const surface: React.CSSProperties = {
  border: "1px solid rgba(201,151,50,0.2)",
  borderRadius: 12,
  background: "rgba(201,151,50,0.045)",
  padding: 14,
};

const field: React.CSSProperties = {
  background: "#100d0d",
  color: "#f7f1e8",
  border: "1px solid rgba(201,151,50,0.28)",
  borderRadius: 9,
  padding: "10px 12px",
  width: "100%",
};

export default function ScoreImportPanel() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<PreviewResponse | null>(null);
  const [saveResult, setSaveResult] = useState<SaveResponse | null>(null);
  const [assignments, setAssignments] =
    useState<Record<number, Assignment>>({});

  async function handleScan() {
    if (!file) return;

    setLoading(true);
    setResult(null);
    setSaveResult(null);
    setAssignments({});

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

      const data: PreviewResponse = await response.json();

      setResult(
        response.ok
          ? data
          : { error: data.error ?? "Scan failed." }
      );
    } catch {
      setResult({
        error: "Something went wrong while scanning the spreadsheet.",
      });
    } finally {
      setLoading(false);
    }
  }

  const replacements = result?.replacements ?? [];
  const battles = (result?.preview ?? []).filter(
    (row) => row.battleId
  );

  const assignmentsComplete = replacements.every((replacement) => {
    const assignment = assignments[replacement.spreadsheetRow];

    return (
      replacement.valid &&
      Boolean(assignment?.battleId && assignment.side)
    );
  });

  const filledAssignments = Object.values(assignments).filter(
    (assignment) => assignment.battleId && assignment.side
  );

  const uniqueAssignments =
    new Set(
      filledAssignments.map(
        (assignment) => `${assignment.battleId}:${assignment.side}`
      )
    ).size === filledAssignments.length;

  async function handleSave() {
    if (
      !result?.canImport ||
      !result.preview?.length ||
      !assignmentsComplete ||
      !uniqueAssignments ||
      saveResult?.success
    ) {
      return;
    }

    setSaving(true);
    setSaveResult(null);

    try {
      const response = await fetch(
        "/api/crownlink/battles/save-scores",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rows: result.preview.map((row) => ({
              battleId: row.battleId,
              creatorScore: row.creatorScore,
              opponentScore: row.opponentScore,
            })),
            replacements: replacements.map((replacement) => {
              const assignment =
                assignments[replacement.spreadsheetRow];

              const battle = result.preview!.find(
                (row) => row.battleId === assignment.battleId
              )!;

              return {
                battleId: assignment.battleId,
                replacedCreatorId:
                  assignment.side === "creator"
                    ? battle.creatorOneId
                    : battle.creatorTwoId,
                username: replacement.username,
                score: replacement.score,
              };
            }),
          }),
        }
      );

      const data: SaveResponse = await response.json();

      setSaveResult(
        response.ok
          ? data
          : { error: data.error ?? "Unable to save scores." }
      );

      if (response.ok) {
        router.refresh();
      }
    } catch {
      setSaveResult({
        error: "Something went wrong while saving scores.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      style={{
        ...surface,
        padding: 20,
        background: "linear-gradient(145deg,#110d0d,#040404)",
        marginBottom: 24,
        color: "#f7f1e8",
      }}
    >
      <p
        style={{
          color: gold,
          fontSize: 10,
          letterSpacing: 2,
          fontWeight: 900,
          textTransform: "uppercase",
        }}
      >
        Battle Results
      </p>

      <h2 style={{ fontSize: 22, margin: "5px 0" }}>
        Upload Scores
      </h2>

      <p style={{ color: "#b7aaa0", fontSize: 12 }}>
        Upload the Bloodline Arena Excel export. Replacement usernames
        and scores are read from columns J and K.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 16,
          alignItems: "center",
        }}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setResult(null);
            setSaveResult(null);
            setAssignments({});
          }}
        />

        <button
          type="button"
          disabled={!file || loading || saving}
          onClick={handleScan}
          style={{
            ...field,
            width: "auto",
            color: gold,
            cursor: "pointer",
          }}
        >
          {loading ? "Scanning…" : "Scan Spreadsheet"}
        </button>
      </div>

      {result?.error && (
        <p role="alert" style={{ color: "#ff9c9c" }}>
          {result.error}
        </p>
      )}

      {result?.preview && (
        <>
          <p
            style={{
              marginTop: 20,
              color: gold,
              fontWeight: 700,
            }}
          >
            Battle score preview — {result.validRows ?? 0} ready /{" "}
            {result.errorRows ?? 0} errors
          </p>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 650,
                fontSize: 12,
              }}
            >
              <thead>
                <tr>
                  {[
                    "Row",
                    "Creator",
                    "Score",
                    "Opponent",
                    "Score",
                    "Status",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: 10,
                        textAlign: "left",
                        color: gold,
                        borderBottom: "1px solid #45331b",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {result.preview.map((row) => (
                  <tr key={`${row.spreadsheetRow}-${row.battleId}`}>
                    {[
                      row.spreadsheetRow,
                      row.creator ?? "Unknown",
                      row.creatorScore ?? "—",
                      row.opponent ?? "Unknown",
                      row.opponentScore ?? "—",
                      row.valid ? "Ready" : row.issues.join(" · "),
                    ].map((value, index) => (
                      <td
                        key={index}
                        style={{
                          padding: 10,
                          borderBottom: "1px solid #292020",
                          color:
                            index === 5 && !row.valid
                              ? "#ff9c9c"
                              : "#e6d9c9",
                        }}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {replacements.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <h3 style={{ color: gold }}>
                Replacement review ({replacements.length})
              </h3>

              <p style={{ color: "#b7aaa0", fontSize: 12 }}>
                The spreadsheet does not link J/K entries to battles.
                Select the actual battle and absent participant for
                each replacement. A zero score alone does not prove a
                no-show.
              </p>

              {replacements.map((replacement) => {
                const assignment =
                  assignments[replacement.spreadsheetRow] ?? {
                    battleId: "",
                    side: "" as const,
                  };

                const selectedBattle = battles.find(
                  (battle) => battle.battleId === assignment.battleId
                );

                return (
                  <div
                    key={replacement.spreadsheetRow}
                    style={{ ...surface, marginTop: 12 }}
                  >
                    <p style={{ margin: "0 0 10px" }}>
                      <strong>
                        @{replacement.username || "Missing username"}
                      </strong>{" "}
                      — {replacement.score ?? "Missing"} diamonds{" "}
                      <span style={{ color: "#b7aaa0" }}>
                        (sheet row {replacement.spreadsheetRow})
                      </span>
                    </p>

                    {!replacement.valid && (
                      <p style={{ color: "#ff9c9c" }}>
                        {replacement.issues.join(" · ")}
                      </p>
                    )}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit,minmax(220px,1fr))",
                        gap: 12,
                      }}
                    >
                      <label style={{ fontSize: 12 }}>
                        Battle
                        <select
                          style={{ ...field, marginTop: 6 }}
                          value={assignment.battleId}
                          onChange={(event) =>
                            setAssignments((previous) => ({
                              ...previous,
                              [replacement.spreadsheetRow]: {
                                battleId: event.target.value,
                                side: "",
                              },
                            }))
                          }
                        >
                          <option value="">Choose a battle</option>
                          {battles.map((battle) => (
                            <option
                              key={battle.battleId}
                              value={battle.battleId}
                            >
                              Row {battle.spreadsheetRow}:{" "}
                              {battle.creator} vs {battle.opponent}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={{ fontSize: 12 }}>
                        Who did not show up?
                        <select
                          style={{ ...field, marginTop: 6 }}
                          value={assignment.side}
                          disabled={!selectedBattle}
                          onChange={(event) =>
                            setAssignments((previous) => ({
                              ...previous,
                              [replacement.spreadsheetRow]: {
                                ...assignment,
                                side: event.target
                                  .value as Assignment["side"],
                              },
                            }))
                          }
                        >
                          <option value="">
                            Choose original creator
                          </option>

                          {selectedBattle && (
                            <>
                              <option value="creator">
                                {selectedBattle.creator}
                              </option>
                              <option value="opponent">
                                {selectedBattle.opponent}
                              </option>
                            </>
                          )}
                        </select>
                      </label>
                    </div>
                  </div>
                );
              })}

              {!uniqueAssignments && (
                <p style={{ color: "#ff9c9c" }}>
                  Two replacements are assigned to the same battle
                  side. Review these assignments.
                </p>
              )}

              <p
                style={{
                  color:
                    assignmentsComplete && uniqueAssignments
                      ? gold
                      : "#ffb8a5",
                  fontSize: 12,
                }}
              >
                {assignmentsComplete && uniqueAssignments
                  ? "Assignments ready. Fill-in scores are recorded but excluded from tournament rankings."
                  : "Complete every valid replacement assignment before continuing."}
              </p>
            </div>
          )}

          {result.notice && (
            <p style={{ color: "#d8b878", fontSize: 12 }}>
              {result.notice}
            </p>
          )}

          {result.canImport &&
            assignmentsComplete &&
            uniqueAssignments &&
            !saveResult?.success && (
              <div style={{ ...surface, marginTop: 18 }}>
                <p style={{ fontSize: 12 }}>
                  Spreadsheet passed validation. Nothing has been
                  saved yet.
                </p>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  style={{
                    ...field,
                    width: "auto",
                    color: gold,
                    cursor: "pointer",
                  }}
                >
                  {saving
                    ? "Saving Scores…"
                    : "Confirm & Save Scores"}
                </button>
              </div>
            )}

          {saveResult?.error && (
            <p role="alert" style={{ color: "#ff9c9c" }}>
              {saveResult.error}
            </p>
          )}

          {saveResult?.success && (
            <p role="status" style={{ color: gold }}>
              {saveResult.message ?? "Battle scores saved."}
            </p>
          )}
        </>
      )}
    </section>
  );
}
