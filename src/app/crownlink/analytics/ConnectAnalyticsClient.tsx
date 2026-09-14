"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SearchResult = {
  creator_id: string;
  username: string;
  manager: string | null;
  diamonds: number;
};

export default function ConnectAnalyticsClient() {
  const router = useRouter();

  const [query, setQuery] =
    useState("");

  const [results, setResults] =
    useState<SearchResult[]>([]);

  const [searching, setSearching] =
    useState(false);

  const [submittingId, setSubmittingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  async function searchCreators() {
    const trimmed = query
      .trim()
      .replace(/^@/, "");

    if (trimmed.length < 2) {
      setError(
        "Enter at least 2 characters of your TikTok username."
      );
      return;
    }

    setSearching(true);
    setError("");
    setResults([]);

    try {
      const response = await fetch(
  `/api/crownlink/analytics/search?q=${encodeURIComponent(
    trimmed
  )}`,
        {
          cache: "no-store",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to search creators."
        );
      }

      setResults(
        data.creators ?? []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to search creators."
      );
    } finally {
      setSearching(false);
    }
  }

  async function requestConnection(
    creator: SearchResult
  ) {
    setSubmittingId(
      creator.creator_id
    );

    setError("");

    try {
      const response = await fetch(
  "/api/crownlink/analytics/request",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            creatorId:
              creator.creator_id,

            username:
              creator.username,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to submit request."
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit request."
      );
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-7">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-400">
        Connect Analytics
      </p>

      <h2 className="mt-3 text-2xl font-black">
        Find your TikTok profile
      </h2>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
        Search for your current TikTok
        username. Once you select your
        profile, an administrator will
        verify the connection before you
        can view your analytics.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(event) =>
            setQuery(
              event.target.value
            )
          }
          onKeyDown={(event) => {
            if (
              event.key ===
              "Enter"
            ) {
              searchCreators();
            }
          }}
          placeholder="@yourusername"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-gray-700 focus:border-orange-500/40"
        />

        <button
          type="button"
          onClick={searchCreators}
          disabled={searching}
          className="rounded-xl bg-orange-700 px-6 py-3 font-bold transition hover:bg-orange-600 disabled:opacity-50"
        >
          {searching
            ? "Searching..."
            : "Search"}
        </button>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6 space-y-3">
          {results.map(
            (creator) => (
              <div
                key={
                  creator.creator_id
                }
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/60 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-lg font-black">
                    @{creator.username}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Manager:{" "}
                    {creator.manager ||
                      "Not listed"}
                  </p>

                  <p className="mt-1 text-xs text-gray-600">
                    Current Diamonds:{" "}
                    {Number(
                      creator.diamonds ??
                        0
                    ).toLocaleString()}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    submittingId ===
                    creator.creator_id
                  }
                  onClick={() =>
                    requestConnection(
                      creator
                    )
                  }
                  className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-5 py-3 text-sm font-bold text-orange-300 transition hover:bg-orange-500/20 disabled:opacity-50"
                >
                  {submittingId ===
                  creator.creator_id
                    ? "Submitting..."
                    : "This Is Me"}
                </button>
              </div>
            )
          )}
        </div>
      )}

      {!searching &&
        query &&
        results.length === 0 &&
        !error && (
          <p className="mt-5 text-sm text-gray-500">
            Search for your TikTok
            username to find your
            Backstage profile.
          </p>
        )}
    </section>
  );
}