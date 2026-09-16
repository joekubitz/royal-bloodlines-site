"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

function cleanNullable(value: string) {
  const cleaned = value.trim();

  if (
    !cleaned ||
    cleaned === "–" ||
    cleaned === "-" ||
    cleaned.toLowerCase() === "null"
  ) {
    return null;
  }

  return cleaned;
}

function parseCoins(value: string) {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseMoney(value: string) {
  const parsed = Number(
    value.replace(/[$,]/g, "").trim()
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function parseRewardsPaste(input: string) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^\d+\s+records?$/i.test(line));

  const fieldsPerRecord = 14;

  if (lines.length === 0) {
    return [];
  }

  if (lines.length % fieldsPerRecord !== 0) {
    throw new Error(
      `I found ${lines.length} values. That does not divide evenly into groups of ${fieldsPerRecord}. Make sure you copied complete reward rows from Airtable.`
    );
  }

  const rewards: ParsedReward[] = [];

  for (
    let index = 0;
    index < lines.length;
    index += fieldsPerRecord
  ) {
    const row = lines.slice(
      index,
      index + fieldsPerRecord
    );

    rewards.push({
      rewardMonth: row[0],
      whoDrop: row[1],
      rewardType: row[2],
      rewardName: row[3],
      handle: row[4],
      level: row[5],
      gift: row[6],
      coins: parseCoins(row[7]),
      money: parseMoney(row[8]),
      agentReceivedDate: cleanNullable(row[9]),
      dropPayCreatorDate: cleanNullable(row[10]),
      rankingDate: cleanNullable(row[11]),
      agent: row[12],
      receivingAgent: row[13],
    });
  }

  return rewards;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(
    value
  );
}

export default function ImportRewardsForm() {
  const router = useRouter();

  const [rawText, setRawText] = useState("");
  const [parsedRewards, setParsedRewards] =
    useState<ParsedReward[]>([]);
  const [error, setError] = useState("");
  const [importing, setImporting] =
    useState(false);
  const [result, setResult] = useState<{
    total: number;
    inserted: number;
    duplicates: number;
  } | null>(null);

  const totals = useMemo(() => {
    return parsedRewards.reduce(
      (acc, reward) => {
        acc.coins += reward.coins;
        acc.money += reward.money;
        return acc;
      },
      {
        coins: 0,
        money: 0,
      }
    );
  }, [parsedRewards]);

  function previewImport() {
    setError("");
    setResult(null);

    try {
      const rewards =
        parseRewardsPaste(rawText);

      if (rewards.length === 0) {
        setError(
          "Paste some Airtable reward data first."
        );
        return;
      }

      setParsedRewards(rewards);
    } catch (err) {
      setParsedRewards([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to parse the pasted rewards."
      );
    }
  }

  async function importRewards() {
    if (parsedRewards.length === 0) {
      return;
    }

    setImporting(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "/api/crownlink/admin/rewards/import",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rewards: parsedRewards,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to import rewards."
        );
      }

      setResult({
        total: data.total,
        inserted: data.inserted,
        duplicates: data.duplicates,
      });

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to import rewards."
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold">
            Paste Airtable Rewards
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Copy the reward rows exactly as they
            appear in Airtable and paste them here.
          </p>
        </div>

        <textarea
          value={rawText}
          onChange={(event) => {
            setRawText(event.target.value);
            setParsedRewards([]);
            setResult(null);
            setError("");
          }}
          placeholder={`Aug 2026
Agent drop
Milestone
Milestone
livingmybestlyfe2024
100k
Galaxy
1,000
$10.40
–
–
–
camera kings
camera kings`}
          className="mt-5 min-h-[320px] w-full resize-y rounded-xl border border-zinc-800 bg-black px-4 py-4 font-mono text-sm text-zinc-200 outline-none transition placeholder:text-zinc-700 focus:border-orange-500"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={previewImport}
            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-400"
          >
            Preview Import
          </button>

          <button
            type="button"
            onClick={() => {
              setRawText("");
              setParsedRewards([]);
              setResult(null);
              setError("");
            }}
            className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900"
          >
            Clear
          </button>
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="mt-5 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-4 text-sm text-green-200">
            <p className="font-semibold">
              Import complete
            </p>

            <p className="mt-1">
              {result.inserted} new rewards
              imported. {result.duplicates} existing
              rewards were skipped.
            </p>
          </div>
        ) : null}
      </section>

      {parsedRewards.length > 0 ? (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-sm text-zinc-500">
                Records Found
              </p>

              <p className="mt-2 text-3xl font-bold">
                {parsedRewards.length}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-sm text-zinc-500">
                Total Coins
              </p>

              <p className="mt-2 text-3xl font-bold">
                {formatNumber(totals.coins)}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-sm text-zinc-500">
                Total Value
              </p>

              <p className="mt-2 text-3xl font-bold">
                {formatMoney(totals.money)}
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
            <div className="flex flex-col gap-4 border-b border-zinc-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Import Preview
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Review the parsed rewards before
                  importing them.
                </p>
              </div>

              <button
                type="button"
                onClick={importRewards}
                disabled={importing}
                className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importing
                  ? "Importing..."
                  : `Import ${parsedRewards.length} Rewards`}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-black/50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-5 py-4">
                      Creator
                    </th>
                    <th className="px-5 py-4">
                      Month
                    </th>
                    <th className="px-5 py-4">
                      Type
                    </th>
                    <th className="px-5 py-4">
                      Reward
                    </th>
                    <th className="px-5 py-4">
                      Level
                    </th>
                    <th className="px-5 py-4">
                      Gift
                    </th>
                    <th className="px-5 py-4">
                      Coins
                    </th>
                    <th className="px-5 py-4">
                      Value
                    </th>
                    <th className="px-5 py-4">
                      Agent
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-900">
                  {parsedRewards.map(
                    (reward, index) => (
                      <tr
                        key={`${reward.handle}-${index}`}
                      >
                        <td className="px-5 py-4 font-semibold">
                          @{reward.handle}
                        </td>

                        <td className="px-5 py-4">
                          {reward.rewardMonth}
                        </td>

                        <td className="px-5 py-4">
                          {reward.rewardType}
                        </td>

                        <td className="px-5 py-4">
                          {reward.rewardName}
                        </td>

                        <td className="px-5 py-4">
                          {reward.level}
                        </td>

                        <td className="px-5 py-4 font-medium">
                          {reward.gift}
                        </td>

                        <td className="px-5 py-4">
                          {formatNumber(
                            reward.coins
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {formatMoney(
                            reward.money
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {reward.agent}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}