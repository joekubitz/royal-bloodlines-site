import Link from "next/link";

export default function JoinPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
        <div className="text-xs tracking-[0.25em] text-white/60">ROYALS BLOODLINE</div>

        <h1 className="mt-3 text-3xl md:text-5xl font-semibold">
          Join Royals Bloodline
        </h1>

        <p className="mt-4 max-w-3xl text-white/70 leading-relaxed">
          No minimum followers. United States or Canada. Must be 18+. To stay active:
          <span className="font-semibold text-white"> 12 days</span> and
          <span className="font-semibold text-white"> 25 hours</span> live time.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-white/75">
          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <div className="font-semibold text-white">1) Review requirements</div>
            <div className="mt-2">Make sure you meet the basics before you apply.</div>
            <Link href="/requirements" className="mt-3 inline-block text-white/80 hover:text-white">
              View Requirements →
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <div className="font-semibold text-white">2) Choose an agent</div>
            <div className="mt-2">Pick the agent you want to work with and read their profile.</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <div className="font-semibold text-white">3) Use their join link</div>
            <div className="mt-2">Each agent has their own link so onboarding stays organized.</div>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link
            href="/agents"
            className="rb-gold-button px-6 py-3 rounded-2xl text-sm font-semibold text-center"
          >
            Choose an Agent
          </Link>

          <Link
            href="/requirements"
            className="rounded-2xl border border-white/15 bg-black/20 px-6 py-3 text-sm text-white/80 hover:text-white hover:bg-black/30 transition text-center"
          >
            Requirements
          </Link>
        </div>
      </div>
    </main>
  );
}
