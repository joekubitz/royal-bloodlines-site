import Link from "next/link";
import { agents } from "@/data/agents";

export default function AgentsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-20">
      <div className="text-xs tracking-[0.25em] text-white/60">ROYAL BLOODLINES</div>

      <h1 className="mt-3 text-4xl md:text-6xl font-semibold">
        Choose Your Agent
      </h1>

      <p className="mt-4 max-w-2xl text-white/70">
        Each agent has their own recruiting style, expectations, and direct join link.
        Choose the one that aligns with your goals.
      </p>

      {/* Agent Cards */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        {agents.map((agent) => (
  <Link
    key={agent.slug}
    href={`/agents/${agent.slug}`}
    className="group rounded-3xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition block"
  >
    <div className="text-lg font-semibold">{agent.name}</div>
    <div className="mt-2 text-sm text-white/70">{agent.bioShort}</div>
    <div className="mt-4 text-sm text-yellow-400">View profile →</div>
  </Link>
))}

      </div>
    </main>
  );
}
