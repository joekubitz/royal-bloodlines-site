export type CreatorTier =
  | "Tier 1"
  | "Tier 2"
  | "Tier 3"
  | "Tier 4"
  | "Tier 5"
  | "Tier 6"
  | "Tier 7"
  | "Tier 8"
  | "Tier 9";

export type TierRule = {
  tier: CreatorTier;
  minimumDiamonds: number;
};

export const tierRules: TierRule[] = [
  {
    tier: "Tier 1",
    minimumDiamonds: 0,
  },
  {
    tier: "Tier 2",
    minimumDiamonds: 100_000,
  },
  {
    tier: "Tier 3",
    minimumDiamonds: 200_000,
  },
  {
    tier: "Tier 4",
    minimumDiamonds: 300_000,
  },
  {
    tier: "Tier 5",
    minimumDiamonds: 500_000,
  },
  {
    tier: "Tier 6",
    minimumDiamonds: 1_000_000,
  },
  {
    tier: "Tier 7",
    minimumDiamonds: 1_600_000,
  },
  {
    tier: "Tier 8",
    minimumDiamonds: 3_000_000,
  },
  {
    tier: "Tier 9",
    minimumDiamonds: 5_000_000,
  },
];

export function getCreatorTier(
  diamonds: number
): CreatorTier {
  const safeDiamonds = Math.max(
    0,
    Number(diamonds || 0)
  );

  let currentTier: CreatorTier =
    "Tier 1";

  for (const rule of tierRules) {
    if (
      safeDiamonds >=
      rule.minimumDiamonds
    ) {
      currentTier =
        rule.tier;
    }
  }

  return currentTier;
}

export function getTierNumber(
  tier: CreatorTier
) {
  return Number(
    tier.replace(
      "Tier ",
      ""
    )
  );
}

export function getRankUp({
  currentDiamonds,
  lastMonthDiamonds,
}: {
  currentDiamonds: number;
  lastMonthDiamonds: number;
}) {
  const previousTier =
    getCreatorTier(
      lastMonthDiamonds
    );

  const currentTier =
    getCreatorTier(
      currentDiamonds
    );

  const previousTierNumber =
    getTierNumber(
      previousTier
    );

  const currentTierNumber =
    getTierNumber(
      currentTier
    );

  const rankedUp =
    currentTierNumber >
    previousTierNumber;

  return {
    rankedUp,
    previousTier,
    currentTier,
    tiersGained:
      rankedUp
        ? currentTierNumber -
          previousTierNumber
        : 0,
  };
}