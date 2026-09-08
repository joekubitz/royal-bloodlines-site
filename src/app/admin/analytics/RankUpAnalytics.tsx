"use client";

import { useMemo } from "react";

import {
  getRankUp,
} from "./tierRules";

type CreatorStat = {
  username: string;
  manager: string | null;
  diamonds: number | null;
  last_month_diamonds: number | null;
};

type Props = {
  creators: CreatorStat[];
};

export default function RankUpAnalytics({
  creators,
}: Props) {
  const rankUps = useMemo(() => {
    return creators
      .map((creator) => {
        const currentDiamonds =
          Number(
            creator.diamonds ?? 0
          );

        const lastMonthDiamonds =
          Number(
            creator.last_month_diamonds ??
              0
          );

        const result =
          getRankUp({
            currentDiamonds,
            lastMonthDiamonds,
          });

        return {
          username:
            creator.username,
          manager:
            creator.manager,
          currentDiamonds,
          lastMonthDiamonds,
          ...result,
        };
      })
      .filter(
        (creator) =>
          creator.rankedUp
      )
      .sort((a, b) => {
        if (
          b.tiersGained !==
          a.tiersGained
        ) {
          return (
            b.tiersGained -
            a.tiersGained
          );
        }

        return (
          b.currentDiamonds -
          a.currentDiamonds
        );
      });
  }, [creators]);

  return (
    <section className="mt-8">
      <div className="mb-4">
        <p className="text-sm uppercase tracking-[0.2em] text-red-500">
          Tier Analytics
        </p>

        <h2 className="mt-2 text-2xl font-bold text-white">
          Rank Ups
        </h2>

        <p className="mt-1 text-sm text-gray-400">
          Creators whose current
          diamond total places them
          in a higher tier than
          last month.
        </p>
      </div>

      <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6">
        <p className="text-sm text-gray-400">
          Creators Ranked Up
        </p>

        <p className="mt-2 text-4xl font-bold text-green-300">
          {rankUps.length.toLocaleString()}
        </p>

        <p className="mt-2 text-sm text-gray-500">
          Based on current diamonds
          compared with last month.
        </p>
      </div>

      {rankUps.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="p-4">
                    Creator
                  </th>

                  <th className="p-4">
                    Agent
                  </th>

                  <th className="p-4">
                    Last Month
                  </th>

                  <th className="p-4">
                    Current
                  </th>

                  <th className="p-4">
                    Rank Up
                  </th>

                  <th className="p-4">
                    Tiers Gained
                  </th>
                </tr>
              </thead>

              <tbody>
                {rankUps.map(
                  (creator) => (
                    <tr
                      key={
                        creator.username
                      }
                      className="border-t border-white/10"
                    >
                      <td className="p-4 font-semibold text-white">
                        {
                          creator.username
                        }
                      </td>

                      <td className="p-4 text-gray-400">
                        {creator.manager?.trim() ||
                          "Unassigned"}
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-gray-300">
                          {
                            creator.previousTier
                          }
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                          {creator.lastMonthDiamonds.toLocaleString()}{" "}
                          diamonds
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-green-300">
                          {
                            creator.currentTier
                          }
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                          {creator.currentDiamonds.toLocaleString()}{" "}
                          diamonds
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-300">
                          {
                            creator.previousTier
                          }{" "}
                          →{" "}
                          {
                            creator.currentTier
                          }
                        </span>
                      </td>

                      <td className="p-4 font-semibold text-green-300">
                        +
                        {
                          creator.tiersGained
                        }
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rankUps.length === 0 && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="font-semibold text-white">
            No rank ups yet
          </p>

          <p className="mt-2 text-sm text-gray-400">
            No creators in the
            current upload have
            moved into a higher
            diamond tier compared
            with last month.
          </p>
        </div>
      )}
    </section>
  );
}