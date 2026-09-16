import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

type ParsedReward = {
  rewardMonth: string;
  whoDrop: string;
  rewardType: string;
  rewardName: string;
  handle: string;
  level: string;
  gift: string;
  coins: number;
  money: number;
  agentReceivedDate: string | null;
  dropPayCreatorDate: string | null;
  rankingDate: string | null;
  agent: string;
  receivingAgent: string;
};

function normalizeHandle(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

function createRewardFingerprint(
  reward: ParsedReward
) {
  return [
    reward.rewardMonth,
    normalizeHandle(reward.handle),
    reward.rewardType,
    reward.rewardName,
    reward.level,
    reward.gift,
    reward.coins,
    reward.agent,
    reward.receivingAgent,
  ]
    .map((value) =>
      String(value ?? "")
        .trim()
        .toLowerCase()
    )
    .join("|");
}

function cleanDate(value: string | null) {
  if (!value) return null;

  const cleaned = value.trim();

  if (
    !cleaned ||
    cleaned === "–" ||
    cleaned === "-"
  ) {
    return null;
  }

  const parsed = new Date(cleaned);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

export async function POST(
  request: Request
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const { data: roleRow, error: roleError } =
      await supabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", user.id)
        .maybeSingle();

    if (roleError) {
      console.error(
        "Reward import role lookup error:",
        roleError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify admin access.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !roleRow ||
      roleRow.status !== "active" ||
      roleRow.role !== "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Admin access required.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const rewards = body?.rewards as
      | ParsedReward[]
      | undefined;

    if (
      !Array.isArray(rewards) ||
      rewards.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No rewards were provided.",
        },
        {
          status: 400,
        }
      );
    }

    const admin = createAdminClient();

    //
    // Load creator profiles once
    //
    const {
      data: creatorProfiles,
      error: creatorError,
    } = await admin
      .from("crownlink_profiles")
      .select(
        "id, tiktok_username, display_name"
      );

    if (creatorError) {
      console.error(
        "Creator profile lookup error:",
        creatorError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load creator profiles for reward linking.",
        },
        {
          status: 500,
        }
      );
    }

    //
    // Build username -> creator profile map
    //
    const creatorMap = new Map<
      string,
      {
        id: string;
        display_name: string | null;
      }
    >();

    for (const profile of creatorProfiles ?? []) {
      const normalizedUsername =
        normalizeHandle(
          profile.tiktok_username
        );

      if (!normalizedUsername) {
        continue;
      }

      creatorMap.set(
        normalizedUsername,
        {
          id: profile.id,
          display_name:
            profile.display_name,
        }
      );
    }

    //
    // Prepare rewards and link creators
    //
    const preparedRewards =
      rewards.map((reward) => {
        const normalizedHandle =
          normalizeHandle(
            reward.handle
          );

        const matchedCreator =
          creatorMap.get(
            normalizedHandle
          );

        return {
          reward_month:
            reward.rewardMonth?.trim() ||
            null,

          who_drop:
            reward.whoDrop?.trim() ||
            null,

          reward_type:
            reward.rewardType?.trim() ||
            null,

          reward_name:
            reward.rewardName?.trim() ||
            null,

          handle:
            normalizedHandle,

          level:
            reward.level?.trim() ||
            null,

          gift:
            reward.gift?.trim() ||
            null,

          coins:
            Number(reward.coins) || 0,

          money:
            Number(reward.money) || 0,

          agent_received_date:
            cleanDate(
              reward.agentReceivedDate
            ),

          drop_pay_creator_date:
            cleanDate(
              reward.dropPayCreatorDate
            ),

          ranking_date:
            cleanDate(
              reward.rankingDate
            ),

          agent:
            reward.agent?.trim() ||
            null,

          receiving_agent:
            reward.receivingAgent?.trim() ||
            null,

          creator_id:
            matchedCreator?.id ||
            null,

          import_fingerprint:
            createRewardFingerprint(
              reward
            ),
        };
      });

    const fingerprints =
      preparedRewards.map(
        (reward) =>
          reward.import_fingerprint
      );

    //
    // Check existing rewards
    //
    const {
      data: existingRewards,
      error: existingError,
    } = await admin
      .from("rewards")
      .select("import_fingerprint")
      .in(
        "import_fingerprint",
        fingerprints
      );

    if (existingError) {
      console.error(
        "Existing reward lookup error:",
        existingError
      );

      return NextResponse.json(
        {
          error:
            "Unable to check existing rewards.",
        },
        {
          status: 500,
        }
      );
    }

    const existingSet =
      new Set(
        (
          existingRewards ?? []
        ).map(
          (reward) =>
            reward.import_fingerprint
        )
      );

    //
    // Prevent duplicates inside same import too
    //
    const uniqueWithinImport =
      new Map<
        string,
        (typeof preparedRewards)[number]
      >();

    for (
      const reward of preparedRewards
    ) {
      if (
        !existingSet.has(
          reward.import_fingerprint
        )
      ) {
        uniqueWithinImport.set(
          reward.import_fingerprint,
          reward
        );
      }
    }

    const newRewards =
      Array.from(
        uniqueWithinImport.values()
      );

    if (newRewards.length > 0) {
      const { error: insertError } =
        await admin
          .from("rewards")
          .insert(newRewards);

      if (insertError) {
        console.error(
          "Reward insert error:",
          insertError
        );

        return NextResponse.json(
          {
            error: `Unable to save the rewards: ${insertError.message}`,
          },
          {
            status: 500,
          }
        );
      }
    }

    const duplicateCount =
      rewards.length -
      newRewards.length;

    const linkedCount =
      newRewards.filter(
        (reward) =>
          Boolean(
            reward.creator_id
          )
      ).length;

    const unlinkedCount =
      newRewards.length -
      linkedCount;

    //
    // Save import history
    //
    const {
      error:
        importHistoryError,
    } = await admin
      .from("reward_imports")
      .insert({
        imported_by:
          user.id,
        total_records:
          rewards.length,
        new_records:
          newRewards.length,
        duplicate_records:
          duplicateCount,
        error_records: 0,
      });

    if (
      importHistoryError
    ) {
      console.error(
        "Reward import history error:",
        importHistoryError
      );
    }

    return NextResponse.json({
      success: true,
      total:
        rewards.length,
      inserted:
        newRewards.length,
      duplicates:
        duplicateCount,
      linked:
        linkedCount,
      unlinked:
        unlinkedCount,
    });
  } catch (error) {
    console.error(
      "Reward import route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while importing rewards.",
      },
      {
        status: 500,
      }
    );
  }
}