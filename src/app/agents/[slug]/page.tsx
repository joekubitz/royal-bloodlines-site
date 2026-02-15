import Image from "next/image";
import Link from "next/link";
import { agents } from "@/data/agents";
import TrackedJoinButton from "./TrackedJoinButton";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AgentProfile({ params }: PageProps) {
  const { slug } = await params;

  const agent = agents.find((a) => a.slug === slug);

  if (!agent) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-3xl font-semibold">Agent not found</h1>
        <p className="mt-2 text-white/70">That link doesn’t match an agent yet.</p>
        <Link
          href="/agents"
          className="mt-6 inline-flex rb-gold-button px-6 py-3 rounded-2xl text-sm font-semibold"
        >
          Back to Agents
        </Link>
      </main>
    );
  }

  const joinLabel = agent.name.split(" - ")[0];

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <Link href="/agents" className="text-white/70 hover:text-white transition">
        ← Back to Agents
      </Link>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10 shadow-[0_0_80px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="text-xs tracking-[0.25em] text-white/60">ROYAL BLOODLINES</div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 items-start">
          <div className="w-full">
            {agent.image ? (
              <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-[0_0_60px_rgba(255,180,50,0.08)]">
                <Image
                  src={agent.image}
                  alt={`${agent.name} profile image`}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              </div>
            ) : (
              <div className="aspect-square w-full rounded-3xl border border-white/10 bg-black/20 flex items-center justify-center text-white/40 text-sm">
                No image yet
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl md:text-5xl font-semibold">{agent.name}</h1>

            <div className="mt-4 max-w-3xl text-white/75 leading-relaxed whitespace-pre-line">
              {agent.bio}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              {/* Join Button (TRACKED - client component) */}
              <TrackedJoinButton
                href={agent.joinLink}
                agentSlug={agent.slug}
                label={`Join with ${joinLabel}`}
              />

              <Link
                href="/agents"
                className="rounded-2xl border border-white/15 bg-black/20 px-6 py-3 text-sm text-white/80 hover:text-white hover:bg-black/30 transition text-center"
              >
                Back to list
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
