import Link from "next/link";
import { agents } from "@/data/agents";

export default function AgentsPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-20">

      <h1 className="text-4xl font-bold mb-8">
        Agents
      </h1>

      <div className="grid md:grid-cols-3 gap-6">

        {agents.map(agent => (

          <Link
            key={agent.slug}
            href={`/agents/${agent.slug}`}
            className="border border-white/20 p-6 rounded-xl hover:bg-white/10 transition"
          >
            <h2 className="text-xl font-semibold mb-2">
              {agent.name}
            </h2>

            <p className="text-white/60">
              {agent.bio}
            </p>

          </Link>

        ))}

      </div>

    </main>
  );
}
