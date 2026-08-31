"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import CreatorPerformanceTable from "./CreatorPerformanceTable";
import AgentPerformanceTable from "./AgentPerformanceTable";

export type CreatorStat = {
  id: string;
  username: string;
  manager: string | null;

  days_since_joining: number | null;

  diamonds: number | null;
  live_days: number | null;
  live_duration: number | null;

  matches: number | null;
  diamonds_from_matches:
    | number
    | null;

  last_month_diamonds:
    | number
    | null;

  last_month_days:
    | number
    | null;

  last_month_hours:
    | number
    | null;

  imported_at: string;
};

function formatImportTime(
  value: string | null
) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
}

export default function AnalyticsDashboardClient({
  creators,
  latestImport,
}: {
  creators: CreatorStat[];
  latestImport: string | null;
}) {
  const [
    agentFilter,
    setAgentFilter,
  ] = useState("all");

  /*
    AGENT LIST
  */

  const agents = useMemo(() => {
    const uniqueAgents =
      Array.from(
        new Set(
          creators
            .map((creator) =>
              creator.manager?.trim()
            )
            .filter(
              (
                agent
              ): agent is string =>
                Boolean(agent)
            )
        )
      );

    return uniqueAgents.sort(
      (a, b) =>
        a.localeCompare(b)
    );
  }, [creators]);

  /*
    FILTER DASHBOARD
  */

  const filteredCreators =
    useMemo(() => {
      if (
        agentFilter === "all"
      ) {
        return creators;
      }

      return creators.filter(
        (creator) =>
          creator.manager ===
          agentFilter
      );
    }, [
      creators,
      agentFilter,
    ]);

  /*
    TOTAL CREATORS
  */

  const totalCreators =
    filteredCreators.length;

  /*
    TOTAL DIAMONDS
  */

  const totalDiamonds =
    filteredCreators.reduce(
      (sum, creator) =>
        sum +
        Number(
          creator.diamonds ?? 0
        ),
      0
    );

  /*
    LAST MONTH DIAMONDS
  */

  const lastMonthDiamonds =
    filteredCreators.reduce(
      (sum, creator) =>
        sum +
        Number(
          creator.last_month_diamonds ??
            0
        ),
      0
    );

  /*
    MATCHES
  */

  const totalMatches =
    filteredCreators.reduce(
      (sum, creator) =>
        sum +
        Number(
          creator.matches ?? 0
        ),
      0
    );

  /*
    MATCH DIAMONDS
  */

  const totalMatchDiamonds =
    filteredCreators.reduce(
      (sum, creator) =>
        sum +
        Number(
          creator.diamonds_from_matches ??
            0
        ),
      0
    );

  /*
    DIAMOND INCREASES

    Camera Kings rule:

    Current diamonds must be
    at least 100,000

    AND

    Current diamonds must be
    greater than last month.
  */

  const diamondIncreases =
    filteredCreators.filter(
      (creator) => {
        const current =
          Number(
            creator.diamonds ??
              0
          );

        const previous =
          Number(
            creator.last_month_diamonds ??
              0
          );

        return (
          current >= 100000 &&
          current > previous
        );
      }
    ).length;

  /*
    REQUIREMENTS
  */

  const meetingDays =
    filteredCreators.filter(
      (creator) =>
        Number(
          creator.live_days ?? 0
        ) >= 12
    ).length;

  const meetingHours =
    filteredCreators.filter(
      (creator) =>
        Number(
          creator.live_duration ??
            0
        ) >= 25
    ).length;

  const complete =
    filteredCreators.filter(
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
    totalCreators - complete;

  /*
    DIAMOND CHANGE
  */

  let diamondChangePercent:
    | number
    | null = null;

  if (
    lastMonthDiamonds > 0
  ) {
    diamondChangePercent =
      ((totalDiamonds -
        lastMonthDiamonds) /
        lastMonthDiamonds) *
      100;
  }

  /*
    PROGRESS
  */

  const dayPercent =
    totalCreators > 0
      ? (meetingDays /
          totalCreators) *
        100
      : 0;

  const hourPercent =
    totalCreators > 0
      ? (meetingHours /
          totalCreators) *
        100
      : 0;

  /*
    AGENT RANKING CLICK
  */

  function handleSelectAgent(
    agent: string
  ) {
    setAgentFilter(agent);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">

      <div className="mx-auto max-w-[1700px]">

        {/* HEADER */}

        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

          <div>

            <p className="text-sm uppercase tracking-[0.3em] text-red-500">
              Royals Bloodline
            </p>

            <h1 className="mt-2 text-3xl font-bold md:text-4xl">
              Backstage Analytics
            </h1>

            <p className="mt-2 text-gray-400">
              Creator performance and
              12 day / 25 hour
              requirement tracking.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Last updated:{" "}
              {formatImportTime(
                latestImport
              )}
            </p>

          </div>

          <Link
            href="/admin/analytics/upload"
            className="rounded-xl bg-red-700 px-5 py-3 text-center font-semibold transition hover:bg-red-600"
          >
            Upload Creator Data
          </Link>

        </div>

        {/* AGENT FILTER */}

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

            <div>

              <p className="text-sm font-semibold text-white">
                Dashboard View
              </p>

              <p className="mt-1 text-sm text-gray-400">
                Select an agent to
                recalculate the entire
                dashboard for their
                creator roster.
              </p>

            </div>

            <div className="w-full lg:w-[350px]">

              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Agent
              </label>

              <select
                value={agentFilter}
                onChange={(event) =>
                  setAgentFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/60"
              >

                <option value="all">
                  All Agents
                </option>

                {agents.map(
                  (agent) => (
                    <option
                      key={agent}
                      value={agent}
                    >
                      {agent}
                    </option>
                  )
                )}

              </select>

            </div>

          </div>

          {agentFilter !==
            "all" && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">

              <p className="text-sm text-gray-400">
                Viewing analytics for{" "}
                <span className="font-semibold text-white">
                  {agentFilter}
                </span>
              </p>

              <button
                type="button"
                onClick={() =>
                  setAgentFilter(
                    "all"
                  )
                }
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-white/10"
              >
                View All Agents
              </button>

            </div>
          )}

        </div>

        {/* SUMMARY CARDS */}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

          {/* CREATORS */}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

            <p className="text-sm text-gray-400">
              Creators
            </p>

            <p className="mt-2 text-3xl font-bold">
              {totalCreators.toLocaleString()}
            </p>

          </div>

          {/* DIAMONDS */}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

            <p className="text-sm text-gray-400">
              Diamonds
            </p>

            <p className="mt-2 text-3xl font-bold">
              {totalDiamonds.toLocaleString()}
            </p>

            {diamondChangePercent !==
              null && (
              <p
                className={`mt-1 text-xs font-semibold ${
                  diamondChangePercent >=
                  0
                    ? "text-green-300"
                    : "text-red-300"
                }`}
              >
                {diamondChangePercent >=
                0
                  ? "▲"
                  : "▼"}{" "}
                {Math.abs(
                  diamondChangePercent
                ).toFixed(1)}
                % vs last month
              </p>
            )}

          </div>

          {/* LAST MONTH */}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

            <p className="text-sm text-gray-400">
              Last Month
            </p>

            <p className="mt-2 text-3xl font-bold">
              {lastMonthDiamonds.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              diamonds
            </p>

          </div>

          {/* MATCHES */}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

            <p className="text-sm text-gray-400">
              Matches
            </p>

            <p className="mt-2 text-3xl font-bold">
              {totalMatches.toLocaleString()}
            </p>

          </div>

          {/* MATCH DIAMONDS */}

          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">

            <p className="text-sm text-gray-400">
              Match Diamonds
            </p>

            <p className="mt-2 text-3xl font-bold text-purple-300">
              {totalMatchDiamonds.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              diamonds from matches
            </p>

          </div>

          {/* DIAMOND INCREASES */}

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">

            <p className="text-sm text-gray-400">
              Diamond Increases
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-300">
              {diamondIncreases.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              100K+ and increased
            </p>

          </div>

          {/* MEET DAYS */}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

            <p className="text-sm text-gray-400">
              Meet 12 Days
            </p>

            <p className="mt-2 text-3xl font-bold text-green-300">
              {meetingDays.toLocaleString()}
            </p>

          </div>

          {/* MEET HOURS */}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

            <p className="text-sm text-gray-400">
              Meet 25 Hours
            </p>

            <p className="mt-2 text-3xl font-bold text-green-300">
              {meetingHours.toLocaleString()}
            </p>

          </div>

          {/* COMPLETE */}

          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5">

            <p className="text-sm text-gray-400">
              Complete
            </p>

            <p className="mt-2 text-3xl font-bold text-green-300">
              {complete.toLocaleString()}
            </p>

          </div>

          {/* NEED ATTENTION */}

          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">

            <p className="text-sm text-gray-400">
              Need Attention
            </p>

            <p className="mt-2 text-3xl font-bold text-red-300">
              {needsAttention.toLocaleString()}
            </p>

          </div>

        </div>

        {/* REQUIREMENT PROGRESS */}

        <div className="mt-8 grid gap-4 md:grid-cols-2">

          {/* DAYS */}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">

            <div className="flex items-end justify-between gap-4">

              <div>

                <p className="text-sm text-gray-400">
                  12 Day Requirement
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {meetingDays.toLocaleString()}{" "}
                  /{" "}
                  {totalCreators.toLocaleString()}
                </p>

              </div>

              <p className="text-sm text-gray-400">
                {Math.round(
                  dayPercent
                )}
                %
              </p>

            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">

              <div
                className="h-full bg-green-500"
                style={{
                  width: `${Math.min(
                    dayPercent,
                    100
                  )}%`,
                }}
              />

            </div>

          </div>

          {/* HOURS */}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">

            <div className="flex items-end justify-between gap-4">

              <div>

                <p className="text-sm text-gray-400">
                  25 Hour Requirement
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {meetingHours.toLocaleString()}{" "}
                  /{" "}
                  {totalCreators.toLocaleString()}
                </p>

              </div>

              <p className="text-sm text-gray-400">
                {Math.round(
                  hourPercent
                )}
                %
              </p>

            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">

              <div
                className="h-full bg-green-500"
                style={{
                  width: `${Math.min(
                    hourPercent,
                    100
                  )}%`,
                }}
              />

            </div>

          </div>

        </div>

        {/* AGENT PERFORMANCE */}

        <AgentPerformanceTable
          creators={creators}
          selectedAgent={
            agentFilter
          }
          onSelectAgent={
            handleSelectAgent
          }
        />

        {/* CREATOR PERFORMANCE */}

        <CreatorPerformanceTable
          creators={
            filteredCreators
          }
          selectedAgent={
            agentFilter
          }
        />

      </div>

    </main>
  );
}