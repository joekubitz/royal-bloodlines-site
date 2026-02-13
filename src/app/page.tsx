import Link from "next/link";

export default function Home() {
  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Background logo */}
        <div className="absolute inset-0">
          {/* logo image */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "url('/rb-logo.jpg')",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "70% center",
              backgroundSize: "55%",
            }}
          />

          {/* gold glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(212,175,55,0.15),transparent_60%)]" />

          {/* dark fade */}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/40" />
        </div>

        {/* glow blobs */}
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <div className="absolute -top-40 left-10 h-[520px] w-[520px] rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -top-28 right-8 h-[440px] w-[440px] rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-4 py-24 relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/70 tracking-[0.25em]">
            LUXURY • STRUCTURE • RESULTS
          </div>

          <h1 className="mt-6 text-5xl md:text-7xl font-bold leading-tight tracking-tight">
            <span className="block rb-gold-text drop-shadow-[0_0_25px_rgba(212,175,55,0.35)]">
              Royal Bloodlines
            </span>

            <span className="block text-white/80 mt-2 text-3xl md:text-5xl font-medium">
              Crowning creators. Building empires.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-white/70 text-base md:text-lg leading-relaxed">
            This is the official hub recruits get sent to. Choose an agent, use their
            personal join link, and get onboarded with strategy, support, and accountability.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link
              href="/agents"
              className="rb-gold-button px-6 py-3 rounded-2xl text-sm font-semibold"
            >
              Choose an Agent
            </Link>

            {/* Join Now should go to /join */}
            <Link
              href="/join"
              className="rounded-2xl border border-white/15 bg-black/20 px-6 py-3 text-sm text-white/80 hover:text-white hover:bg-black/30 transition"
            >
              Join Now
            </Link>
          </div>

          {/* scroll indicator */}
          <div className="mt-16 flex justify-center">
            <div className="w-[1px] h-12 bg-gradient-to-b from-yellow-600/0 via-yellow-600/60 to-yellow-600/0 opacity-60" />
          </div>

          {/* Feature cards */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { h: "Recruiting that converts", p: "A simple path: pick an agent → join link → onboarding." },
              { h: "Luxury brand, serious results", p: "High standards, real coaching, and real growth." },
              { h: "Battle-ready structure", p: "Built to support schedules, tracking, and momentum." },
            ].map((c) => (
              <div
                key={c.h}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_50px_rgba(255,255,255,0.06)]"
              >
                <div className="text-lg font-semibold">{c.h}</div>
                <div className="mt-2 text-sm text-white/70 leading-relaxed">{c.p}</div>
              </div>
            ))}
          </div>
        </div>

        {/* cinematic fade bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-black/80 pointer-events-none" />
      </section>

      {/* TRUST INDICATORS (NEW) */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { title: "USA & Canada creators", sub: "Built for your region." },
              { title: "18+ only", sub: "TikTok guidelines compliant." },
              { title: "No fees ever", sub: "Creator-first, always." },
              { title: "Real structure", sub: "Standards + accountability." },
            ].map((i) => (
              <div
                key={i.title}
                className="rounded-2xl border border-white/10 bg-black/10 p-5"
              >
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 border border-white/10 text-white/80">
                    ✓
                  </span>
                  {i.title}
                </div>
                <div className="mt-2 text-sm text-white/65 leading-relaxed">{i.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY ROYAL BLOODLINES IS DIFFERENT (NEW) */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10">
          <div className="text-xs tracking-[0.25em] text-white/60">WHY US</div>
          <h2 className="mt-3 text-2xl md:text-3xl font-semibold">
            Why creators choose <span className="rb-gold-text">Royal Bloodlines</span>
          </h2>
          <p className="mt-3 text-white/70 max-w-2xl">
            We’re not here to “collect recruits.” We’re here to build creators with structure,
            consistency, and real leadership.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                h: "Direct agent support",
                p: "You’re guided by a real person — not a random group chat.",
              },
              {
                h: "Structured growth system",
                p: "Clear expectations, habits, and accountability to level up.",
              },
              {
                h: "Active Discord community",
                p: "Support, resources, and community so you’re not building alone.",
              },
              {
                h: "Real leadership, not recruiters",
                p: "We lead from the top with standards and direction.",
              },
              {
                h: "No fees ever",
                p: "No paid “courses.” No gimmicks. Just real guidance and results.",
              },
            ].map((c) => (
              <div
                key={c.h}
                className="rounded-3xl border border-white/10 bg-black/10 p-6 shadow-[0_0_50px_rgba(0,0,0,0.25)]"
              >
                <div className="text-lg font-semibold">{c.h}</div>
                <div className="mt-2 text-sm text-white/70 leading-relaxed">{c.p}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/agents"
              className="rb-gold-button px-6 py-3 rounded-2xl text-sm font-semibold text-center"
            >
              Choose an Agent
            </Link>
            <Link
              href="/join"
              className="rounded-2xl border border-white/15 bg-black/20 px-6 py-3 text-sm text-white/80 hover:text-white hover:bg-black/30 transition text-center"
            >
              Join Now
            </Link>
          </div>
        </div>
      </section>

      {/* CAMERA KINGS AUTHORITY (NEW) */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-8 md:p-10 overflow-hidden relative">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(212,175,55,0.18),transparent_55%)]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/30" />

          <div className="relative grid grid-cols-1 md:grid-cols-[1fr_260px] gap-8 items-center">
            <div>
              <div className="text-xs tracking-[0.25em] text-white/60">LEADERSHIP</div>
              <h2 className="mt-3 text-2xl md:text-3xl font-semibold">
                Built by creators, led by{" "}
                <span className="rb-gold-text">CameraKings</span>
              </h2>
              <p className="mt-3 text-white/70 max-w-2xl leading-relaxed">
                Royal Bloodlines was built to create real structure, real growth, and real
                leadership in the TikTok LIVE space.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/camerakings"
                  className="rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-sm text-white/90 hover:bg-white/15 transition text-center"
                >
                  Meet the Founder →
                </Link>
                <Link
                  href="/agents"
                  className="rb-gold-button px-6 py-3 rounded-2xl text-sm font-semibold text-center"
                >
                  Choose an Agent
                </Link>
              </div>
            </div>

            {/* small visual card */}
            <div className="relative rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold">Royal Bloodlines Standard</div>
              <div className="mt-3 space-y-2 text-sm text-white/70">
                <div className="flex gap-2">
                  <span className="text-white/60">✓</span>
                  <span>Consistency + accountability</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white/60">✓</span>
                  <span>Community-backed growth</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white/60">✓</span>
                  <span>High standards, no drama</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10">
          <div className="text-2xl md:text-3xl font-semibold">How joining works</div>
          <p className="mt-3 text-white/70 max-w-2xl">
            We keep it clean and direct. The website does the talking — the agent does the closing.
          </p>

          <ol className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-white/75">
            <li className="rounded-2xl border border-white/10 bg-black/10 p-5">
              <div className="font-semibold text-white">1) Pick an agent</div>
              <div className="mt-2">Choose the agent that matches your goals and vibe.</div>
            </li>
            <li className="rounded-2xl border border-white/10 bg-black/10 p-5">
              <div className="font-semibold text-white">2) Use their join link</div>
              <div className="mt-2">Each agent has their own direct onboarding link.</div>
            </li>
            <li className="rounded-2xl border border-white/10 bg-black/10 p-5">
              <div className="font-semibold text-white">3) Get set up</div>
              <div className="mt-2">Standards, expectations, and a growth plan from day one.</div>
            </li>
          </ol>

          <div className="mt-8">
            <Link
              href="/join"
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-sm hover:bg-white/15 transition"
            >
              Start Here →
            </Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA (NEW) */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="text-2xl font-semibold">Ready to build with us?</div>
            <div className="mt-2 text-white/70 max-w-xl">
              Apply, pick an agent, and join a team built on structure, growth, and real leadership.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Link
              href="/join"
              className="rb-gold-button px-6 py-3 rounded-2xl text-sm font-semibold text-center"
            >
              Apply / Join Now
            </Link>
            <Link
              href="/agents"
              className="rounded-2xl border border-white/15 bg-black/20 px-6 py-3 text-sm text-white/80 hover:text-white hover:bg-black/30 transition text-center"
            >
              Choose an Agent
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
