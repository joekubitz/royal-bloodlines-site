import Link from "next/link";

export default function RequirementsPage() {
  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* glow blobs */}
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <div className="absolute -top-40 left-10 h-[520px] w-[520px] rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -top-28 right-8 h-[440px] w-[440px] rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-4 py-16 relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/70 tracking-[0.25em]">
            STANDARDS • EXPECTATIONS • GROWTH
          </div>

          <h1 className="mt-6 text-4xl md:text-6xl font-semibold leading-tight">
            Requirements.
            <span className="block text-white/70">
              The baseline we build from.
            </span>
          </h1>

          <p className="mt-6 max-w-3xl text-white/70 text-base md:text-lg leading-relaxed">
            Royal Bloodlines is built for creators who want structure, consistency, and real progress.
            These requirements keep the team strong and the results predictable.
          </p>
<div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 md:p-6">
  <div className="text-xs tracking-[0.25em] text-white/60">ACTIVE STANDARD</div>

  <div className="mt-2 text-2xl md:text-3xl font-semibold">
    12 Days • 25 Hours
  </div>

  <div className="mt-2 text-white/70 text-sm">
    To be considered active in Royal Bloodlines, you must hit 12 live days and 25 total live hours.
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
              href="/"
              className="rounded-2xl border border-white/15 bg-black/20 px-6 py-3 text-sm text-white/80 hover:text-white hover:bg-black/30 transition text-center"
            >
              Back Home
            </Link>
          </div>
        </div>
      </section>

      {/* REQUIREMENTS GRID */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
  {
    title: "No Minimum Followers",
    desc: "We don’t gatekeep by numbers. If you’re coachable and consistent, you can grow here.",
    items: ["New creators welcome", "Quality + consistency > follower count", "We build the plan with you"],
  },
  {
    title: "Location Requirement",
    desc: "You must live in the United States or Canada to join Royal Bloodlines.",
    items: ["United States only", "Canada only", "No exceptions (platform + onboarding logistics)"],
  },
  {
    title: "Age Requirement",
    desc: "You must be 18+ due to TikTok guidelines and agency requirements.",
    items: ["18 years or older", "Required for onboarding", "Keeps the team compliant"],
  },
  {
    title: "Active Standard",
    desc: "To be considered active, you must hit 12 days and 25 hours of live time.",
    items: ["Minimum: 12 days live", "Minimum: 25 total live hours", "Consistency is the key to growth"],
  },
].map((card) => (
  <div
    key={card.title}
    className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 shadow-[0_0_50px_rgba(255,255,255,0.06)]"
  >
    <div className="text-xl font-semibold">{card.title}</div>
    <div className="mt-2 text-sm text-white/70 leading-relaxed">
      {card.desc}
    </div>

    <ul className="mt-5 space-y-2 text-sm text-white/80">
      {card.items.map((it) => (
        <li key={it} className="flex gap-3">
          <span className="mt-1 h-2 w-2 rounded-full bg-yellow-500/80" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  </div>
))}

        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="text-2xl font-semibold">Ready to run with the Bloodline?</div>
            <div className="mt-2 text-white/70">
              Pick an agent and start the onboarding process.
            </div>
          </div>

          <Link
            href="/agents"
            className="rb-gold-button px-6 py-3 rounded-2xl text-sm font-semibold text-center"
          >
            Choose an Agent
          </Link>
        </div>
      </section>
    </main>
  );
}
