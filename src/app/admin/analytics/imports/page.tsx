import Link from "next/link";
import {
  redirect,
} from "next/navigation";
import {
  revalidatePath,
} from "next/cache";
import { createClient } from "@/app/supabase/server";

type ImportRecord = {
  id: string;
  data_period: string | null;
  creator_count: number | null;
  uploaded_by: string | null;
  imported_at: string;
  created_at: string;
  snapshot_month: string | null;
  is_monthly_snapshot: boolean | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(new Date(value));
}

function getSnapshotMonth(
  dataPeriod: string | null
) {
  if (!dataPeriod) {
    return null;
  }

  /*
    TikTok example:

    2026-08-01 ~ 2026-08-29

    We use the END date to decide
    which month the snapshot belongs to.
  */

  const matches =
    dataPeriod.match(
      /\d{4}-\d{2}-\d{2}/g
    );

  if (
    !matches ||
    matches.length === 0
  ) {
    return null;
  }

  const date =
    matches[matches.length - 1];

  const [
    year,
    month,
  ] = date.split("-");

  if (!year || !month) {
    return null;
  }

  return `${year}-${month}-01`;
}

function formatSnapshotMonth(
  value: string | null
) {
  if (!value) {
    return "Unknown Month";
  }

  /*
    Add noon so timezone conversion
    does not move the date backward.
  */

  const date =
    new Date(
      `${value}T12:00:00`
    );

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      year: "numeric",
    }
  ).format(date);
}

/*
  SERVER ACTION:
  MARK MONTHLY SNAPSHOT
*/

async function markMonthlySnapshot(
  formData: FormData
) {
  "use server";

  const importId =
    String(
      formData.get("importId") ??
        ""
    ).trim();

  if (!importId) {
    return;
  }

  const supabase =
    await createClient();

  /*
    AUTH
  */

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: userRole,
  } = await supabase
    .from("user_roles")
    .select("role, status")
    .eq("user_id", user.id)
    .single();

  if (
    !userRole ||
    userRole.role !== "admin" ||
    userRole.status !== "active"
  ) {
    redirect("/");
  }

  /*
    GET IMPORT
  */

  const {
    data: importRecord,
    error: importError,
  } = await supabase
    .from("backstage_imports")
    .select(
      `
        id,
        data_period
      `
    )
    .eq("id", importId)
    .single();

  if (
    importError ||
    !importRecord
  ) {
    console.error(
      "Unable to find import:",
      importError
    );

    return;
  }

  /*
    DETERMINE MONTH
  */

  const snapshotMonth =
    getSnapshotMonth(
      importRecord.data_period
    );

  if (!snapshotMonth) {
    console.error(
      "Unable to determine snapshot month."
    );

    return;
  }

  /*
    CHECK WHETHER THIS MONTH
    ALREADY HAS AN OFFICIAL
    SNAPSHOT
  */

  const {
    data: existingSnapshot,
    error:
      existingSnapshotError,
  } = await supabase
    .from("backstage_imports")
    .select("id")
    .eq(
      "snapshot_month",
      snapshotMonth
    )
    .eq(
      "is_monthly_snapshot",
      true
    )
    .maybeSingle();

  if (
    existingSnapshotError
  ) {
    console.error(
      "Snapshot check error:",
      existingSnapshotError
    );

    return;
  }

  /*
    DO NOT CREATE A SECOND
    OFFICIAL SNAPSHOT FOR
    THE SAME MONTH
  */

  if (
    existingSnapshot &&
    existingSnapshot.id !==
      importId
  ) {
    return;
  }

  /*
    MARK IMPORT
  */

  const {
    error: updateError,
  } = await supabase
    .from("backstage_imports")
    .update({
      snapshot_month:
        snapshotMonth,
      is_monthly_snapshot:
        true,
    })
    .eq("id", importId);

  if (updateError) {
    console.error(
      "Monthly snapshot update error:",
      updateError
    );

    return;
  }

  revalidatePath(
    "/admin/analytics/imports"
  );
}

/*
  PAGE
*/

export default async function ImportHistoryPage() {
  const supabase =
    await createClient();

  /*
    AUTH
  */

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: userRole,
  } = await supabase
    .from("user_roles")
    .select("role, status")
    .eq("user_id", user.id)
    .single();

  if (
    !userRole ||
    userRole.role !== "admin" ||
    userRole.status !== "active"
  ) {
    redirect("/");
  }

  /*
    LOAD IMPORT HISTORY
  */

  const {
    data,
    error,
  } = await supabase
    .from("backstage_imports")
    .select(
      `
        id,
        data_period,
        creator_count,
        uploaded_by,
        imported_at,
        created_at,
        snapshot_month,
        is_monthly_snapshot
      `
    )
    .order("imported_at", {
      ascending: false,
    });

  const imports =
    (data ??
      []) as ImportRecord[];

  /*
    MONTHS THAT ALREADY
    HAVE OFFICIAL SNAPSHOTS
  */

  const officialMonths =
    new Map<
      string,
      string
    >();

  for (const item of imports) {
    if (
      item.is_monthly_snapshot &&
      item.snapshot_month
    ) {
      officialMonths.set(
        item.snapshot_month,
        item.id
      );
    }
  }

  const monthlySnapshots =
    imports.filter(
      (item) =>
        item.is_monthly_snapshot
    );

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}

        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-red-500">
              Royals Bloodline
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Import History
            </h1>

            <p className="mt-2 text-gray-400">
              Review previous TikTok
              LIVE Backstage data
              imports and manage
              official monthly
              snapshots.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/analytics"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
            >
              Back to Analytics
            </Link>

            <Link
              href="/admin/analytics/upload"
              className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold transition hover:bg-red-600"
            >
              Upload New Report
            </Link>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error.message}
          </div>
        )}

        {!error && (
          <>
            {/* SUMMARY */}

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-gray-400">
                  Total Imports
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {imports.length.toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-gray-400">
                  Monthly Snapshots
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {monthlySnapshots.length.toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-gray-400">
                  Latest Creator Count
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {Number(
                    imports[0]
                      ?.creator_count ??
                      0
                  ).toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-gray-400">
                  Latest Import
                </p>

                <p className="mt-2 text-lg font-bold">
                  {imports[0]
                    ? formatDate(
                        imports[0]
                          .imported_at
                      )
                    : "No imports yet"}
                </p>
              </div>
            </div>

            {/* MONTHLY SNAPSHOTS */}

            {monthlySnapshots.length >
              0 && (
              <div className="mt-8 rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.04] p-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-yellow-500">
                    Official Reports
                  </p>

                  <h2 className="mt-2 text-xl font-bold">
                    Monthly Snapshots
                  </h2>

                  <p className="mt-1 text-sm text-gray-400">
                    These reports are
                    preserved as the
                    official month-end
                    analytics records.
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {monthlySnapshots.map(
                    (snapshot) => (
                      <Link
                        key={
                          snapshot.id
                        }
                        href={`/admin/analytics/imports/${snapshot.id}`}
                        className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 transition hover:bg-yellow-500/20"
                      >
                        <p className="text-sm font-bold text-yellow-300">
                          {formatSnapshotMonth(
                            snapshot.snapshot_month
                          )}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          {Number(
                            snapshot.creator_count ??
                              0
                          ).toLocaleString()}{" "}
                          creators
                        </p>
                      </Link>
                    )
                  )}
                </div>
              </div>
            )}

            {/* HISTORY */}

            <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
              <div className="border-b border-white/10 bg-white/5 px-6 py-5">
                <h2 className="text-xl font-bold">
                  Backstage Uploads
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  Each upload is
                  preserved as its own
                  analytics snapshot.
                  Choose one report per
                  month as the official
                  monthly snapshot.
                </p>
              </div>

              {imports.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-lg font-semibold">
                    No imports yet
                  </p>

                  <p className="mt-2 text-sm text-gray-400">
                    Upload a Backstage
                    report to create your
                    first snapshot.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-sm">
                    <thead className="bg-white/5 text-left text-gray-400">
                      <tr>
                        <th className="px-6 py-4 font-medium">
                          Data Period
                        </th>

                        <th className="px-6 py-4 font-medium">
                          Creators
                        </th>

                        <th className="px-6 py-4 font-medium">
                          Imported
                        </th>

                        <th className="px-6 py-4 font-medium">
                          Monthly
                          Snapshot
                        </th>

                        <th className="px-6 py-4 text-right font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {imports.map(
                        (
                          item,
                          index
                        ) => {
                          const month =
                            getSnapshotMonth(
                              item.data_period
                            );

                          const officialId =
                            month
                              ? officialMonths.get(
                                  month
                                )
                              : undefined;

                          const monthTaken =
                            Boolean(
                              officialId
                            );

                          const isOfficial =
                            Boolean(
                              item.is_monthly_snapshot
                            );

                          return (
                            <tr
                              key={
                                item.id
                              }
                              className="border-t border-white/10 transition hover:bg-white/[0.03]"
                            >
                              {/* PERIOD */}

                              <td className="px-6 py-5">
                                <div className="flex flex-wrap items-center gap-3">
                                  {index ===
                                    0 && (
                                    <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-300">
                                      Latest
                                    </span>
                                  )}

                                  {isOfficial && (
                                    <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-xs font-semibold text-yellow-300">
                                      Official
                                    </span>
                                  )}

                                  <span className="font-semibold">
                                    {item.data_period ||
                                      "Unknown period"}
                                  </span>
                                </div>
                              </td>

                              {/* CREATORS */}

                              <td className="px-6 py-5 font-medium">
                                {Number(
                                  item.creator_count ??
                                    0
                                ).toLocaleString()}
                              </td>

                              {/* IMPORT DATE */}

                              <td className="px-6 py-5 text-gray-300">
                                {formatDate(
                                  item.imported_at
                                )}
                              </td>

                              {/* MONTHLY STATUS */}

                              <td className="px-6 py-5">
                                {isOfficial ? (
                                  <div>
                                    <p className="font-semibold text-yellow-300">
                                      Official
                                      Snapshot
                                    </p>

                                    <p className="mt-1 text-xs text-gray-500">
                                      {formatSnapshotMonth(
                                        item.snapshot_month
                                      )}
                                    </p>
                                  </div>
                                ) : monthTaken ? (
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">
                                      Month Already
                                      Set
                                    </p>

                                    <p className="mt-1 text-xs text-gray-600">
                                      {formatSnapshotMonth(
                                        month
                                      )}
                                    </p>
                                  </div>
                                ) : month ? (
                                  <form
                                    action={
                                      markMonthlySnapshot
                                    }
                                  >
                                    <input
                                      type="hidden"
                                      name="importId"
                                      value={
                                        item.id
                                      }
                                    />

                                    <button
                                      type="submit"
                                      className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs font-semibold text-yellow-300 transition hover:bg-yellow-500/20"
                                    >
                                      Mark as
                                      Monthly
                                      Snapshot
                                    </button>
                                  </form>
                                ) : (
                                  <span className="text-gray-600">
                                    Unable to
                                    determine
                                    month
                                  </span>
                                )}
                              </td>

                              {/* ACTIONS */}

                              <td className="px-6 py-5 text-right">
                                <Link
                                  href={`/admin/analytics/imports/${item.id}`}
                                  className="inline-flex rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
                                >
                                  View Import
                                </Link>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}