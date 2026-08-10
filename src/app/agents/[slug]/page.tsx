import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../supabase/server";
import TrackedJoinButton from "./TrackedJoinButton";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type Agent = {
  id: number;
  slug: string;
  name: string;
  bio: string;
  join_link: string | null;
  image: string | null;
};

export default async function AgentProfile({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: agent, error } = await supabase
    .from("agents")
    .select("id, slug, name, bio, join_link, image")
    .eq("slug", slug)
    .single();

  if (error || !agent) {
    notFound();
  }

  const typedAgent = agent as Agent;
  const joinLabel = typedAgent.name.split(" - ")[0];

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <Link
        href="/agents"
        className="text-sm text-white/65 transition hover:text-white"
      >
        ← Back to Agents
      </Link>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_0_80px_rgba(0,0,0,0.45)] backdrop-blur md:p-10">
        <div className="text-xs tracking-[0.25em] text-white/60">
          ROYALS BLOODLINE
        </div>

        <div className="mt-6 grid grid-cols-1 items-start gap-8 md:grid-cols-[280px_1fr]">
          <div className="w-full">
            {typedAgent.image ? (
              <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-[0_0_60px_rgba(255,180,50,0.08)]">
                <Image
                  src={typedAgent.image}
                  alt={`${typedAgent.name} profile image`}
                  fill
                  className="object-cover"
                  priority
                />

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              </div>
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-3xl border border-white/10 bg-black/20 text-sm text-white/40">
                No image yet
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-semibold md:text-5xl">
              {typedAgent.name}
            </h1>

            <div className="mt-4 max-w-3xl whitespace-pre-line leading-relaxed text-white/75">
              {typedAgent.bio}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {typedAgent.join_link ? (
                <TrackedJoinButton
                  href={typedAgent.join_link}
                  agentSlug={typedAgent.slug}
                  label={`Join with ${joinLabel}`}
                />
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-center text-sm text-white/50">
                  Join link not available yet
                </div>
              )}

              <Link
                href="/agents"
                className="rounded-2xl border border-white/15 bg-black/20 px-6 py-3 text-center text-sm text-white/80 transition hover:bg-black/30 hover:text-white"
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