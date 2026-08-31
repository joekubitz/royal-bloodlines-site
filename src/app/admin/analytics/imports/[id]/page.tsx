import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";

type ImportRecord = {
  id: string;
  data_period: string | null;
  creator_count: number | null;
  imported_at: string;
};

type CreatorStat = {
  id: string;
  username: string;
  manager: string | null;
  days_since_joining: number | null;
  diamonds: number | null;
  live_days: number | null;
  live_duration: number | null;
  matches: number | null;
  diamonds_from_matches: number | null;
  last_month_diamonds: number | null;
  last_month_days: number | null;
  last_month_hours: number | null;
  imported_at: string;
  import_id: string | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

async function getImportCreators(
  supabase: Awaited<ReturnType<typeof createClient>>,
  importId: string
) {
  const allRows: CreatorStat[] = [];

  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("backstage_creator_stats")
      .select(
        `
          id,
          username,
          manager,
          days_since_joining,
          diamonds,
          live_days,
          live_duration,
          matches,
          diamonds_from_matches,
          last_month_diamonds,
          last_month_days,
          last_month_hours,
          imported_at,
          import_id
        `
      )
      .eq("import_id", importId)
      .order("diamonds", {
        ascending: false,
      })
      .range(
        from,
        from + pageSize - 1
      );

    if (error) {
      throw error;
    }

    const page =
      (data ?? []) as CreatorStat[];

    allRows.push(...page);

    if (page.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allRows;
}

export default async function ImportSnapshotPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  const supabase =
    await createClient();

  /*
    AUTH
  */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userRole } =
    await supabase
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
    LOAD IMPORT RECORD
  */

  const {
    data: importRecord,
    error: importError,
  } = await supabase
    .from("backstage_imports")
    .select(
      `
        id,
        data_period,
        creator_count,
        imported_at
      `
    )
    .eq("id", id)
    .single();

  if (
    importError ||
    !importRecord
  ) {
    notFound();
  }

  /*
    LOAD CREATORS
  */

  let creators: CreatorStat[] = [];
  let loadError: string | null =
    null;

  try {
    creators =
      await getImportCreators(
        supabase,
        id
      );
  } catch (error) {
    console.error(
      "Import snapshot load error:",
      error
    );

    loadError =
      error instanceof Error
        ? error.message
        : "Unable to load import snapshot.";
  }

  /*
    SUMMARY STATS
  */

  const totalDiamonds =
    creators.reduce(
      (sum, creator) =>
        sum +
        Number(
          creator.diamonds ?? 0
        ),
      0
    );

  const totalMatches =
    creators.reduce(
      (sum, creator) =>
        sum +
        Number(
          creator.matches ?? 0
        ),
      0
    );

  const totalMatchDiamonds =
    creators.reduce(
      (sum, creator) =>
        sum +
        Number(
          creator.diamonds_from_matches ?? 0
        ),
      0
    );

  const meetingDays =
    creators.filter(
      (creator) =>
        Number(
          creator.live_days ?? 0
        ) >= 12
    ).length;

  const meetingHours =
    creators.filter(
      (creator) =>
        Number(
          creator.live_duration ?? 0
        ) >= 25
    ).length;

  const complete =
    creators.filter(
      (creator) =>
        Number(
          creator.live_days ?? 0
        ) >= 12 &&
        Number(
          creator.live_duration ?? 0
        ) >= 25
    ).length;

  const needsAttention =
    creators.length -
    complete;

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}

        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-red-500">
              Royals Bloodline
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Import Snapshot
            </h1>

            <p className="mt-2 text-gray-400">
              Historical TikTok LIVE
              Backstage analytics.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {importRecord.data_period ||
                  "Unknown data period"}
              </span>

              <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300">
                Imported{" "}
                {formatDate(
                  importRecord.imported_at
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/analytics/imports"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
            >
              Import History
            </Link>

            <Link
              href="/admin/analytics"
              className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold transition hover:bg-red-600"
            >
              Current Analytics
            </Link>
          </div>
        </div>

        {/* ERROR */}

        {loadError && (
          <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {loadError}
          </div>
        )}

        {!loadError && (
          <>
            {/* SUMMARY */}

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-gray-400">
                  Creators
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {creators.length.toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-gray-400">
                  Diamonds
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {totalDiamonds.toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-gray-400">
                  Matches
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {totalMatches.toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-gray-400">
                  Match Diamonds
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {totalMatchDiamonds.toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-gray-400">
                  Meet 12 Days
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {meetingDays.toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-gray-400">
                  Meet 25 Hours
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {meetingHours.toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-5">
                <p className="text-sm text-green-300">
                  Complete
                </p>

                <p className="mt-2 text-3xl font-bold text-green-300">
                  {complete.toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
                <p className="text-sm text-red-300">
                  Need Attention
                </p>

                <p className="mt-2 text-3xl font-bold text-red-300">
                  {needsAttention.toLocaleString()}
                </p>
              </div>
            </div>

            {/* CREATOR TABLE */}

            <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
              <div className="border-b border-white/10 bg-white/5 px-6 py-5">
                <h2 className="text-xl font-bold">
                  Creator Snapshot
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  Exact creator data stored
                  with this Backstage import.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1450px] text-sm">
                  <thead className="bg-white/5 text-left text-gray-400">
                    <tr>
                      <th className="px-5 py-4">
                        Creator
                      </th>

                      <th className="px-5 py-4">
                        Agent
                      </th>

                      <th className="px-5 py-4">
                        Diamonds
                      </th>

                      <th className="px-5 py-4">
                        Days
                      </th>

                      <th className="px-5 py-4">
                        Hours
                      </th>

                      <th className="px-5 py-4">
                        Matches
                      </th>

                      <th className="px-5 py-4">
                        Match Diamonds
                      </th>

                      <th className="px-5 py-4">
                        Last Month
                        Diamonds
                      </th>

                      <th className="px-5 py-4">
                        Last Month Days
                      </th>

                      <th className="px-5 py-4">
                        Last Month Hours
                      </th>

                      <th className="px-5 py-4">
                        Requirement
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {creators.map(
                      (creator) => {
                        const meetsDays =
                          Number(
                            creator.live_days ??
                              0
                          ) >= 12;

                        const meetsHours =
                          Number(
                            creator.live_duration ??
                              0
                          ) >= 25;

                        let requirement =
                          "Complete";

                        if (
                          !meetsDays &&
                          !meetsHours
                        ) {
                          requirement =
                            "Needs Both";
                        } else if (
                          !meetsDays
                        ) {
                          requirement =
                            "Needs Days";
                        } else if (
                          !meetsHours
                        ) {
                          requirement =
                            "Needs Hours";
                        }

                        return (
                          <tr
                            key={creator.id}
                            className="border-t border-white/10 transition hover:bg-white/[0.03]"
                          >
                            <td className="px-5 py-4 font-semibold">
                              @
                              {
                                creator.username
                              }
                            </td>

                            <td className="px-5 py-4 text-gray-300">
                              {creator.manager ||
                                "—"}
                            </td>

                            <td className="px-5 py-4">
                              {Number(
                                creator.diamonds ??
                                  0
                              ).toLocaleString()}
                            </td>

                            <td className="px-5 py-4">
                              {Number(
                                creator.live_days ??
                                  0
                              )}
                            </td>

                            <td className="px-5 py-4">
                              {Number(
                                creator.live_duration ??
                                  0
                              ).toFixed(
                                2
                              )}
                            </td>

                            <td className="px-5 py-4">
                              {Number(
                                creator.matches ??
                                  0
                              ).toLocaleString()}
                            </td>

                            <td className="px-5 py-4">
                              {Number(
                                creator.diamonds_from_matches ??
                                  0
                              ).toLocaleString()}
                            </td>

                            <td className="px-5 py-4">
                              {Number(
                                creator.last_month_diamonds ??
                                  0
                              ).toLocaleString()}
                            </td>

                            <td className="px-5 py-4">
                              {Number(
                                creator.last_month_days ??
                                  0
                              )}
                            </td>

                            <td className="px-5 py-4">
                              {Number(
                                creator.last_month_hours ??
                                  0
                              ).toFixed(
                                2
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                  requirement ===
                                  "Complete"
                                    ? "border border-green-500/30 bg-green-500/10 text-green-300"
                                    : requirement ===
                                      "Needs Both"
                                    ? "border border-red-500/30 bg-red-500/10 text-red-300"
                                    : "border border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                                }`}
                              >
                                {
                                  requirement
                                }
                              </span>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}