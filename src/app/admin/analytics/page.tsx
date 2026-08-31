import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import AnalyticsDashboardClient from "./AnalyticsDashboardClient";

export type CreatorStat = {
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

export type AgentTrendPoint = {
  imported_at: string;
  data_period: string | null;

  creators: number;
  diamonds: number;
  matches: number;

  meetingDays: number;
  meetingHours: number;

  complete: number;
  needsAttention: number;

  completionRate: number;
};

export type AgentTrendHistory = Record<
  string,
  AgentTrendPoint[]
>;

type ImportRecord = {
  id: string;
  data_period: string | null;
  creator_count: number | null;
  imported_at: string;
  snapshot_month: string | null;
  is_monthly_snapshot: boolean | null;
};

type HistoricalCreatorRow = {
  id: string;
  username: string;
  manager: string | null;

  diamonds: number | null;
  live_days: number | null;
  live_duration: number | null;
  matches: number | null;

  import_id: string | null;
  imported_at: string;
};

/*
  LOAD LATEST IMPORT
*/

async function getLatestImport(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data, error } = await supabase
    .from("backstage_imports")
    .select(
      `
        id,
        data_period,
        creator_count,
        imported_at,
        snapshot_month,
        is_monthly_snapshot
      `
    )
    .order("imported_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ImportRecord | null;
}

/*
  LOAD CURRENT CREATOR SNAPSHOT
*/

async function getCreatorStatsForImport(
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

/*
  LOAD OFFICIAL MONTHLY SNAPSHOTS
*/

async function getMonthlySnapshots(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data, error } = await supabase
    .from("backstage_imports")
    .select(
      `
        id,
        data_period,
        creator_count,
        imported_at,
        snapshot_month,
        is_monthly_snapshot
      `
    )
    .eq("is_monthly_snapshot", true)
    .order("snapshot_month", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as ImportRecord[];
}

/*
  LOAD CREATOR ROWS
  FOR MONTHLY SNAPSHOTS
*/

async function getHistoricalCreatorRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  importIds: string[]
) {
  if (importIds.length === 0) {
    return [];
  }

  const allRows: HistoricalCreatorRow[] = [];

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
          diamonds,
          live_days,
          live_duration,
          matches,
          import_id,
          imported_at
        `
      )
      .in("import_id", importIds)
      .order("imported_at", {
        ascending: true,
      })
      .range(
        from,
        from + pageSize - 1
      );

    if (error) {
      throw error;
    }

    const page =
      (data ?? []) as HistoricalCreatorRow[];

    allRows.push(...page);

    if (page.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allRows;
}

/*
  BUILD AGENT TREND HISTORY
*/

function buildAgentTrendHistory(
  snapshots: ImportRecord[],
  creatorRows: HistoricalCreatorRow[]
): AgentTrendHistory {
  const snapshotMap = new Map<
    string,
    ImportRecord
  >();

  for (const snapshot of snapshots) {
    snapshotMap.set(
      snapshot.id,
      snapshot
    );
  }

  /*
    Group rows by:
    import -> agent -> creators
  */

  const grouped = new Map<
    string,
    Map<string, HistoricalCreatorRow[]>
  >();

  for (const row of creatorRows) {
    if (!row.import_id) {
      continue;
    }

    if (!snapshotMap.has(row.import_id)) {
      continue;
    }

    const agent =
      row.manager?.trim() ||
      "Unassigned";

    if (!grouped.has(row.import_id)) {
      grouped.set(
        row.import_id,
        new Map()
      );
    }

    const agentMap =
      grouped.get(row.import_id)!;

    if (!agentMap.has(agent)) {
      agentMap.set(agent, []);
    }

    agentMap.get(agent)!.push(row);
  }

  const history: AgentTrendHistory = {};

  /*
    Process snapshots chronologically
  */

  for (const snapshot of snapshots) {
    const agentMap =
      grouped.get(snapshot.id);

    if (!agentMap) {
      continue;
    }

    for (const [
      agent,
      creators,
    ] of agentMap.entries()) {
      const creatorCount =
        creators.length;

      const diamonds =
        creators.reduce(
          (sum, creator) =>
            sum +
            Number(
              creator.diamonds ?? 0
            ),
          0
        );

      const matches =
        creators.reduce(
          (sum, creator) =>
            sum +
            Number(
              creator.matches ?? 0
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
              creator.live_duration ??
                0
            ) >= 25
        ).length;

      const complete =
        creators.filter(
          (creator) =>
            Number(
              creator.live_days ?? 0
            ) >= 12 &&
            Number(
              creator.live_duration ??
                0
            ) >= 25
        ).length;

      const needsAttention =
        creatorCount - complete;

      const completionRate =
        creatorCount > 0
          ? (complete /
              creatorCount) *
            100
          : 0;

      const point: AgentTrendPoint = {
        imported_at:
          snapshot.imported_at,

        data_period:
          snapshot.data_period,

        creators:
          creatorCount,

        diamonds,

        matches,

        meetingDays,

        meetingHours,

        complete,

        needsAttention,

        completionRate,
      };

      if (!history[agent]) {
        history[agent] = [];
      }

      history[agent].push(point);
    }
  }

  /*
    Guarantee chronological order
  */

  for (const agent of Object.keys(
    history
  )) {
    history[agent].sort(
      (a, b) =>
        new Date(
          a.imported_at
        ).getTime() -
        new Date(
          b.imported_at
        ).getTime()
    );
  }

  return history;
}

export default async function AnalyticsPage() {
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
    LOAD ANALYTICS DATA
  */

  let latestImportRecord:
    | ImportRecord
    | null = null;

  let creators: CreatorStat[] = [];

  let agentTrendHistory:
    AgentTrendHistory = {};

  let loadError:
    | string
    | null = null;

  try {
    /*
      CURRENT DASHBOARD SNAPSHOT
    */

    latestImportRecord =
      await getLatestImport(
        supabase
      );

    if (latestImportRecord) {
      creators =
        await getCreatorStatsForImport(
          supabase,
          latestImportRecord.id
        );
    }

    /*
      OFFICIAL MONTHLY HISTORY
    */

    const monthlySnapshots =
      await getMonthlySnapshots(
        supabase
      );

    const monthlyImportIds =
      monthlySnapshots.map(
        (snapshot) =>
          snapshot.id
      );

    const historicalCreatorRows =
      await getHistoricalCreatorRows(
        supabase,
        monthlyImportIds
      );

    agentTrendHistory =
      buildAgentTrendHistory(
        monthlySnapshots,
        historicalCreatorRows
      );
  } catch (error) {
    console.error(
      "Analytics load error:",
      error
    );

    loadError =
      error instanceof Error
        ? error.message
        : "Unable to load analytics.";
  }

  /*
    ERROR STATE
  */

  if (loadError) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-red-500">
                Royals Bloodline
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Analytics
              </h1>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/analytics/imports"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Import History
              </Link>

              <Link
                href="/admin/analytics/upload"
                className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                Upload Backstage Data
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {loadError}
          </div>
        </div>
      </main>
    );
  }

  /*
    EMPTY STATE
  */

  if (!latestImportRecord) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-red-500">
                Royals Bloodline
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Analytics
              </h1>
            </div>

            <Link
              href="/admin/analytics/upload"
              className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
            >
              Upload Backstage Data
            </Link>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <h2 className="text-xl font-bold">
              No Backstage Data
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              Upload a Backstage report to begin viewing analytics.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
    CURRENT SNAPSHOT
  */

  const latestImport =
    latestImportRecord.imported_at;

  /*
    agentTrendHistory is now ready.

    We will pass this into
    AnalyticsDashboardClient
    in the next step after
    that component accepts
    the new prop.
  */

  void agentTrendHistory;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 pt-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-red-500">
              Royals Bloodline
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Analytics
            </h1>

            {latestImportRecord.data_period && (
              <p className="mt-2 text-sm text-gray-500">
                Data period:{" "}
                {latestImportRecord.data_period}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/analytics/imports"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Import History
            </Link>

            <Link
              href="/admin/analytics/upload"
              className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
            >
              Upload Backstage Data
            </Link>
          </div>
        </div>
      </div>

      <AnalyticsDashboardClient
  creators={creators}
  latestImport={latestImport}
  agentTrendHistory={agentTrendHistory}
/>
    </main>
  );
}