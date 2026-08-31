"use client";

import { useMemo, useState } from "react";

export type CreatorStat = {
  id: string;
  username: string;
  manager: string | null;
  diamonds: number | null;
  live_days: number | null;
  live_duration: number | null;
  matches: number | null;
  last_month_diamonds: number | null;
  last_month_days: number | null;
  last_month_hours: number | null;
  imported_at: string;
};

type AgentStat = {
  agent: string;
  creators: number;
  diamonds: number;
  matches: number;
  meetingDays: number;
  meetingHours: number;
  complete: number;
  needsAttention: number;
  completionRate: number;
};

type SortOption =
  | "diamonds"
  | "completion"
  | "matches"
  | "creators"
  | "attention";

export default function AgentPerformanceTable({
  creators,
  selectedAgent,
  onSelectAgent,
}: {
  creators: CreatorStat[];
  selectedAgent: string;
  onSelectAgent: (agent: string) => void;
}) {
  const [sortBy, setSortBy] =
    useState<SortOption>("diamonds");

  /*
    BUILD AGENT TOTALS
  */

  const agentStats = useMemo(() => {
    const grouped = new Map<
      string,
      CreatorStat[]
    >();

    for (const creator of creators) {
      const agent =
        creator.manager?.trim() ||
        "Unassigned";

      if (!grouped.has(agent)) {
        grouped.set(agent, []);
      }

      grouped.get(agent)?.push(creator);
    }

    const stats: AgentStat[] = [];

    for (const [
      agent,
      agentCreators,
    ] of grouped.entries()) {
      const creatorCount =
        agentCreators.length;

      const diamonds =
        agentCreators.reduce(
          (sum, creator) =>
            sum +
            Number(
              creator.diamonds ?? 0
            ),
          0
        );

      const matches =
        agentCreators.reduce(
          (sum, creator) =>
            sum +
            Number(
              creator.matches ?? 0
            ),
          0
        );

      const meetingDays =
        agentCreators.filter(
          (creator) =>
            Number(
              creator.live_days ?? 0
            ) >= 12
        ).length;

      const meetingHours =
        agentCreators.filter(
          (creator) =>
            Number(
              creator.live_duration ?? 0
            ) >= 25
        ).length;

      const complete =
        agentCreators.filter(
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

      stats.push({
        agent,
        creators: creatorCount,
        diamonds,
        matches,
        meetingDays,
        meetingHours,
        complete,
        needsAttention,
        completionRate,
      });
    }

    return stats.sort((a, b) => {
      switch (sortBy) {
        case "completion":
          if (
            b.completionRate !==
            a.completionRate
          ) {
            return (
              b.completionRate -
              a.completionRate
            );
          }

          return (
            b.diamonds -
            a.diamonds
          );

        case "matches":
          if (
            b.matches !==
            a.matches
          ) {
            return (
              b.matches -
              a.matches
            );
          }

          return (
            b.diamonds -
            a.diamonds
          );

        case "creators":
          if (
            b.creators !==
            a.creators
          ) {
            return (
              b.creators -
              a.creators
            );
          }

          return (
            b.diamonds -
            a.diamonds
          );

        case "attention":
          if (
            a.needsAttention !==
            b.needsAttention
          ) {
            return (
              a.needsAttention -
              b.needsAttention
            );
          }

          return (
            b.completionRate -
            a.completionRate
          );

        case "diamonds":
        default:
          return (
            b.diamonds -
            a.diamonds
          );
      }
    });
  }, [creators, sortBy]);

  return (
    <div className="mt-8">

      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

        <div>
          <h2 className="text-2xl font-bold">
            Agent Performance
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Compare agent rosters,
            requirement completion,
            diamonds, and match
            activity.
          </p>
        </div>

        {/* SORT */}

        <div className="w-full md:w-[260px]">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Rank Agents By
          </label>

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target
                  .value as SortOption
              )
            }
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/60"
          >
            <option value="diamonds">
              Total Diamonds
            </option>

            <option value="completion">
              Completion Rate
            </option>

            <option value="matches">
              Matches
            </option>

            <option value="creators">
              Creator Count
            </option>

            <option value="attention">
              Least Need Attention
            </option>
          </select>
        </div>

      </div>

      {/* TABLE */}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">

        <table className="w-full min-w-[1300px] text-sm">

          <thead className="bg-white/10 text-left">
            <tr>
              <th className="p-4">
                Rank
              </th>

              <th className="p-4">
                Agent
              </th>

              <th className="p-4">
                Creators
              </th>

              <th className="p-4">
                Diamonds
              </th>

              <th className="p-4">
                Matches
              </th>

              <th className="p-4">
                Meet 12 Days
              </th>

              <th className="p-4">
                Meet 25 Hours
              </th>

              <th className="p-4">
                Complete
              </th>

              <th className="p-4">
                Completion
              </th>

              <th className="p-4">
                Need Attention
              </th>

              <th className="p-4">
                View
              </th>
            </tr>
          </thead>

          <tbody>
            {agentStats.map(
              (agent, index) => {
                const isSelected =
                  selectedAgent ===
                  agent.agent;

                return (
                  <tr
                    key={agent.agent}
                    className={`border-t border-white/10 transition ${
                      isSelected
                        ? "bg-red-500/10"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >

                    {/* RANK */}

                    <td className="p-4">
                      <span className="font-bold text-gray-300">
                        #{index + 1}
                      </span>
                    </td>

                    {/* AGENT */}

                    <td className="p-4">
                      <p className="font-semibold text-white">
                        {agent.agent}
                      </p>

                      {isSelected && (
                        <p className="mt-1 text-xs font-semibold text-red-300">
                          Currently viewing
                        </p>
                      )}
                    </td>

                    {/* CREATORS */}

                    <td className="p-4">
                      {agent.creators.toLocaleString()}
                    </td>

                    {/* DIAMONDS */}

                    <td className="p-4 font-semibold">
                      {agent.diamonds.toLocaleString()}
                    </td>

                    {/* MATCHES */}

                    <td className="p-4">
                      {agent.matches.toLocaleString()}
                    </td>

                    {/* DAYS */}

                    <td className="p-4">
                      <span className="text-green-300">
                        {agent.meetingDays}
                      </span>

                      <span className="text-gray-600">
                        {" "}
                        /{" "}
                        {agent.creators}
                      </span>
                    </td>

                    {/* HOURS */}

                    <td className="p-4">
                      <span className="text-green-300">
                        {agent.meetingHours}
                      </span>

                      <span className="text-gray-600">
                        {" "}
                        /{" "}
                        {agent.creators}
                      </span>
                    </td>

                    {/* COMPLETE */}

                    <td className="p-4 font-semibold text-green-300">
                      {agent.complete}
                    </td>

                    {/* COMPLETION RATE */}

                    <td className="p-4">

                      <div className="flex items-center gap-3">

                        <span
                          className={`min-w-[48px] font-semibold ${
                            agent.completionRate >=
                            75
                              ? "text-green-300"
                              : agent.completionRate >=
                                50
                              ? "text-yellow-300"
                              : "text-red-300"
                          }`}
                        >
                          {agent.completionRate.toFixed(
                            1
                          )}
                          %
                        </span>

                        <div className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full ${
                              agent.completionRate >=
                              75
                                ? "bg-green-500"
                                : agent.completionRate >=
                                  50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                agent.completionRate,
                                100
                              )}%`,
                            }}
                          />
                        </div>

                      </div>

                    </td>

                    {/* NEED ATTENTION */}

                    <td className="p-4">
                      <span
                        className={
                          agent.needsAttention ===
                          0
                            ? "font-semibold text-green-300"
                            : "font-semibold text-red-300"
                        }
                      >
                        {
                          agent.needsAttention
                        }
                      </span>
                    </td>

                    {/* VIEW */}

                    <td className="p-4">
                      {agent.agent ===
                      "Unassigned" ? (
                        <span className="text-xs text-gray-600">
                          —
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            onSelectAgent(
                              agent.agent
                            )
                          }
                          className={`rounded-lg border px-4 py-2 text-xs font-semibold transition ${
                            isSelected
                              ? "border-red-500/30 bg-red-500/10 text-red-300"
                              : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {isSelected
                            ? "Selected"
                            : "View Agent"}
                        </button>
                      )}
                    </td>

                  </tr>
                );
              }
            )}

            {agentStats.length ===
              0 && (
              <tr>
                <td
                  colSpan={11}
                  className="p-12 text-center text-gray-400"
                >
                  No agent data
                  available.
                </td>
              </tr>
            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}