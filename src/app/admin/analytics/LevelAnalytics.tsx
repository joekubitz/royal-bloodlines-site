"use client";

import { useMemo } from "react";

import {
  getCreatorLevel,
  getLevelProgress,
  levelRules,
  type CreatorLevel,
} from "./levelRules";

type CreatorStat = {
  username: string;
  manager: string | null;
  diamonds: number | null;
  live_days: number | null;
  live_duration: number | null;
};

type Props = {
  creators: CreatorStat[];
};

const levelOrder: CreatorLevel[] = [
  "Level 5",
  "Level 4",
  "Level 3",
  "Level 2",
  "Level 1",
  "Not Qualified",
];

export default function LevelAnalytics({
  creators,
}: Props) {
  const stats = useMemo(() => {
    const counts: Record<CreatorLevel, number> = {
      "Level 1": 0,
      "Level 2": 0,
      "Level 3": 0,
      "Level 4": 0,
      "Level 5": 0,
      "Not Qualified": 0,
    };

    let closeToNext = 0;
    let onlyNeedsDays = 0;
    let onlyNeedsHours = 0;
    let needsDaysAndHours = 0;

    for (const creator of creators) {
      const diamonds = Number(
        creator.diamonds ?? 0
      );

      const days = Number(
        creator.live_days ?? 0
      );

      const hours = Number(
        creator.live_duration ?? 0
      );

      const currentLevel =
        getCreatorLevel({
          diamonds,
          days,
          hours,
        });

      counts[currentLevel] += 1;

      const progress =
        getLevelProgress({
          diamonds,
          days,
          hours,
        });

      if (!progress.nextLevel) {
        continue;
      }

      const missingDiamonds =
        progress.diamondsNeeded > 0;

      const missingDays =
        progress.daysNeeded > 0;

      const missingHours =
        progress.hoursNeeded > 0;

      if (missingDiamonds) {
        continue;
      }

      const closeOnDays =
        progress.daysNeeded <= 2;

      const closeOnHours =
        progress.hoursNeeded <= 10;

      if (
        (missingDays || missingHours) &&
        closeOnDays &&
        closeOnHours
      ) {
        closeToNext += 1;
      }

      if (
        missingDays &&
        !missingHours
      ) {
        onlyNeedsDays += 1;
      } else if (
        !missingDays &&
        missingHours
      ) {
        onlyNeedsHours += 1;
      } else if (
        missingDays &&
        missingHours
      ) {
        needsDaysAndHours += 1;
      }
    }

    return {
      counts,
      closeToNext,
      onlyNeedsDays,
      onlyNeedsHours,
      needsDaysAndHours,
    };
  }, [creators]);

  return (
    <section className="mt-8">
      <div className="mb-4">
        <p className="text-sm uppercase tracking-[0.2em] text-red-500">
          Level Analytics
        </p>

        <h2 className="mt-2 text-2xl font-bold text-white">
          Creator Bonus Levels
        </h2>

        <p className="mt-1 text-sm text-gray-400">
          Automatic level placement based on monthly diamonds,
          valid LIVE days, and LIVE hours.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {levelOrder.map((level) => {
          const count =
            stats.counts[level];

          const rule =
            levelRules.find(
              (item) =>
                item.level === level
            );

          return (
            <div
              key={level}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <p className="text-sm text-gray-400">
                {level}
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {count.toLocaleString()}
              </p>

              {rule ? (
                <p className="mt-1 text-xs text-gray-500">
                  {rule.bonusRatio}% bonus
                </p>
              ) : (
                <p className="mt-1 text-xs text-gray-500">
                  Below Level 1
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
          <p className="text-sm text-gray-400">
            Close to Next Level
          </p>

          <p className="mt-2 text-3xl font-bold text-blue-300">
            {stats.closeToNext.toLocaleString()}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Within 2 days and 10 hours of the next level
          </p>
        </div>

        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
          <p className="text-sm text-gray-400">
            Only Need Days
          </p>

          <p className="mt-2 text-3xl font-bold text-green-300">
            {stats.onlyNeedsDays.toLocaleString()}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Hour requirement already met
          </p>
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
          <p className="text-sm text-gray-400">
            Only Need Hours
          </p>

          <p className="mt-2 text-3xl font-bold text-purple-300">
            {stats.onlyNeedsHours.toLocaleString()}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Day requirement already met
          </p>
        </div>

        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5">
          <p className="text-sm text-gray-400">
            Need Days & Hours
          </p>

          <p className="mt-2 text-3xl font-bold text-orange-300">
            {stats.needsDaysAndHours.toLocaleString()}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Missing both requirements for the next level
          </p>
        </div>
      </div>
    </section>
  );
}