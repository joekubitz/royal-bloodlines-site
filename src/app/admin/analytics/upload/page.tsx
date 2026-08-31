"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

type CreatorRow = {
  username: string;
  manager: string;
  days_since_joining: number;
  diamonds: number;
  live_days: number;
  live_duration: number;
  matches: number;
  diamonds_from_matches: number;
  last_month_diamonds: number;
  last_month_days: number;
  last_month_hours: number;
};

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function cleanNumber(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  const parsed = Number(cleaned);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function parseDurationToHours(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  const text = String(value)
    .trim()
    .toLowerCase();

  if (!text) {
    return 0;
  }

  /*
    If TikTok already gives us
    a plain decimal number.
  */

  if (/^\d+(\.\d+)?$/.test(text)) {
    return Number(text);
  }

  /*
    TikTok duration examples:

    103h 36m 2s
    24h 15m
    45m 20s
  */

  let totalHours = 0;

  const hourMatch = text.match(
    /(\d+(?:\.\d+)?)\s*h/
  );

  const minuteMatch = text.match(
    /(\d+(?:\.\d+)?)\s*m/
  );

  const secondMatch = text.match(
    /(\d+(?:\.\d+)?)\s*s/
  );

  if (hourMatch) {
    totalHours += Number(
      hourMatch[1]
    );
  }

  if (minuteMatch) {
    totalHours +=
      Number(minuteMatch[1]) / 60;
  }

  if (secondMatch) {
    totalHours +=
      Number(secondMatch[1]) / 3600;
  }

  return totalHours;
}

function findHeaderIndex(
  headers: unknown[],
  target: string
) {
  const normalizedTarget =
    normalizeHeader(target);

  return headers.findIndex(
    (header) =>
      normalizeHeader(header) ===
      normalizedTarget
  );
}

export default function AnalyticsUploadPage() {
  const [rows, setRows] =
    useState<CreatorRow[]>([]);

  const [fileName, setFileName] =
    useState("");

  const [dataPeriod, setDataPeriod] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [uploading, setUploading] =
    useState(false);

  async function handleFile(
    file: File
  ) {
    setError("");
    setSuccess("");
    setRows([]);
    setDataPeriod("");
    setFileName(file.name);

    try {
      /*
        READ SPREADSHEET
      */

      const buffer =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(buffer);

      const sheetName =
        workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error(
          "No worksheet found in the file."
        );
      }

      const sheet =
        workbook.Sheets[sheetName];

      const rawRows =
        XLSX.utils.sheet_to_json<
          unknown[]
        >(sheet, {
          header: 1,
          defval: "",
          raw: false,
        });

      if (rawRows.length < 2) {
        throw new Error(
          "The spreadsheet does not contain creator data."
        );
      }

      /*
        HEADER ROW
      */

      const headers =
        rawRows[0];

      /*
        FIND EXACT TIKTOK
        BACKSTAGE HEADERS
      */

      const dataPeriodIndex =
        findHeaderIndex(
          headers,
          "Data period"
        );

      const usernameIndex =
        findHeaderIndex(
          headers,
          "Creator's username"
        );

      const managerIndex =
        findHeaderIndex(
          headers,
          "Creator Network manager"
        );

      const daysSinceJoiningIndex =
        findHeaderIndex(
          headers,
          "Days since joining"
        );

      const diamondsIndex =
        findHeaderIndex(
          headers,
          "Diamonds"
        );

      const durationIndex =
        findHeaderIndex(
          headers,
          "LIVE duration"
        );

      const daysIndex =
        findHeaderIndex(
          headers,
          "Valid go LIVE days"
        );

      const matchesIndex =
        findHeaderIndex(
          headers,
          "Matches"
        );

      const diamondsFromMatchesIndex =
        findHeaderIndex(
          headers,
          "Diamonds from matches"
        );

      const lastMonthDiamondsIndex =
        findHeaderIndex(
          headers,
          "Diamonds last month"
        );

      const lastMonthHoursIndex =
        findHeaderIndex(
          headers,
          "LIVE duration (hours) last month"
        );

      const lastMonthDaysIndex =
        findHeaderIndex(
          headers,
          "Valid go LIVE days last month"
        );

      /*
        VERIFY REQUIRED COLUMNS
      */

      const missingHeaders: string[] =
        [];

      if (dataPeriodIndex === -1) {
        missingHeaders.push(
          "Data period"
        );
      }

      if (usernameIndex === -1) {
        missingHeaders.push(
          "Creator's username"
        );
      }

      if (managerIndex === -1) {
        missingHeaders.push(
          "Creator Network manager"
        );
      }

      if (
        daysSinceJoiningIndex === -1
      ) {
        missingHeaders.push(
          "Days since joining"
        );
      }

      if (diamondsIndex === -1) {
        missingHeaders.push(
          "Diamonds"
        );
      }

      if (durationIndex === -1) {
        missingHeaders.push(
          "LIVE duration"
        );
      }

      if (daysIndex === -1) {
        missingHeaders.push(
          "Valid go LIVE days"
        );
      }

      if (matchesIndex === -1) {
        missingHeaders.push(
          "Matches"
        );
      }

      if (
        diamondsFromMatchesIndex === -1
      ) {
        missingHeaders.push(
          "Diamonds from matches"
        );
      }

      if (
        lastMonthDiamondsIndex === -1
      ) {
        missingHeaders.push(
          "Diamonds last month"
        );
      }

      if (
        lastMonthHoursIndex === -1
      ) {
        missingHeaders.push(
          "LIVE duration (hours) last month"
        );
      }

      if (
        lastMonthDaysIndex === -1
      ) {
        missingHeaders.push(
          "Valid go LIVE days last month"
        );
      }

      if (
        missingHeaders.length > 0
      ) {
        throw new Error(
          `Missing required columns: ${missingHeaders.join(
            ", "
          )}`
        );
      }

      /*
        FIND DATA PERIOD

        TikTok normally repeats the
        Data period on every creator row.

        We grab the first non-empty one.
      */

      let detectedDataPeriod = "";

      for (
        let i = 1;
        i < rawRows.length;
        i++
      ) {
        const period = String(
          rawRows[i]?.[
            dataPeriodIndex
          ] ?? ""
        ).trim();

        if (period) {
          detectedDataPeriod =
            period;
          break;
        }
      }

      if (!detectedDataPeriod) {
        throw new Error(
          "The spreadsheet contains a Data period column, but no data period value was found."
        );
      }

      /*
        PARSE CREATOR DATA
      */

      const parsedRows: CreatorRow[] =
        rawRows
          .slice(1)
          .map((row) => {
            const username = String(
              row[
                usernameIndex
              ] ?? ""
            )
              .trim()
              .replace(/^@/, "");

            const manager = String(
              row[
                managerIndex
              ] ?? ""
            ).trim();

            return {
              username,

              manager,

              days_since_joining:
                Math.round(
                  cleanNumber(
                    row[
                      daysSinceJoiningIndex
                    ]
                  )
                ),

              diamonds:
                Math.round(
                  cleanNumber(
                    row[
                      diamondsIndex
                    ]
                  )
                ),

              live_days:
                cleanNumber(
                  row[
                    daysIndex
                  ]
                ),

              live_duration:
                parseDurationToHours(
                  row[
                    durationIndex
                  ]
                ),

              matches:
                Math.round(
                  cleanNumber(
                    row[
                      matchesIndex
                    ]
                  )
                ),

              diamonds_from_matches:
                Math.round(
                  cleanNumber(
                    row[
                      diamondsFromMatchesIndex
                    ]
                  )
                ),

              last_month_diamonds:
                Math.round(
                  cleanNumber(
                    row[
                      lastMonthDiamondsIndex
                    ]
                  )
                ),

              last_month_days:
                cleanNumber(
                  row[
                    lastMonthDaysIndex
                  ]
                ),

              last_month_hours:
                parseDurationToHours(
                  row[
                    lastMonthHoursIndex
                  ]
                ),
            };
          })
          .filter(
            (row) =>
              row.username.length > 0
          );

      if (
        parsedRows.length === 0
      ) {
        throw new Error(
          "No creators with usernames were found."
        );
      }

      /*
        STORE PREVIEW
      */

      setDataPeriod(
        detectedDataPeriod
      );

      setRows(parsedRows);
    } catch (err) {
      console.error(err);

      setRows([]);
      setDataPeriod("");

      setError(
        err instanceof Error
          ? err.message
          : "Unable to read spreadsheet."
      );
    }
  }

  async function publishImport() {
    if (
      rows.length === 0 ||
      uploading
    ) {
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      /*
        SEND ROWS + DATA PERIOD
        TO IMPORT API
      */

      const response =
        await fetch(
          "/api/admin/backstage-import",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              rows,
              dataPeriod,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to import creator data."
        );
      }

      setSuccess(
        `${Number(
          result.count ??
            rows.length
        ).toLocaleString()} creators imported successfully.${
          dataPeriod
            ? ` Data period: ${dataPeriod}.`
            : ""
        }`
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to import creator data."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}

        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-red-500">
            Royals Bloodline
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Upload Backstage Data
          </h1>

          <p className="mt-2 text-gray-400">
            Upload the TikTok LIVE
            Backstage creator report.
          </p>
        </div>

        {/* FILE UPLOAD */}

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <label className="block">
            <span className="text-sm font-semibold">
              Backstage Spreadsheet
            </span>

            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(
                event
              ) => {
                const file =
                  event.target
                    .files?.[0];

                if (file) {
                  handleFile(
                    file
                  );
                }
              }}
              className="mt-3 block w-full rounded-xl border border-white/10 bg-black p-4 text-sm text-gray-300"
            />
          </label>

          {fileName && (
            <p className="mt-3 text-sm text-gray-500">
              Selected:{" "}
              {fileName}
            </p>
          )}

          {dataPeriod && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2">
              <span className="text-xs uppercase tracking-wider text-gray-400">
                Data Period
              </span>

              <span className="text-sm font-semibold text-red-300">
                {dataPeriod}
              </span>
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
              {success}
            </div>
          )}
        </div>

        {/* PREVIEW */}

        {rows.length > 0 && (
          <>
            <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  Review Import
                </h2>

                <p className="mt-1 text-gray-400">
                  {rows.length.toLocaleString()}{" "}
                  creators detected.
                </p>

                {dataPeriod && (
                  <p className="mt-1 text-sm text-gray-500">
                    Reporting period:{" "}
                    <span className="font-medium text-gray-300">
                      {dataPeriod}
                    </span>
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={
                  uploading
                }
                onClick={
                  publishImport
                }
                className="rounded-xl bg-red-700 px-6 py-3 font-semibold transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading
                  ? "Importing..."
                  : "Import Creator Data"}
              </button>
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[1650px] text-sm">
                <thead className="bg-white/10 text-left">
                  <tr>
                    <th className="p-4">
                      Creator
                    </th>

                    <th className="p-4">
                      Agent
                    </th>

                    <th className="p-4">
                      Days Since
                      Joining
                    </th>

                    <th className="p-4">
                      Diamonds
                    </th>

                    <th className="p-4">
                      Days
                    </th>

                    <th className="p-4">
                      Hours
                    </th>

                    <th className="p-4">
                      Matches
                    </th>

                    <th className="p-4">
                      Match Diamonds
                    </th>

                    <th className="p-4">
                      Last Month
                      Diamonds
                    </th>

                    <th className="p-4">
                      Last Month Days
                    </th>

                    <th className="p-4">
                      Last Month Hours
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows
                    .slice(0, 50)
                    .map(
                      (
                        creator,
                        index
                      ) => (
                        <tr
                          key={`${creator.username}-${index}`}
                          className="border-t border-white/10"
                        >
                          <td className="p-4 font-semibold">
                            @
                            {
                              creator.username
                            }
                          </td>

                          <td className="p-4">
                            {creator.manager ||
                              "—"}
                          </td>

                          <td className="p-4">
                            {creator.days_since_joining.toLocaleString()}
                          </td>

                          <td className="p-4">
                            {creator.diamonds.toLocaleString()}
                          </td>

                          <td className="p-4">
                            {
                              creator.live_days
                            }
                          </td>

                          <td className="p-4">
                            {creator.live_duration.toFixed(
                              2
                            )}
                          </td>

                          <td className="p-4">
                            {creator.matches.toLocaleString()}
                          </td>

                          <td className="p-4">
                            {creator.diamonds_from_matches.toLocaleString()}
                          </td>

                          <td className="p-4">
                            {creator.last_month_diamonds.toLocaleString()}
                          </td>

                          <td className="p-4">
                            {
                              creator.last_month_days
                            }
                          </td>

                          <td className="p-4">
                            {creator.last_month_hours.toFixed(
                              2
                            )}
                          </td>
                        </tr>
                      )
                    )}
                </tbody>
              </table>
            </div>

            {rows.length >
              50 && (
              <p className="mt-3 text-sm text-gray-500">
                Previewing the
                first 50 of{" "}
                {rows.length.toLocaleString()}{" "}
                creators.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}