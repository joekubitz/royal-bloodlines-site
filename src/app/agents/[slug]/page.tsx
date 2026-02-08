import { agents } from "@/data/agents";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const agent = agents.find((a) => a.slug === slug);

  if (!agent) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-20">
        <h1 className="text-3xl font-bold mb-3">Agent not found</h1>
        <p className="text-white/70">That link doesn’t match an agent yet.</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-20">
      <h1 className="text-4xl font-bold mb-4">{agent.name}</h1>

      <p className="text-white/70 mb-6">{agent.bio}</p>

      <a
        href={agent.joinLink}
        target="_blank"
        rel="noreferrer"
        className="bg-white/10 border border-white/20 px-6 py-3 rounded-xl hover:bg-white/20 transition inline-block"
      >
        Join under {agent.name}
      </a>
    </main>
  );
}

