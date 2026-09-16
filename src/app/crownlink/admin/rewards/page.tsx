import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";
import RewardActions from "./RewardActions";
import RewardProofButton from "./RewardProofButton";

type Reward = {
  id: string;
  reward_month: string | null;
  who_drop: string | null;
  reward_type: string | null;
  reward_name: string | null;
  handle: string;
  level: string | null;
  gift: string | null;
  coins: number | null;
  money: number | string | null;
  agent: string | null;
  receiving_agent: string | null;
  dropped: boolean;
  dropped_at: string | null;
  dropped_by: string | null;
  dropped_by_name: string | null;
  proof_url: string | null;
  drop_notes: string | null;
  typical_live_times: {
    text?: string;
  } | null;
  live_timezone: string | null;
  live_times_updated_at: string | null;
  created_at: string;
};

function formatMoney(value: number | string | null) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatNumber(value: number | null) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTimezone(value: string | null) {
  switch (value) {
    case "America/New_York":
      return "Eastern Time";
    case "America/Chicago":
      return "Central Time";
    case "America/Denver":
      return "Mountain Time";
    case "America/Los_Angeles":
      return "Pacific Time";
    default:
      return value || "—";
  }
}

type SearchParams = Promise<{
  tab?: string;
}>;

export default async function RewardsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const activeTab =
    params.tab === "dropped"
      ? "dropped"
      : "pending";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/crownlink/login");
  }

  const { data: roleRow, error: roleError } =
    await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

  if (roleError) {
    console.error(
      "Rewards role lookup error:",
      roleError
    );

    redirect("/crownlink");
  }

  if (
    !roleRow ||
    roleRow.status !== "active" ||
    roleRow.role !== "admin"
  ) {
    redirect("/crownlink");
  }

  const admin = createAdminClient();

  const { data: rewardsData, error } =
    await admin
      .from("rewards")
      .select(
        `
        id,
        reward_month,
        who_drop,
        reward_type,
        reward_name,
        handle,
        level,
        gift,
        coins,
        money,
        agent,
        receiving_agent,
        dropped,
        dropped_at,
        dropped_by,
        dropped_by_name,
        proof_url,
        drop_notes,
        typical_live_times,
        live_timezone,
        live_times_updated_at,
        created_at
        `
      )
      .order("dropped", {
        ascending: true,
      })
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    console.error(
      "Rewards load error:",
      error
    );
  }

  const rewards =
    (rewardsData ?? []) as Reward[];

  const pendingRewards =
    rewards.filter(
      (reward) => !reward.dropped
    );

  const droppedRewards =
    rewards.filter(
      (reward) => reward.dropped
    );

  const pendingCoins =
    pendingRewards.reduce(
      (total, reward) =>
        total +
        Number(reward.coins ?? 0),
      0
    );

  const pendingMoney =
    pendingRewards.reduce(
      (total, reward) =>
        total +
        Number(reward.money ?? 0),
      0
    );

  const displayedRewards =
    activeTab === "dropped"
      ? droppedRewards
      : pendingRewards;

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">
              Bloodline Arena
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
              Rewards
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Track creator rewards, gifts, coin amounts, and fulfillment status.
            </p>
          </div>

          <Link
            href="/crownlink/admin/rewards/import"
            className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold"
            style={{
              backgroundColor: "#f59e0b",
              color: "#000000",
              border: "1px solid #fbbf24",
            }}
          >
            Import Rewards
          </Link>
        </div>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-400">
              Needs Dropped
            </p>

            <p className="mt-2 text-3xl font-bold">
              {pendingRewards.length}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-400">
              Dropped
            </p>

            <p className="mt-2 text-3xl font-bold">
              {droppedRewards.length}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-400">
              Pending Coins
            </p>

            <p className="mt-2 text-3xl font-bold">
              {formatNumber(
                pendingCoins
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-400">
              Pending Value
            </p>

            <p className="mt-2 text-3xl font-bold">
              {formatMoney(
                pendingMoney
              )}
            </p>
          </div>
        </section>

        <div className="mb-5 flex flex-wrap gap-3">
          <Link
            href="/crownlink/admin/rewards?tab=pending"
            className="rounded-xl px-5 py-3 text-sm font-bold transition"
            style={{
              backgroundColor:
                activeTab === "pending"
                  ? "#f59e0b"
                  : "#18181b",
              color:
                activeTab === "pending"
                  ? "#000000"
                  : "#ffffff",
              border:
                activeTab === "pending"
                  ? "1px solid #fbbf24"
                  : "1px solid #52525b",
            }}
          >
            Needs Dropped ({pendingRewards.length})
          </Link>

          <Link
            href="/crownlink/admin/rewards?tab=dropped"
            className="rounded-xl px-5 py-3 text-sm font-bold transition"
            style={{
              backgroundColor:
                activeTab === "dropped"
                  ? "#16a34a"
                  : "#18181b",
              color: "#ffffff",
              border:
                activeTab === "dropped"
                  ? "1px solid #22c55e"
                  : "1px solid #52525b",
            }}
          >
            Dropped Gifts ({droppedRewards.length})
          </Link>
        </div>

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          <div className="border-b border-zinc-800 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {activeTab === "dropped"
                    ? "Dropped Gifts"
                    : "Reward Queue"}
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  {activeTab === "dropped"
                    ? "Completed rewards and delivery proof."
                    : "Rewards that still need to be fulfilled."}
                </p>
              </div>

              <span className="rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs text-zinc-400">
                {displayedRewards.length} total
              </span>
            </div>
          </div>

          {displayedRewards.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-lg font-semibold">
                {activeTab === "dropped"
                  ? "No dropped gifts yet"
                  : "No rewards need dropping"}
              </p>

              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                {activeTab === "dropped"
                  ? "Completed rewards will appear here with their proof."
                  : "You're all caught up."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {displayedRewards.map(
                (reward) => (
                  <div
                    key={reward.id}
                    className="p-5 sm:p-6"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-bold">
                            @{reward.handle}
                          </h3>

                          {reward.dropped ? (
                            <span
                              className="rounded-full px-3 py-1 text-xs font-bold"
                              style={{
                                backgroundColor: "#166534",
                                color: "#ffffff",
                                border:
                                  "1px solid #22c55e",
                              }}
                            >
                              ✓ Dropped
                            </span>
                          ) : (
                            <span
                              className="rounded-full px-3 py-1 text-xs font-bold"
                              style={{
                                backgroundColor: "#78350f",
                                color: "#fef3c7",
                                border:
                                  "1px solid #f59e0b",
                              }}
                            >
                              Needs Dropped
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-zinc-400">
                          {reward.reward_name ||
                            "Reward"}

                          {reward.reward_type
                            ? ` · ${reward.reward_type}`
                            : ""}
                        </p>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <p className="text-xs text-zinc-500">
                              Gift
                            </p>

                            <p className="mt-1 font-medium">
                              {reward.gift || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-zinc-500">
                              Coins
                            </p>

                            <p className="mt-1 font-medium">
                              {formatNumber(
                                reward.coins
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-zinc-500">
                              Value
                            </p>

                            <p className="mt-1 font-medium">
                              {formatMoney(
                                reward.money
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-zinc-500">
                              Month
                            </p>

                            <p className="mt-1 font-medium">
                              {reward.reward_month ||
                                "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-zinc-500">
                              Agent
                            </p>

                            <p className="mt-1 font-medium">
                              {reward.agent || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-zinc-500">
                              Level
                            </p>

                            <p className="mt-1 font-medium">
                              {reward.level || "—"}
                            </p>
                          </div>

                          {reward.dropped ? (
                            <>
                              <div>
                                <p className="text-xs text-zinc-500">
                                  Dropped
                                </p>

                                <p className="mt-1 font-medium">
                                  {formatDate(
                                    reward.dropped_at
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-zinc-500">
                                  Dropped By
                                </p>

                                <p className="mt-1 font-medium">
                                  {reward.dropped_by_name ||
                                    "Admin"}
                                </p>
                              </div>
                            </>
                          ) : null}
                        </div>

                        {!reward.dropped ? (
                          <div
                            className="mt-5 rounded-xl p-4"
                            style={{
                              border:
                                reward.typical_live_times?.text
                                  ? "1px solid rgba(34,197,94,0.28)"
                                  : "1px solid rgba(245,158,11,0.28)",
                              background:
                                reward.typical_live_times?.text
                                  ? "rgba(34,197,94,0.06)"
                                  : "rgba(245,158,11,0.06)",
                            }}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p
                                  className="text-xs font-semibold uppercase tracking-wide"
                                  style={{
                                    color:
                                      reward.typical_live_times?.text
                                        ? "#86efac"
                                        : "#fbbf24",
                                  }}
                                >
                                  Creator LIVE Times
                                </p>

                                <p className="mt-1 text-xs text-zinc-500">
                                  Submitted to help the reward team catch the creator while they are LIVE.
                                </p>
                              </div>

                              <span
                                className="rounded-full px-3 py-1 text-xs font-bold"
                                style={{
                                  backgroundColor:
                                    reward.typical_live_times?.text
                                      ? "#14532d"
                                      : "#78350f",
                                  color:
                                    reward.typical_live_times?.text
                                      ? "#dcfce7"
                                      : "#fef3c7",
                                  border:
                                    reward.typical_live_times?.text
                                      ? "1px solid #22c55e"
                                      : "1px solid #f59e0b",
                                }}
                              >
                                {reward.typical_live_times?.text
                                  ? "LIVE Times Submitted"
                                  : "Waiting on Creator"}
                              </span>
                            </div>

                            {reward.typical_live_times?.text ? (
                              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div>
                                  <p className="text-xs text-zinc-500">
                                    Typical LIVE Times
                                  </p>

                                  <p
                                    className="mt-1 whitespace-pre-line text-sm font-medium text-zinc-200"
                                  >
                                    {reward.typical_live_times.text}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs text-zinc-500">
                                    Timezone
                                  </p>

                                  <p className="mt-1 text-sm font-medium text-zinc-200">
                                    {formatTimezone(
                                      reward.live_timezone
                                    )}
                                  </p>

                                  {reward.live_times_updated_at ? (
                                    <>
                                      <p className="mt-4 text-xs text-zinc-500">
                                        Submitted
                                      </p>

                                      <p className="mt-1 text-sm font-medium text-zinc-200">
                                        {formatDate(
                                          reward.live_times_updated_at
                                        )}
                                      </p>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                              <p className="mt-4 text-sm text-zinc-400">
                                The creator has not submitted their typical LIVE times yet.
                              </p>
                            )}

                            <p className="mt-4 text-xs leading-5 text-zinc-500">
                              These times are only a guide and do not guarantee a specific reward delivery time.
                            </p>
                          </div>
                        ) : null}

                        {reward.dropped &&
                        reward.drop_notes ? (
                          <div className="mt-5 rounded-xl border border-zinc-800 bg-black p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                              Drop Notes
                            </p>

                            <p className="mt-2 text-sm text-zinc-300">
                              {reward.drop_notes}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-3">
                        {!reward.dropped ? (
                          <RewardActions
                            rewardId={reward.id}
                            dropped={reward.dropped}
                          />
                        ) : (
                          <RewardProofButton
                            proofPath={
                              reward.proof_url
                            }
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}