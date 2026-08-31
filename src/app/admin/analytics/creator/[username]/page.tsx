import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import CreatorPdfDownloadButton from "./CreatorPdfDownloadButton";

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
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getRequirementStatus(
  days: number,
  hours: number
) {
  const meetsDays = days >= 12;
  const meetsHours = hours >= 25;

  if (meetsDays && meetsHours) {
    return {
      label: "Complete",
      className:
        "border-green-500/30 bg-green-500/10 text-green-300",
    };
  }

  if (!meetsDays && !meetsHours) {
    return {
      label: "Needs Both",
      className:
        "border-red-500/30 bg-red-500/10 text-red-300",
    };
  }

  if (!meetsDays) {
    return {
      label: "Needs Days",
      className:
        "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    };
  }

  return {
    label: "Needs Hours",
    className:
      "border-orange-500/30 bg-orange-500/10 text-orange-300",
  };
}

function getDiamondChange(
  current: number,
  previous: number
) {
  if (previous === 0) {
    if (current > 0) {
      return {
        text: "New activity",
        className: "text-green-300",
      };
    }

    return {
      text: "No change",
      className: "text-gray-500",
    };
  }

  const percent =
    ((current - previous) / previous) * 100;

  if (Math.abs(percent) < 0.1) {
    return {
      text: "No change",
      className: "text-gray-500",
    };
  }

  if (percent > 0) {
    return {
      text: `▲ ${Math.abs(percent).toFixed(1)}%`,
      className: "text-green-300",
    };
  }

  return {
    text: `▼ ${Math.abs(percent).toFixed(1)}%`,
    className: "text-red-300",
  };
}

export default async function CreatorAnalyticsPage({
  params,
}: {
  params: Promise<{
    username: string;
  }>;
}) {
  const supabase = await createClient();

  /*
    AUTH
  */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userRole } = await supabase
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
    USERNAME
  */

  const { username } = await params;

  const decodedUsername = decodeURIComponent(username)
    .trim()
    .replace(/^@/, "");

  /*
    LOAD CREATOR HISTORY
  */

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
    .eq("username", decodedUsername)
    .order("imported_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Creator analytics error:",
      error
    );

    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">

          <Link
            href="/admin/analytics"
            className="text-sm text-gray-400 transition hover:text-white"
          >
            ← Back to Analytics
          </Link>

          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
            Unable to load creator analytics.
          </div>

        </div>
      </main>
    );
  }

  const history = (data ?? []) as CreatorStat[];

  if (history.length === 0) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">

          <Link
            href="/admin/analytics"
            className="text-sm text-gray-400 transition hover:text-white"
          >
            ← Back to Analytics
          </Link>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">

            <h1 className="text-2xl font-bold">
              Creator Not Found
            </h1>

            <p className="mt-2 text-gray-400">
              No analytics were found for @{decodedUsername}.
            </p>

          </div>

        </div>
      </main>
    );
  }

  /*
    CURRENT SNAPSHOT
  */

  const creator = history[0];

  const diamonds = Number(
    creator.diamonds ?? 0
  );

  const previousDiamonds = Number(
    creator.last_month_diamonds ?? 0
  );

  const days = Number(
    creator.live_days ?? 0
  );

  const hours = Number(
    creator.live_duration ?? 0
  );

  const matches = Number(
    creator.matches ?? 0
  );

  const matchDiamonds = Number(
    creator.diamonds_from_matches ?? 0
  );

  const daysSinceJoining = Number(
    creator.days_since_joining ?? 0
  );

  const previousDays = Number(
    creator.last_month_days ?? 0
  );

  const previousHours = Number(
    creator.last_month_hours ?? 0
  );

  /*
    100K DASHBOARD RULE
    This stays on the web profile,
    but is NOT included in the PDF.
  */

  const qualifiesForIncrease =
    diamonds >= 100000 &&
    diamonds > previousDiamonds;

  const diamondChange = getDiamondChange(
    diamonds,
    previousDiamonds
  );

  const requirement = getRequirementStatus(
    days,
    hours
  );

  /*
    REQUIREMENT PROGRESS
  */

  const dayPercent = Math.min(
    (days / 12) * 100,
    100
  );

  const hourPercent = Math.min(
    (hours / 25) * 100,
    100
  );

  /*
    DIFFERENCES
  */

  const diamondDifference =
    diamonds - previousDiamonds;

  const dayDifference =
    days - previousDays;

  const hourDifference =
    hours - previousHours;

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">

      <div className="mx-auto max-w-7xl">

        {/* BACK */}

        <Link
          href="/admin/analytics"
          className="inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
        >
          ← Back to Analytics
        </Link>

        {/* HEADER */}

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-sm uppercase tracking-[0.3em] text-red-500">
              Creator Analytics
            </p>

            <h1 className="mt-2 text-3xl font-bold md:text-4xl">
              @{creator.username}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3">

              <p className="text-sm text-gray-400">
                Agent:{" "}
                <span className="font-semibold text-white">
                  {creator.manager || "Unassigned"}
                </span>
              </p>

              <span className="text-gray-700">
                •
              </span>

              <p className="text-sm text-gray-400">
                Joined{" "}
                <span className="font-semibold text-white">
                  {daysSinceJoining.toLocaleString()}
                </span>{" "}
                days ago
              </p>

            </div>

            <p className="mt-2 text-xs text-gray-500">
              Latest data imported{" "}
              {formatDate(creator.imported_at)}
            </p>

          </div>

          {/* HEADER ACTIONS */}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

            <span
              className={`inline-flex w-fit items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold ${requirement.className}`}
            >
              {requirement.label}
            </span>

            <CreatorPdfDownloadButton
              creator={creator}
              history={history}
            />

          </div>

        </div>

        {/* CURRENT PERFORMANCE */}

        <div className="mt-8">

          <h2 className="text-xl font-bold">
            Current Performance
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

              <p className="text-sm text-gray-400">
                Diamonds
              </p>

              <p className="mt-2 text-3xl font-bold">
                {diamonds.toLocaleString()}
              </p>

              <p
                className={`mt-2 text-xs font-semibold ${diamondChange.className}`}
              >
                {diamondChange.text} vs last month
              </p>

            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">

              <p className="text-sm text-gray-400">
                Match Diamonds
              </p>

              <p className="mt-2 text-3xl font-bold text-purple-300">
                {matchDiamonds.toLocaleString()}
              </p>

              <p className="mt-2 text-xs text-gray-500">
                diamonds from matches
              </p>

            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

              <p className="text-sm text-gray-400">
                Matches
              </p>

              <p className="mt-2 text-3xl font-bold">
                {matches.toLocaleString()}
              </p>

            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

              <p className="text-sm text-gray-400">
                Valid LIVE Days
              </p>

              <p
                className={`mt-2 text-3xl font-bold ${
                  days >= 12
                    ? "text-green-300"
                    : "text-red-300"
                }`}
              >
                {days}
              </p>

              <p className="mt-2 text-xs text-gray-500">
                12 required
              </p>

            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

              <p className="text-sm text-gray-400">
                LIVE Hours
              </p>

              <p
                className={`mt-2 text-3xl font-bold ${
                  hours >= 25
                    ? "text-green-300"
                    : "text-red-300"
                }`}
              >
                {hours.toFixed(2)}
              </p>

              <p className="mt-2 text-xs text-gray-500">
                25 required
              </p>

            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

              <p className="text-sm text-gray-400">
                Days Since Joining
              </p>

              <p className="mt-2 text-3xl font-bold">
                {daysSinceJoining.toLocaleString()}
              </p>

            </div>

          </div>

        </div>

        {/* 100K WEB DASHBOARD METRIC */}

        <div
          className={`mt-6 rounded-2xl border p-6 ${
            qualifiesForIncrease
              ? "border-green-500/30 bg-green-500/10"
              : "border-white/10 bg-white/[0.03]"
          }`}
        >

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>

              <p className="text-sm font-semibold text-white">
                100K+ Diamond Increase
              </p>

              <p className="mt-1 text-sm text-gray-400">
                Counts toward the dashboard diamond increase metric when
                current diamonds are at least 100,000 and higher than last
                month.
              </p>

            </div>

            {qualifiesForIncrease ? (
              <span className="inline-flex w-fit rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-300">
                ✓ Qualifies
              </span>
            ) : (
              <span className="inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-400">
                Does Not Qualify
              </span>
            )}

          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Last Month
              </p>

              <p className="mt-1 text-xl font-bold">
                {previousDiamonds.toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Current
              </p>

              <p className="mt-1 text-xl font-bold">
                {diamonds.toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Difference
              </p>

              <p
                className={`mt-1 text-xl font-bold ${
                  diamondDifference > 0
                    ? "text-green-300"
                    : diamondDifference < 0
                    ? "text-red-300"
                    : "text-gray-400"
                }`}
              >
                {diamondDifference > 0 ? "+" : ""}
                {diamondDifference.toLocaleString()}
              </p>
            </div>

          </div>

        </div>

        {/* REQUIREMENT PROGRESS */}

        <div className="mt-8">

          <h2 className="text-xl font-bold">
            Requirement Progress
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">

              <div className="flex items-end justify-between gap-4">

                <div>
                  <p className="text-sm text-gray-400">
                    Valid LIVE Days
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {days} / 12
                  </p>
                </div>

                <p className="text-sm text-gray-400">
                  {Math.round(dayPercent)}%
                </p>

              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">

                <div
                  className={
                    days >= 12
                      ? "h-full bg-green-500"
                      : "h-full bg-red-500"
                  }
                  style={{
                    width: `${dayPercent}%`,
                  }}
                />

              </div>

              {days < 12 && (
                <p className="mt-3 text-sm text-red-300">
                  Needs{" "}
                  {Math.max(
                    12 - days,
                    0
                  )}{" "}
                  more valid day
                  {12 - days === 1 ? "" : "s"}.
                </p>
              )}

            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">

              <div className="flex items-end justify-between gap-4">

                <div>
                  <p className="text-sm text-gray-400">
                    LIVE Hours
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {hours.toFixed(2)} / 25
                  </p>
                </div>

                <p className="text-sm text-gray-400">
                  {Math.round(hourPercent)}%
                </p>

              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">

                <div
                  className={
                    hours >= 25
                      ? "h-full bg-green-500"
                      : "h-full bg-red-500"
                  }
                  style={{
                    width: `${hourPercent}%`,
                  }}
                />

              </div>

              {hours < 25 && (
                <p className="mt-3 text-sm text-red-300">
                  Needs{" "}
                  {Math.max(
                    25 - hours,
                    0
                  ).toFixed(2)}{" "}
                  more hours.
                </p>
              )}

            </div>

          </div>

        </div>

        {/* MONTH COMPARISON */}

        <div className="mt-8">

          <h2 className="text-xl font-bold">
            Current vs Last Month
          </h2>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">

            <table className="w-full min-w-[800px] text-sm">

              <thead className="bg-white/10 text-left">

                <tr>
                  <th className="p-4">Metric</th>
                  <th className="p-4">Last Month</th>
                  <th className="p-4">Current</th>
                  <th className="p-4">Change</th>
                </tr>

              </thead>

              <tbody>

                <tr className="border-t border-white/10">

                  <td className="p-4 font-semibold">
                    Diamonds
                  </td>

                  <td className="p-4 text-gray-300">
                    {previousDiamonds.toLocaleString()}
                  </td>

                  <td className="p-4">
                    {diamonds.toLocaleString()}
                  </td>

                  <td
                    className={`p-4 font-semibold ${
                      diamondDifference > 0
                        ? "text-green-300"
                        : diamondDifference < 0
                        ? "text-red-300"
                        : "text-gray-400"
                    }`}
                  >
                    {diamondDifference > 0 ? "+" : ""}
                    {diamondDifference.toLocaleString()}
                  </td>

                </tr>

                <tr className="border-t border-white/10">

                  <td className="p-4 font-semibold">
                    Valid LIVE Days
                  </td>

                  <td className="p-4 text-gray-300">
                    {previousDays}
                  </td>

                  <td className="p-4">
                    {days}
                  </td>

                  <td
                    className={`p-4 font-semibold ${
                      dayDifference > 0
                        ? "text-green-300"
                        : dayDifference < 0
                        ? "text-red-300"
                        : "text-gray-400"
                    }`}
                  >
                    {dayDifference > 0 ? "+" : ""}
                    {dayDifference}
                  </td>

                </tr>

                <tr className="border-t border-white/10">

                  <td className="p-4 font-semibold">
                    LIVE Hours
                  </td>

                  <td className="p-4 text-gray-300">
                    {previousHours.toFixed(2)}
                  </td>

                  <td className="p-4">
                    {hours.toFixed(2)}
                  </td>

                  <td
                    className={`p-4 font-semibold ${
                      hourDifference > 0
                        ? "text-green-300"
                        : hourDifference < 0
                        ? "text-red-300"
                        : "text-gray-400"
                    }`}
                  >
                    {hourDifference > 0 ? "+" : ""}
                    {hourDifference.toFixed(2)}
                  </td>

                </tr>

              </tbody>

            </table>

          </div>

        </div>

        {/* IMPORT HISTORY */}

        <div className="mt-8">

          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">

            <div>
              <h2 className="text-xl font-bold">
                Import History
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                Historical snapshots saved from Backstage uploads.
              </p>
            </div>

            <p className="text-sm text-gray-500">
              {history.length.toLocaleString()} snapshot
              {history.length === 1 ? "" : "s"}
            </p>

          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">

            <table className="w-full min-w-[1350px] text-sm">

              <thead className="bg-white/10 text-left">

                <tr>
                  <th className="p-4">Imported</th>
                  <th className="p-4">Diamonds</th>
                  <th className="p-4">Match Diamonds</th>
                  <th className="p-4">Matches</th>
                  <th className="p-4">Days</th>
                  <th className="p-4">Hours</th>
                  <th className="p-4">Days Since Joining</th>
                  <th className="p-4">Requirement</th>
                </tr>

              </thead>

              <tbody>

                {history.map(
                  (snapshot) => {
                    const snapshotDays = Number(
                      snapshot.live_days ?? 0
                    );

                    const snapshotHours = Number(
                      snapshot.live_duration ?? 0
                    );

                    const snapshotStatus =
                      getRequirementStatus(
                        snapshotDays,
                        snapshotHours
                      );

                    return (
                      <tr
                        key={snapshot.id}
                        className="border-t border-white/10"
                      >

                        <td className="p-4 text-gray-300">
                          {formatDate(
                            snapshot.imported_at
                          )}
                        </td>

                        <td className="p-4 font-semibold">
                          {Number(
                            snapshot.diamonds ?? 0
                          ).toLocaleString()}
                        </td>

                        <td className="p-4 text-purple-300">
                          {Number(
                            snapshot.diamonds_from_matches ??
                              0
                          ).toLocaleString()}
                        </td>

                        <td className="p-4">
                          {Number(
                            snapshot.matches ?? 0
                          ).toLocaleString()}
                        </td>

                        <td className="p-4">
                          {snapshotDays}
                        </td>

                        <td className="p-4">
                          {snapshotHours.toFixed(2)}
                        </td>

                        <td className="p-4">
                          {Number(
                            snapshot.days_since_joining ??
                              0
                          ).toLocaleString()}
                        </td>

                        <td className="p-4">

                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${snapshotStatus.className}`}
                          >
                            {snapshotStatus.label}
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

      </div>

    </main>
  );
}