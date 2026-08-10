"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../supabase/client";

type Agent = {
  id: number;
  slug: string;
  name: string;
  bio_short: string;
  sort_order: number;
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadAgents() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("agents")
        .select("id, slug, name, bio_short, sort_order")
        .order("sort_order", { ascending: true });

      if (error) {
        setErrorMessage(`Unable to load agents: ${error.message}`);
        setLoading(false);
        return;
      }

      setAgents(data ?? []);
      setLoading(false);
    }

    loadAgents();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    if (!query) {
      return agents;
    }

    return agents.filter((agent) => {
      const searchableText =
        `${agent.name} ${agent.bio_short} ${agent.slug}`.toLowerCase();

      return searchableText.includes(query);
    });
  }, [agents, q]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      {/* Header */}
      <div className="text-xs tracking-[0.25em] text-white/60">
        ROYALS BLOODLINE
      </div>

      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold md:text-6xl">
            Choose Your Agent
          </h1>

          <p className="mt-3 max-w-2xl text-white/70">
            Pick the agent you want to work with. Each agent has their own
            onboarding and support style.
          </p>
        </div>

        {/* Search */}
        <div className="w-full md:w-[360px]">
          <label className="text-xs tracking-[0.25em] text-white/60">
            SEARCH
          </label>

          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search agent name..."
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/90 outline-none placeholder:text-white/40 focus:ring-2 focus:ring-yellow-600/30"
          />
        </div>
      </div>

      {/* Agent cards */}
      <section className="mt-10">
        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/70">
            Loading agents...
          </div>
        ) : errorMessage ? (
          <div className="rounded-3xl border border-red-500/30 bg-red-950/20 p-8 text-red-300">
            {errorMessage}
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-white/60">
              Showing{" "}
              <span className="text-white">{filtered.length}</span> agent
              {filtered.length !== 1 ? "s" : ""}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {filtered.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.slug}`}
                  className="group rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
                >
                  <div className="text-lg font-semibold">
                    {agent.name}
                  </div>

                  <div className="mt-2 text-sm leading-relaxed text-white/70">
                    {agent.bio_short}
                  </div>

                  <div className="mt-4 text-sm text-white/60 transition group-hover:text-white">
                    View profile →
                  </div>
                </Link>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 text-white/70">
                No agents match that search.
              </div>
            )}
          </>
        )}
      </section>

      {/* Bottom CTA */}
      <section className="mt-14">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-white/10 bg-black/20 p-8 md:flex-row md:items-center md:p-10">
          <div>
            <div className="text-2xl font-semibold">
              Ready to join?
            </div>

            <div className="mt-2 text-white/70">
              Choose your agent and start the onboarding process.
            </div>
          </div>

          <Link
            href="/join"
            className="rb-gold-button rounded-2xl px-6 py-3 text-center text-sm font-semibold"
          >
            Join Now
          </Link>
        </div>
      </section>
    </main>
  );
}