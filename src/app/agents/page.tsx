"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { agents } from "@/data/agents";

export default function AgentsPage() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return agents;

    return agents.filter((a) => {
      const hay = `${a.name} ${a.bioShort} ${a.slug}`.toLowerCase();
      return hay.includes(query);
    });
  }, [q]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">

      {/* Header */}
      <div className="text-xs tracking-[0.25em] text-white/60">
        ROYALS BLOODLINE
      </div>

      <div className="mt-3 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-6xl font-semibold">
            Choose Your Agent
          </h1>

          <p className="mt-3 max-w-2xl text-white/70">
            Pick the agent you want to work with. Each agent has their own onboarding and support style.
          </p>
        </div>

        {/* Search */}
        <div className="w-full md:w-[360px]">
          <label className="text-xs tracking-[0.25em] text-white/60">
            SEARCH
          </label>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search agent name..."
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/90 placeholder:text-white/40 outline-none focus:ring-2 focus:ring-yellow-600/30"
          />
        </div>
      </div>


      {/* Agent cards */}
      <section className="mt-10">

        <div className="text-sm text-white/60 mb-4">
          Showing <span className="text-white">{filtered.length}</span> agent
          {filtered.length !== 1 ? "s" : ""}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {filtered.map((agent) => (
            <Link
              key={agent.slug}
              href={`/agents/${agent.slug}`}
              className="group rounded-3xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition"
            >
              <div className="text-lg font-semibold">
                {agent.name}
              </div>

              <div className="mt-2 text-sm text-white/70 leading-relaxed">
                {agent.bioShort}
              </div>

              <div className="mt-4 text-sm text-white/60 group-hover:text-white transition">
                View profile →
              </div>

            </Link>
          ))}

        </div>


        {/* No results state */}
        {filtered.length === 0 && (
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 text-white/70">
            No agents match that search.
          </div>
        )}

      </section>


      {/* Bottom CTA */}
      <section className="mt-14">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

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
            className="rb-gold-button px-6 py-3 rounded-2xl text-sm font-semibold text-center"
          >
            Join Now
          </Link>

        </div>
      </section>

    </main>
  );
}

