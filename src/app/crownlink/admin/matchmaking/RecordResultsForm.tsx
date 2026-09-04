"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AttendanceStatus =
  | "unmarked"
  | "attended"
  | "no_show"
  | "replacement";

type CreatorInfo = {
  id: string;
  name: string;
  username: string;
};

type AttendanceRecord = {
  creator_id: string;
  status: AttendanceStatus;
  replacement_user_id: string | null;
  replacement_name: string | null;
  admin_notes: string | null;
};

type ResultsRecord = {
  creator_one_score: number | null;
  creator_two_score: number | null;
  score_screenshot_url: string | null;
  admin_notes: string | null;
};

type Props = {
  matchId: string;
  creatorOne: CreatorInfo;
  creatorTwo: CreatorInfo;
};

export default function RecordResultsForm({
  matchId,
  creatorOne,
  creatorTwo,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const [creatorOneStatus, setCreatorOneStatus] =
    useState<AttendanceStatus>("unmarked");
  const [creatorTwoStatus, setCreatorTwoStatus] =
    useState<AttendanceStatus>("unmarked");

  const [creatorOneReplacement, setCreatorOneReplacement] =
    useState("");
  const [creatorTwoReplacement, setCreatorTwoReplacement] =
    useState("");

  const [creatorOneScore, setCreatorOneScore] = useState("");
  const [creatorTwoScore, setCreatorTwoScore] = useState("");

  const [adminNotes, setAdminNotes] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const creatorOneLabel = useMemo(
    () =>
      creatorOne.name ||
      (creatorOne.username ? `@${creatorOne.username}` : "Creator One"),
    [creatorOne]
  );

  const creatorTwoLabel = useMemo(
    () =>
      creatorTwo.name ||
      (creatorTwo.username ? `@${creatorTwo.username}` : "Creator Two"),
    [creatorTwo]
  );

  useEffect(() => {
    if (!open || loadedOnce) {
      return;
    }

    async function loadExisting() {
      setLoadingExisting(true);
      setError("");

      try {
        const response = await fetch(
          `/api/crownlink/admin/matchmaking/results?matchId=${encodeURIComponent(
            matchId
          )}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "Could not load existing battle results."
          );
        }

        const attendance = (data.attendance ?? []) as AttendanceRecord[];
        const results = (data.results ?? null) as ResultsRecord | null;

        const oneAttendance = attendance.find(
          (row) => row.creator_id === creatorOne.id
        );

        const twoAttendance = attendance.find(
          (row) => row.creator_id === creatorTwo.id
        );

        if (oneAttendance) {
          setCreatorOneStatus(oneAttendance.status ?? "unmarked");
          setCreatorOneReplacement(
            oneAttendance.replacement_name ?? ""
          );
        }

        if (twoAttendance) {
          setCreatorTwoStatus(twoAttendance.status ?? "unmarked");
          setCreatorTwoReplacement(
            twoAttendance.replacement_name ?? ""
          );
        }

        if (results) {
          setCreatorOneScore(
            results.creator_one_score === null ||
              results.creator_one_score === undefined
              ? ""
              : String(results.creator_one_score)
          );

          setCreatorTwoScore(
            results.creator_two_score === null ||
              results.creator_two_score === undefined
              ? ""
              : String(results.creator_two_score)
          );

          setAdminNotes(results.admin_notes ?? "");
          setScreenshotUrl(results.score_screenshot_url ?? "");
        }

        setLoadedOnce(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load existing battle results."
        );
      } finally {
        setLoadingExisting(false);
      }
    }

    loadExisting();
  }, [open, loadedOnce, matchId, creatorOne.id, creatorTwo.id]);

  async function handleScreenshotUpload() {
    if (!screenshotFile) {
      setError("Choose a screenshot first.");
      return;
    }

    setUploadingScreenshot(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("matchId", matchId);
      formData.append("file", screenshotFile);

      const response = await fetch(
        "/api/crownlink/admin/matchmaking/results/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Could not upload score screenshot."
        );
      }

      setScreenshotUrl(data.url ?? "");
      setScreenshotFile(null);
      setSuccess("Score screenshot uploaded.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not upload score screenshot."
      );
    } finally {
      setUploadingScreenshot(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");

    if (
      creatorOneStatus === "replacement" &&
      !creatorOneReplacement.trim()
    ) {
      setSaving(false);
      setError(`Enter who replaced ${creatorOneLabel}.`);
      return;
    }

    if (
      creatorTwoStatus === "replacement" &&
      !creatorTwoReplacement.trim()
    ) {
      setSaving(false);
      setError(`Enter who replaced ${creatorTwoLabel}.`);
      return;
    }

    try {
      const response = await fetch(
        "/api/crownlink/admin/matchmaking/results",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            matchId,
            creatorOne: {
              creatorId: creatorOne.id,
              status: creatorOneStatus,
              replacementUserId: null,
              replacementName:
                creatorOneStatus === "replacement"
                  ? creatorOneReplacement.trim()
                  : null,
              adminNotes: null,
            },
            creatorTwo: {
              creatorId: creatorTwo.id,
              status: creatorTwoStatus,
              replacementUserId: null,
              replacementName:
                creatorTwoStatus === "replacement"
                  ? creatorTwoReplacement.trim()
                  : null,
              adminNotes: null,
            },
            creatorOneScore:
              creatorOneScore.trim() === ""
                ? null
                : Number(creatorOneScore.replace(/,/g, "")),
            creatorTwoScore:
              creatorTwoScore.trim() === ""
                ? null
                : Number(creatorTwoScore.replace(/,/g, "")),
            adminNotes: adminNotes.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Could not save battle results.");
      }

      setSuccess("Battle results saved.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save battle results."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 14,
        paddingTop: 14,
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setError("");
          setSuccess("");
        }}
        style={{
          width: "100%",
          minHeight: 42,
          borderRadius: 10,
          border: "1px solid rgba(211,163,60,0.28)",
          background: "rgba(211,163,60,0.08)",
          color: "#f0cf7a",
          fontWeight: 900,
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        {open ? "Close Results" : "Record Results"}
      </button>

      {open && (
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gap: 16,
          }}
        >
          {loadingExisting ? (
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.55)",
                fontSize: 12,
              }}
            >
              Loading existing results...
            </p>
          ) : (
            <>
              <AttendanceSection
                label={creatorOneLabel}
                status={creatorOneStatus}
                setStatus={setCreatorOneStatus}
                replacementName={creatorOneReplacement}
                setReplacementName={setCreatorOneReplacement}
              />

              <AttendanceSection
                label={creatorTwoLabel}
                status={creatorTwoStatus}
                setStatus={setCreatorTwoStatus}
                replacementName={creatorTwoReplacement}
                setReplacementName={setCreatorTwoReplacement}
              />

              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "rgba(0,0,0,0.18)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p
                  style={{
                    margin: "0 0 10px",
                    fontWeight: 900,
                    fontSize: 12,
                    color: "#d3a33c",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Final Score
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                    gap: 12,
                  }}
                >
                  <ScoreInput
                    label={creatorOneLabel}
                    value={creatorOneScore}
                    onChange={setCreatorOneScore}
                  />

                  <ScoreInput
                    label={creatorTwoLabel}
                    value={creatorTwoScore}
                    onChange={setCreatorTwoScore}
                  />
                </div>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "rgba(0,0,0,0.18)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p
                  style={{
                    margin: "0 0 10px",
                    fontWeight: 900,
                    fontSize: 12,
                    color: "#d3a33c",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Score Screenshot
                </p>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  onChange={(event) =>
                    setScreenshotFile(event.target.files?.[0] ?? null)
                  }
                  style={{
                    width: "100%",
                    color: "rgba(255,255,255,0.72)",
                    fontSize: 12,
                  }}
                />

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleScreenshotUpload}
                    disabled={!screenshotFile || uploadingScreenshot}
                    style={{
                      minHeight: 40,
                      padding: "0 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(211,163,60,0.28)",
                      background: "rgba(211,163,60,0.08)",
                      color: "#f0cf7a",
                      fontWeight: 900,
                      fontSize: 12,
                      cursor:
                        !screenshotFile || uploadingScreenshot
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        !screenshotFile || uploadingScreenshot ? 0.6 : 1,
                    }}
                  >
                    {uploadingScreenshot
                      ? "Uploading..."
                      : screenshotUrl
                      ? "Replace Screenshot"
                      : "Upload Screenshot"}
                  </button>

                  {screenshotUrl && (
                    <a
                      href={screenshotUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: "#d3a33c",
                        fontSize: 12,
                        fontWeight: 800,
                        textDecoration: "none",
                      }}
                    >
                      View Current Screenshot
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontSize: 11,
                    fontWeight: 800,
                    color: "rgba(255,255,255,0.65)",
                  }}
                >
                  Admin Notes
                </label>

                <textarea
                  value={adminNotes}
                  onChange={(event) => setAdminNotes(event.target.value)}
                  rows={3}
                  placeholder="Optional notes about the battle..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    resize: "vertical",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.22)",
                    color: "white",
                    padding: 11,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              {error && (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,90,90,0.22)",
                    background: "rgba(255,90,90,0.08)",
                    color: "#ffb0b0",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(80,210,110,0.22)",
                    background: "rgba(60,180,90,0.08)",
                    color: "#b8f5c2",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {success}
                </div>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  minHeight: 44,
                  borderRadius: 10,
                  border: "1px solid rgba(211,163,60,0.35)",
                  background: saving
                    ? "rgba(211,163,60,0.08)"
                    : "#d3a33c",
                  color: saving ? "#d3a33c" : "#140909",
                  fontWeight: 900,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.75 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Battle Results"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AttendanceSection({
  label,
  status,
  setStatus,
  replacementName,
  setReplacementName,
}: {
  label: string;
  status: AttendanceStatus;
  setStatus: (value: AttendanceStatus) => void;
  replacementName: string;
  setReplacementName: (value: string) => void;
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        background: "rgba(0,0,0,0.18)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <p
        style={{
          margin: "0 0 10px",
          fontWeight: 900,
          fontSize: 13,
        }}
      >
        {label}
      </p>

      <label
        style={{
          display: "block",
          marginBottom: 6,
          fontSize: 11,
          color: "rgba(255,255,255,0.55)",
          fontWeight: 800,
        }}
      >
        Attendance
      </label>

      <select
        value={status}
        onChange={(event) =>
          setStatus(event.target.value as AttendanceStatus)
        }
        style={{
          width: "100%",
          minHeight: 42,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "#140909",
          color: "white",
          padding: "0 10px",
          fontSize: 13,
          outline: "none",
        }}
      >
        <option value="unmarked">Unmarked</option>
        <option value="attended">Attended</option>
        <option value="no_show">No Show</option>
        <option value="replacement">Replacement</option>
      </select>

      {status === "replacement" && (
        <div style={{ marginTop: 10 }}>
          <label
            style={{
              display: "block",
              marginBottom: 6,
              fontSize: 11,
              color: "rgba(255,255,255,0.55)",
              fontWeight: 800,
            }}
          >
            Replacement Name / TikTok @
          </label>

          <input
            value={replacementName}
            onChange={(event) => setReplacementName(event.target.value)}
            placeholder="@replacement"
            style={{
              width: "100%",
              boxSizing: "border-box",
              minHeight: 42,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#140909",
              color: "white",
              padding: "0 10px",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: 6,
          fontSize: 11,
          fontWeight: 800,
          color: "rgba(255,255,255,0.62)",
        }}
      >
        {label}
      </label>

      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(event) =>
          onChange(event.target.value.replace(/[^\d,]/g, ""))
        }
        placeholder="0"
        style={{
          width: "100%",
          boxSizing: "border-box",
          minHeight: 42,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "#140909",
          color: "white",
          padding: "0 10px",
          fontSize: 13,
          outline: "none",
        }}
      />
    </div>
  );
}
