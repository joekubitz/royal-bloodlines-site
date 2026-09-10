"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type Result = {
  success?: boolean;
  invited?: boolean;
  reusedExistingAccount?: boolean;
  message?: string;
  error?: string;
};

export default function AgentAccessClient() {
  const [email, setEmail] = useState("");
  const [backstageManager, setBackstageManager] =
    useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(
    null
  );

  function handleEmailChange(value: string) {
    setEmail(value);

    if (
      !backstageManager ||
      backstageManager === email
    ) {
      setBackstageManager(value);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch(
        "/api/admin/analytics/agents/invite",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            backstageManager,
          }),
        }
      );

      const data = (await response.json()) as Result;

      if (!response.ok) {
        setResult({
          error:
            data.error ||
            "Unable to provision agent access.",
        });
        return;
      }

      setResult(data);
      setEmail("");
      setBackstageManager("");
    } catch (error) {
      setResult({
        error:
          error instanceof Error
            ? error.message
            : "Unable to provision agent access.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/analytics"
          className="text-sm text-gray-400 transition hover:text-white"
        >
          ← Back to Analytics
        </Link>

        <div className="mt-8">
          <p className="text-sm uppercase tracking-[0.3em] text-red-500">
            Royals Bloodline
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Agent Analytics Access
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Invite a new agent or connect an existing
            Royals Battles account to their Backstage
            creator roster.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold text-white">
              Login Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(event) =>
                handleEmailChange(event.target.value)
              }
              placeholder="agent@example.com"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500/60"
            />

            <p className="mt-2 text-xs text-gray-500">
              If this email already has an account, its
              existing password will not be changed.
            </p>
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold text-white">
              Backstage Manager Email
            </label>

            <input
              type="email"
              required
              value={backstageManager}
              onChange={(event) =>
                setBackstageManager(
                  event.target.value
                )
              }
              placeholder="agent@example.com"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500/60"
            />

            <p className="mt-2 text-xs text-gray-500">
              This must match the manager value in the
              uploaded TikTok Backstage report.
            </p>
          </div>

          {result?.error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {result.error}
            </div>
          )}

          {result?.success && (
            <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
              {result.message}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-xl bg-red-700 px-4 py-3 font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Provisioning..."
              : "Invite / Add Analytics Access"}
          </button>
        </form>
      </div>
    </main>
  );
}
