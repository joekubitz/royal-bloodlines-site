export type CreatorLevel =
  | "Level 1"
  | "Level 2"
  | "Level 3"
  | "Level 4"
  | "Level 5"
  | "Not Qualified";

export type LevelRule = {
  level: CreatorLevel;
  diamonds: number;
  days: number;
  hours: number;
  bonusRatio: number;
};

export const levelRules: LevelRule[] = [
  {
    level: "Level 1",
    diamonds: 100,
    days: 8,
    hours: 20,
    bonusRatio: 1,
  },
  {
    level: "Level 2",
    diamonds: 100,
    days: 12,
    hours: 35,
    bonusRatio: 1.5,
  },
  {
    level: "Level 3",
    diamonds: 100,
    days: 15,
    hours: 50,
    bonusRatio: 2.5,
  },
  {
    level: "Level 4",
    diamonds: 100,
    days: 18,
    hours: 70,
    bonusRatio: 3.5,
  },
  {
    level: "Level 5",
    diamonds: 100,
    days: 22,
    hours: 90,
    bonusRatio: 4.5,
  },
];

export function getCreatorLevel({
  diamonds,
  days,
  hours,
}: {
  diamonds: number;
  days: number;
  hours: number;
}): CreatorLevel {
  const qualifiedRules = [...levelRules]
    .reverse()
    .filter(
      (rule) =>
        diamonds >= rule.diamonds &&
        days >= rule.days &&
        hours >= rule.hours
    );

  return qualifiedRules[0]?.level ?? "Not Qualified";
}

export function getNextLevel(
  currentLevel: CreatorLevel
): LevelRule | null {
  if (currentLevel === "Not Qualified") {
    return levelRules[0];
  }

  const index = levelRules.findIndex(
    (rule) => rule.level === currentLevel
  );

  if (
    index === -1 ||
    index === levelRules.length - 1
  ) {
    return null;
  }

  return levelRules[index + 1];
}

export function getLevelProgress({
  diamonds,
  days,
  hours,
}: {
  diamonds: number;
  days: number;
  hours: number;
}) {
  const currentLevel = getCreatorLevel({
    diamonds,
    days,
    hours,
  });

  const nextLevel = getNextLevel(currentLevel);

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      diamondsNeeded: 0,
      daysNeeded: 0,
      hoursNeeded: 0,
    };
  }

  return {
    currentLevel,
    nextLevel,
    diamondsNeeded: Math.max(
      0,
      nextLevel.diamonds - diamonds
    ),
    daysNeeded: Math.max(
      0,
      nextLevel.days - days
    ),
    hoursNeeded: Math.max(
      0,
      nextLevel.hours - hours
    ),
  };
}