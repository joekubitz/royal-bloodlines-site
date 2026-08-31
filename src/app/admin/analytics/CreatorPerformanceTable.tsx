"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

export type CreatorStat = {
  id: string;
  username: string;
  manager: string | null;

  days_since_joining:
    | number
    | null;

  diamonds: number | null;

  live_days:
    | number
    | null;

  live_duration:
    | number
    | null;

  matches:
    | number
    | null;

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

type RequirementFilter =
  | "all"
  | "needs-both"
  | "needs-days"
  | "needs-hours"
  | "complete";

function getRequirementStatus(
  days: number,
  hours: number
) {
  const meetsDays =
    days >= 12;

  const meetsHours =
    hours >= 25;

  if (
    meetsDays &&
    meetsHours
  ) {
    return {
      key: "complete" as RequirementFilter,
      label: "Complete",
      className:
        "border-green-500/30 bg-green-500/10 text-green-300",
    };
  }

  if (
    !meetsDays &&
    !meetsHours
  ) {
    return {
      key: "needs-both" as RequirementFilter,
      label: "Needs Both",
      className:
        "border-red-500/30 bg-red-500/10 text-red-300",
    };
  }

  if (!meetsDays) {
    return {
      key: "needs-days" as RequirementFilter,
      label: "Needs Days",
      className:
        "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    };
  }

  return {
    key: "needs-hours" as RequirementFilter,
    label: "Needs Hours",
    className:
      "border-orange-500/30 bg-orange-500/10 text-orange-300",
  };
}

function getPriority(
  days: number,
  hours: number
) {
  const meetsDays =
    days >= 12;

  const meetsHours =
    hours >= 25;

  if (
    !meetsDays &&
    !meetsHours
  ) {
    return 1;
  }

  if (
    !meetsDays ||
    !meetsHours
  ) {
    return 2;
  }

  return 3;
}

function getDiamondChange(
  currentDiamonds: number,
  lastMonthDiamonds: number
) {
  if (
    lastMonthDiamonds === 0
  ) {
    if (
      currentDiamonds > 0
    ) {
      return {
        text: "New activity",
        className:
          "text-green-300",
      };
    }

    return {
      text: "No change",
      className:
        "text-gray-500",
    };
  }

  const difference =
    currentDiamonds -
    lastMonthDiamonds;

  const percentage =
    (difference /
      lastMonthDiamonds) *
    100;

  if (
    Math.abs(
      percentage
    ) < 0.1
  ) {
    return {
      text: "No change",
      className:
        "text-gray-500",
    };
  }

  if (
    percentage > 0
  ) {
    return {
      text: `▲ ${Math.abs(
        percentage
      ).toFixed(1)}%`,
      className:
        "text-green-300",
    };
  }

  return {
    text: `▼ ${Math.abs(
      percentage
    ).toFixed(1)}%`,
    className:
      "text-red-300",
  };
}

function qualifiesForDiamondIncrease(
  currentDiamonds: number,
  lastMonthDiamonds: number
) {
  return (
    currentDiamonds >=
      100000 &&
    currentDiamonds >
      lastMonthDiamonds
  );
}

export default function CreatorPerformanceTable({
  creators,
  selectedAgent,
}: {
  creators: CreatorStat[];
  selectedAgent: string;
}) {
  const [
    search,
    setSearch,
  ] = useState("");

  const [
    requirementFilter,
    setRequirementFilter,
  ] =
    useState<RequirementFilter>(
      "all"
    );

  /*
    FILTER + SORT
  */

  const filteredCreators =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase()
          .replace(/^@/, "");

      return [...creators]
        .filter((creator) => {
          const username =
            creator.username
              .toLowerCase()
              .trim()
              .replace(
                /^@/,
                ""
              );

          const manager =
            (
              creator.manager ??
              ""
            )
              .toLowerCase()
              .trim();

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

          const status =
            getRequirementStatus(
              days,
              hours
            );

          const matchesSearch =
            normalizedSearch.length ===
              0 ||
            username.includes(
              normalizedSearch
            ) ||
            manager.includes(
              normalizedSearch
            );

          const matchesRequirement =
            requirementFilter ===
              "all" ||
            status.key ===
              requirementFilter;

          return (
            matchesSearch &&
            matchesRequirement
          );
        })
        .sort((a, b) => {
          const aDays =
            Number(
              a.live_days ??
                0
            );

          const aHours =
            Number(
              a.live_duration ??
                0
            );

          const bDays =
            Number(
              b.live_days ??
                0
            );

          const bHours =
            Number(
              b.live_duration ??
                0
            );

          const aPriority =
            getPriority(
              aDays,
              aHours
            );

          const bPriority =
            getPriority(
              bDays,
              bHours
            );

          if (
            aPriority !==
            bPriority
          ) {
            return (
              aPriority -
              bPriority
            );
          }

          const aDiamonds =
            Number(
              a.diamonds ??
                0
            );

          const bDiamonds =
            Number(
              b.diamonds ??
                0
            );

          if (
            aDiamonds !==
            bDiamonds
          ) {
            return (
              bDiamonds -
              aDiamonds
            );
          }

          return a.username.localeCompare(
            b.username
          );
        });
    }, [
      creators,
      search,
      requirementFilter,
    ]);

  function clearFilters() {
    setSearch("");

    setRequirementFilter(
      "all"
    );
  }

  const filtersActive =
    search.trim().length > 0 ||
    requirementFilter !==
      "all";

  return (
    <div className="mt-8">

      {/* HEADER */}

      <div className="mb-5">

        <h2 className="text-2xl font-bold">
          Creator Performance
        </h2>

        <p className="mt-1 text-sm text-gray-400">
          {selectedAgent ===
          "all"
            ? "Showing creators across all agents."
            : `Showing creators assigned to ${selectedAgent}.`}
        </p>

      </div>

      {/* FILTERS */}

      <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">

        <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">

          {/* SEARCH */}

          <div>

            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Search
            </label>

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search creator..."
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-red-500/60"
            />

          </div>

          {/* REQUIREMENT */}

          <div>

            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Requirement
            </label>

            <select
              value={
                requirementFilter
              }
              onChange={(event) =>
                setRequirementFilter(
                  event.target
                    .value as RequirementFilter
                )
              }
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/60"
            >

              <option value="all">
                All Statuses
              </option>

              <option value="needs-both">
                Needs Both
              </option>

              <option value="needs-days">
                Needs Days
              </option>

              <option value="needs-hours">
                Needs Hours
              </option>

              <option value="complete">
                Complete
              </option>

            </select>

          </div>

          {/* CLEAR */}

          <div className="flex items-end">

            <button
              type="button"
              onClick={
                clearFilters
              }
              disabled={
                !filtersActive
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
            >
              Clear
            </button>

          </div>

        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">

          <p className="text-sm text-gray-400">

            Showing{" "}

            <span className="font-semibold text-white">
              {filteredCreators.length.toLocaleString()}
            </span>

            {" "}of{" "}

            <span className="font-semibold text-white">
              {creators.length.toLocaleString()}
            </span>

            {" "}creators

          </p>

          {filtersActive && (
            <p className="text-xs font-semibold text-red-300">
              Table filters active
            </p>
          )}

        </div>

      </div>

      {/* TABLE */}

      <div className="overflow-x-auto rounded-2xl border border-white/10">

        <table className="w-full min-w-[1900px] text-sm">

          <thead className="bg-white/10 text-left">

            <tr>

              <th className="p-4">
                Creator
              </th>

              <th className="p-4">
                Days Since Joining
              </th>

              <th className="p-4">
                Agent
              </th>

              <th className="p-4">
                Matches
              </th>

              <th className="p-4">
                Match Diamonds
              </th>

              <th className="p-4">
                Diamonds
              </th>

              <th className="p-4">
                Change
              </th>

              <th className="p-4">
                Days
              </th>

              <th className="p-4">
                Hours
              </th>

              <th className="p-4">
                Last Month Diamonds
              </th>

              <th className="p-4">
                Last Month Days
              </th>

              <th className="p-4">
                Last Month Hours
              </th>

              <th className="p-4">
                Requirement
              </th>

            </tr>

          </thead>

          <tbody>

            {filteredCreators.map(
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

                const diamonds =
                  Number(
                    creator.diamonds ??
                      0
                  );

                const previousDiamonds =
                  Number(
                    creator.last_month_diamonds ??
                      0
                  );

                const status =
                  getRequirementStatus(
                    days,
                    hours
                  );

                const diamondChange =
                  getDiamondChange(
                    diamonds,
                    previousDiamonds
                  );

                const qualifiesIncrease =
                  qualifiesForDiamondIncrease(
                    diamonds,
                    previousDiamonds
                  );

                return (
                  <tr
                    key={
                      creator.id
                    }
                    className="border-t border-white/10 transition hover:bg-white/[0.03]"
                  >

                    {/* CREATOR */}

                    <td className="p-4 font-semibold">

                      <Link
                        href={`/admin/analytics/creator/${encodeURIComponent(
                          creator.username
                        )}`}
                        className="inline-flex items-center gap-2 text-white transition hover:text-red-400"
                      >

                        <span>
                          @{creator.username}
                        </span>

                        <span className="text-xs text-gray-600">
                          →
                        </span>

                      </Link>

                    </td>

                    {/* DAYS SINCE JOINING */}

                    <td className="p-4 text-gray-300">
                      {Number(
                        creator.days_since_joining ??
                          0
                      ).toLocaleString()}
                    </td>

                    {/* AGENT */}

                    <td className="p-4 text-gray-300">
                      {creator.manager ||
                        "—"}
                    </td>

                    {/* MATCHES */}

                    <td className="p-4">
                      {Number(
                        creator.matches ??
                          0
                      ).toLocaleString()}
                    </td>

                    {/* MATCH DIAMONDS */}

                    <td className="p-4 font-medium text-purple-300">
                      {Number(
                        creator.diamonds_from_matches ??
                          0
                      ).toLocaleString()}
                    </td>

                    {/* DIAMONDS */}

                    <td className="p-4 font-medium">

                      <div className="flex flex-col">

                        <span>
                          {diamonds.toLocaleString()}
                        </span>

                        {qualifiesIncrease && (
                          <span className="mt-1 text-xs font-semibold text-green-300">
                            100K+ Increase
                          </span>
                        )}

                      </div>

                    </td>

                    {/* CHANGE */}

                    <td className="p-4">

                      <span
                        className={`text-xs font-semibold ${diamondChange.className}`}
                      >
                        {diamondChange.text}
                      </span>

                    </td>

                    {/* DAYS */}

                    <td className="p-4">

                      <span
                        className={
                          days >= 12
                            ? "font-semibold text-green-300"
                            : "font-semibold text-red-300"
                        }
                      >
                        {days} / 12
                      </span>

                    </td>

                    {/* HOURS */}

                    <td className="p-4">

                      <span
                        className={
                          hours >= 25
                            ? "font-semibold text-green-300"
                            : "font-semibold text-red-300"
                        }
                      >
                        {hours.toFixed(
                          2
                        )}{" "}
                        / 25
                      </span>

                    </td>

                    {/* LAST MONTH DIAMONDS */}

                    <td className="p-4 text-gray-300">
                      {previousDiamonds.toLocaleString()}
                    </td>

                    {/* LAST MONTH DAYS */}

                    <td className="p-4 text-gray-300">
                      {Number(
                        creator.last_month_days ??
                          0
                      )}
                    </td>

                    {/* LAST MONTH HOURS */}

                    <td className="p-4 text-gray-300">
                      {Number(
                        creator.last_month_hours ??
                          0
                      ).toFixed(2)}
                    </td>

                    {/* REQUIREMENT */}

                    <td className="p-4">

                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>

                    </td>

                  </tr>
                );
              }
            )}

            {filteredCreators.length ===
              0 && (
              <tr>

                <td
                  colSpan={13}
                  className="p-12 text-center"
                >

                  <p className="font-semibold text-gray-300">
                    No creators found
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Try changing your
                    search or requirement
                    filter.
                  </p>

                </td>

              </tr>
            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}