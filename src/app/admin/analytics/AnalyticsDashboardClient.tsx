"use client";

import {
  useMemo,
  useState,
} from "react";

import CreatorPerformanceTable from "./CreatorPerformanceTable";
import AgentPerformanceTable from "./AgentPerformanceTable";
import AgentTrendCharts, {
  type AgentTrendPoint,
} from "./AgentTrendCharts";
import DashboardAlerts, {
  type DashboardAlert,
} from "./DashboardAlerts";

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

export type AgentTrendHistory =
  Record<
    string,
    AgentTrendPoint[]
  >;

export default function AnalyticsDashboardClient({
  creators,
  agentTrendHistory = {},
}: {
  creators: CreatorStat[];
  latestImport?: string | null;
  agentTrendHistory?: AgentTrendHistory;
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
          creator.manager?.trim() ===
          agentFilter
      );
    }, [
      creators,
      agentFilter,
    ]);

  /*
    SELECTED AGENT HISTORY
  */

  const selectedAgentHistory =
    useMemo(() => {
      if (
        agentFilter === "all"
      ) {
        return [];
      }

      return (
        agentTrendHistory[
          agentFilter
        ] ?? []
      );
    }, [
      agentFilter,
      agentTrendHistory,
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
    DASHBOARD ALERTS
  */

  const alerts =
    useMemo<
      DashboardAlert[]
    >(() => {
      const results:
        DashboardAlert[] = [];

      if (
        filteredCreators.length === 0
      ) {
        return results;
      }

      /*
        TEAM DIAMOND CHANGE
      */

      if (
        lastMonthDiamonds > 0 &&
        diamondChangePercent !== null
      ) {
        if (
          diamondChangePercent <= -20
        ) {
          results.push({
            id: "major-diamond-drop",
            type: "danger",
            title:
              "Major Diamond Drop",
            message: `Diamonds are down ${Math.abs(
              diamondChangePercent
            ).toFixed(
              1
            )}% compared with last month.`,
          });
        } else if (
          diamondChangePercent <= -10
        ) {
          results.push({
            id: "diamond-drop",
            type: "warning",
            title:
              "Diamonds Are Trending Down",
            message: `Diamonds are down ${Math.abs(
              diamondChangePercent
            ).toFixed(
              1
            )}% compared with last month.`,
          });
        } else if (
          diamondChangePercent >= 10
        ) {
          results.push({
            id: "diamond-growth",
            type: "success",
            title:
              "Strong Diamond Growth",
            message: `Diamonds are up ${diamondChangePercent.toFixed(
              1
            )}% compared with last month.`,
          });
        }
      }

      /*
        REQUIREMENT COMPLETION
      */

      const completionRate =
        totalCreators > 0
          ? (complete /
              totalCreators) *
            100
          : 0;

      if (
        completionRate < 25
      ) {
        results.push({
          id: "low-completion",
          type: "danger",
          title:
            "Low Requirement Completion",
          message: `Only ${Math.round(
            completionRate
          )}% of creators currently meet both the 12 day and 25 hour requirements.`,
        });
      } else if (
        completionRate < 50
      ) {
        results.push({
          id: "completion-watch",
          type: "warning",
          title:
            "Requirement Completion Watch",
          message: `${Math.round(
            completionRate
          )}% of creators currently meet both requirements.`,
        });
      } else if (
        completionRate >= 75
      ) {
        results.push({
          id: "strong-completion",
          type: "success",
          title:
            "Strong Requirement Completion",
          message: `${Math.round(
            completionRate
          )}% of creators currently meet both the 12 day and 25 hour requirements.`,
        });
      }

      /*
        CLOSE TO COMPLETING
      */

      const closeToComplete =
        filteredCreators.filter(
          (creator) => {
            const days =
              Number(
                creator.live_days ??
                  0
              );

            const hours =
              Number(
                creator.live_duration ??
                  0
              );

            const isComplete =
              days >= 12 &&
              hours >= 25;

            if (isComplete) {
              return false;
            }

            return (
              days >= 10 &&
              hours >= 20
            );
          }
        ).length;

      if (
        closeToComplete > 0
      ) {
        results.push({
          id: "close-to-complete",
          type: "info",
          title:
            "Creators Close to Completion",
          message: `${closeToComplete.toLocaleString()} ${
            closeToComplete === 1
              ? "creator is"
              : "creators are"
          } currently at 10+ valid days and 20+ LIVE hours but have not completed both requirements yet.`,
        });
      }

      /*
        HIGH DIAMOND CREATORS
        MISSING REQUIREMENTS
      */

      const highDiamondAttention =
        filteredCreators.filter(
          (creator) => {
            const diamonds =
              Number(
                creator.diamonds ??
                  0
              );

            const days =
              Number(
                creator.live_days ??
                  0
              );

            const hours =
              Number(
                creator.live_duration ??
                  0
              );

            return (
              diamonds >= 100000 &&
              !(
                days >= 12 &&
                hours >= 25
              )
            );
          }
        ).length;

      if (
        highDiamondAttention > 0
      ) {
        results.push({
          id:
            "high-diamond-attention",
          type: "warning",
          title:
            "High Diamond Creators Missing Requirements",
          message: `${highDiamondAttention.toLocaleString()} ${
            highDiamondAttention ===
            1
              ? "creator has"
              : "creators have"
          } at least 100,000 diamonds but have not yet completed both LIVE requirements.`,
        });
      }

      /*
        LARGE INDIVIDUAL
        DIAMOND DROPS
      */

      const majorCreatorDrops =
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

            if (
              previous < 100000
            ) {
              return false;
            }

            const change =
              ((current -
                previous) /
                previous) *
              100;

            return (
              change <= -50
            );
          }
        ).length;

      if (
        majorCreatorDrops > 0
      ) {
        results.push({
          id:
            "major-creator-drops",
          type: "warning",
          title:
            "Large Creator Diamond Drops",
          message: `${majorCreatorDrops.toLocaleString()} ${
            majorCreatorDrops === 1
              ? "creator is"
              : "creators are"
          } down at least 50% in diamonds compared with last month after previously producing at least 100,000 diamonds.`,
        });
      }

      /*
        100K+ DIAMOND INCREASES
      */

      if (
        diamondIncreases > 0
      ) {
        results.push({
          id:
            "diamond-increases",
          type: "success",
          title:
            "100K+ Diamond Increases",
          message: `${diamondIncreases.toLocaleString()} ${
            diamondIncreases === 1
              ? "creator has"
              : "creators have"
          } reached at least 100,000 diamonds and increased from last month.`,
        });
      }

      return results;
    }, [
      filteredCreators,
      totalCreators,
      complete,
      lastMonthDiamonds,
      diamondChangePercent,
      diamondIncreases,
    ]);

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
    <div className="text-white">

      {/* AGENT FILTER */}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
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
              value={
                agentFilter
              }
              onChange={(
                event
              ) =>
                setAgentFilter(
                  event.target
                    .value
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
                    key={
                      agent
                    }
                    value={
                      agent
                    }
                  >
                    {
                      agent
                    }
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
              Viewing analytics
              for{" "}
              <span className="font-semibold text-white">
                {
                  agentFilter
                }
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

      {/* DASHBOARD ALERTS */}

      <DashboardAlerts
        alerts={alerts}
      />

      {/* SUMMARY CARDS */}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-gray-400">
            Creators
          </p>

          <p className="mt-2 text-3xl font-bold">
            {totalCreators.toLocaleString()}
          </p>
        </div>

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

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-gray-400">
            Matches
          </p>

          <p className="mt-2 text-3xl font-bold">
            {totalMatches.toLocaleString()}
          </p>
        </div>

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

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-gray-400">
            Meet 12 Days
          </p>

          <p className="mt-2 text-3xl font-bold text-green-300">
            {meetingDays.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-gray-400">
            Meet 25 Hours
          </p>

          <p className="mt-2 text-3xl font-bold text-green-300">
            {meetingHours.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
          <p className="text-sm text-gray-400">
            Complete
          </p>

          <p className="mt-2 text-3xl font-bold text-green-300">
            {complete.toLocaleString()}
          </p>
        </div>

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

      {/* AGENT TREND TRACKING */}

      {agentFilter !==
        "all" && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <AgentTrendCharts
            agent={
              agentFilter
            }
            history={
              selectedAgentHistory
            }
          />
        </div>
      )}

      {/* AGENT PERFORMANCE */}

      <AgentPerformanceTable
        creators={
          creators
        }
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
  );
}