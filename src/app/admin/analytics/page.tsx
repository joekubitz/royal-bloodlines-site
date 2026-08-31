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
};

async function getAllCreatorStats(
  supabase: Awaited<ReturnType<typeof createClient>>
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
          imported_at
        `
      )
      .order("imported_at", {
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
    LOAD DATA
  */

  let allRows: CreatorStat[] = [];
  let loadError: string | null =
    null;

  try {
    allRows =
      await getAllCreatorStats(
        supabase
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

  if (loadError) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">

          <h1 className="text-3xl font-bold">
            Analytics
          </h1>

          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {loadError}
          </div>

        </div>
      </main>
    );
  }

  /*
    NEWEST SNAPSHOT
    PER CREATOR
  */

  const latestByCreator =
    new Map<
      string,
      CreatorStat
    >();

  for (const row of allRows) {
    const key = row.username
      .toLowerCase()
      .trim();

    if (
      !latestByCreator.has(key)
    ) {
      latestByCreator.set(
        key,
        row
      );
    }
  }

  const creators =
    Array.from(
      latestByCreator.values()
    );

  const latestImport =
    allRows.length > 0
      ? allRows[0].imported_at
      : null;

  return (
    <AnalyticsDashboardClient
      creators={creators}
      latestImport={latestImport}
    />
  );
}