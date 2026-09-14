import Link from "next/link";

export const metadata = {
  title: "Royals Bloodline",
  description:
    "Royals Bloodline — creator support, growth, community, and Royals Battles.",
};

export default function Home() {
  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "url('/rb-logo.jpg')",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "70% center",
              backgroundSize: "55%",
            }}
          />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(212,175,55,0.15),transparent_60%)]" />

          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/40" />
        </div>

        {/* Glow blobs */}
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <div className="absolute -top-40 left-10 h-[520px] w-[520px] rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -top-28 right-8 h-[440px] w-[440px] rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs tracking-[0.25em] text-white/70">
            LUXURY • STRUCTURE • RESULTS
          </div>

          <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            <span className="rb-gold-text block drop-shadow-[0_0_25px_rgba(212,175,55,0.35)]">
              Royals Bloodline
            </span>

            <span className="mt-2 block text-3xl font-medium text-white/80 md:text-5xl">
              Crowning creators. Building empires.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
            This is the official Royals Bloodline hub. Choose an agent, use
            their personal join link, and get onboarded with strategy,
            support, community, and accountability.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/agents"
              className="rb-gold-button rounded-2xl px-6 py-3 text-sm font-semibold"
            >
              Choose an Agent
            </Link>

            <Link
              href="/join"
              className="rounded-2xl border border-white/15 bg-black/20 px-6 py-3 text-sm text-white/80 transition hover:bg-black/30 hover:text-white"
            >
              Join Now
            </Link>
          </div>

          <div className="mt-16 flex justify-center">
            <div className="h-12 w-[1px] bg-gradient-to-b from-yellow-600/0 via-yellow-600/60 to-yellow-600/0 opacity-60" />
          </div>

          {/* Feature cards */}
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                h: "Recruiting that converts",
                p: "A simple path: pick an agent → join link → onboarding.",
              },
              {
                h: "Luxury brand, serious results",
                p: "High standards, real coaching, and real growth.",
              },
              {
                h: "Battle-ready structure",
                p: "Built to support schedules, tracking, and momentum.",
              },
            ].map((card) => (
              <div
                key={card.h}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_50px_rgba(255,255,255,0.06)]"
              >
                <div className="text-lg font-semibold">{card.h}</div>

                <div className="mt-2 text-sm leading-relaxed text-white/70">
                  {card.p}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-black/80" />
      </section>

      {/* TRUST INDICATORS */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "USA & Canada creators",
                sub: "Built for your region.",
              },
              {
                title: "18+ only",
                sub: "Built around platform eligibility requirements.",
              },
              {
                title: "No fees ever",
                sub: "Creator-first, always.",
              },
              {
                title: "Real structure",
                sub: "Standards + accountability.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-black/10 p-5"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80">
                    ✓
                  </span>

                  {item.title}
                </div>

                <div className="mt-2 text-sm leading-relaxed text-white/65">
                  {item.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 1M DIAMOND CLUB */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-8 md:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,175,55,0.18),transparent_60%)]" />

          <div className="relative">
            <div className="text-xs tracking-[0.25em] text-white/60">
              MILESTONE
            </div>

            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
              <span className="rb-gold-text">1M Diamond Club</span>
            </h2>

            <p className="mt-4 max-w-2xl text-white/70">
              Creators who hit 1,000,000 diamonds in a single month. This is
              the standard — and we celebrate it.
            </p>

            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
              {[
                {
                  name: "Camera Kings",
                  handle: "@CameraKings",
                  image: "/camera-kings.jpg",
                },
                {
                  name: "WomanMarine1",
                  handle: "@WomanMarine1",
                  image: "/womanmarine1.jpg",
                },
                {
                  name: "Jacob Noah Gaines",
                  handle: "@JacobNoahGaines",
                  image: "/jacon-noah-gaines.jpg",
                },
                {
                  name: "Iaana Smalls",
                  handle: "@IaanaSmalls",
                  image: "/iaana-smalls.jpg",
                },
                {
                  name: "$DominicG",
                  handle: "@SDominicG",
                  image: "/doninicg.jpg",
                },
                {
                  name: "Cheffi Minaj",
                  handle: "@CheffiMinaj",
                  image: "/cheffi-minaj.jpg",
                },
                {
                  name: "Jr Neal",
                  handle: "@jrneal74",
                  image: "/jr.jpg",
                },
              ].map((creator) => (
                <div
                  key={creator.name}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_0_60px_rgba(0,0,0,0.5)] transition duration-300 hover:scale-[1.02]"
                >
                  <div className="w-full p-5">
                    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(212,175,55,0.16),transparent_60%)]" />

                      <div className="relative aspect-[9/16] w-full">
                        <img
                          src={creator.image}
                          alt={creator.name}
                          className="absolute inset-0 h-full w-full object-contain"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-6">
                    <div className="text-xl font-semibold text-white">
                      {creator.name}
                    </div>

                    <div className="mt-1 text-sm text-white/60">
                      {creator.handle}
                    </div>

                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-4 py-1 text-xs text-yellow-400">
                      1M Diamond Club
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/join"
                className="rb-gold-button rounded-2xl px-6 py-3 text-center text-sm font-semibold"
              >
                Join Now
              </Link>

              <Link
                href="/agents"
                className="rounded-2xl border border-white/15 bg-black/20 px-6 py-3 text-center text-sm text-white/80 transition hover:bg-black/30 hover:text-white"
              >
                Choose an Agent →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* WHY ROYALS BLOODLINE */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10">
          <div className="text-xs tracking-[0.25em] text-white/60">
            WHY US
          </div>

          <h2 className="mt-3 text-2xl font-semibold md:text-3xl">
            Why creators choose{" "}
            <span className="rb-gold-text">Royals Bloodline</span>
          </h2>

          <p className="mt-3 max-w-2xl text-white/70">
            We’re not here to collect recruits. We’re here to build creators
            with structure, consistency, community, and real leadership.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                h: "Real leadership",
                p: "Leadership built around standards, direction, and creator growth.",
              },
              {
                h: "No fees ever",
                p: "No paid courses. No gimmicks. Real guidance and support.",
              },
              {
                h: "Royals Battles",
                p: "Organized events, scheduling, matchmaking, and battle management.",
              },
            ].map((card) => (
              <div
                key={card.h}
                className="rounded-3xl border border-white/10 bg-black/10 p-6 shadow-[0_0_50px_rgba(0,0,0,0.25)]"
              >
                <div className="text-lg font-semibold">{card.h}</div>

                <div className="mt-2 text-sm leading-relaxed text-white/70">
                  {card.p}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/agents"
              className="rb-gold-button rounded-2xl px-6 py-3 text-center text-sm font-semibold"
            >
              Choose an Agent
            </Link>

            <Link
              href="/join"
              className="rounded-2xl border border-white/15 bg-black/20 px-6 py-3 text-center text-sm text-white/80 transition hover:bg-black/30 hover:text-white"
            >
              Join Now
            </Link>
          </div>
        </div>
      </section>

      {/* LEADERSHIP */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-8 md:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(212,175,55,0.18),transparent_55%)]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/30" />

          <div className="relative grid grid-cols-1 items-center gap-8 md:grid-cols-[1fr_260px]">
            <div>
              <div className="text-xs tracking-[0.25em] text-white/60">
                LEADERSHIP
              </div>

              <h2 className="mt-3 text-2xl font-semibold md:text-3xl">
                Built by creators, led by{" "}
                <span className="rb-gold-text">CameraKings</span>
              </h2>

              <p className="mt-3 max-w-2xl leading-relaxed text-white/70">
                Royals Bloodline was built to create real structure, real
                growth, and real leadership in the TikTok LIVE space.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/leadership"
                  className="rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-center text-sm text-white/90 transition hover:bg-white/15"
                >
                  Meet the Founder →
                </Link>

                <Link
                  href="/agents"
                  className="rb-gold-button rounded-2xl px-6 py-3 text-center text-sm font-semibold"
                >
                  Choose an Agent
                </Link>
              </div>
            </div>

            <div className="relative rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold">
                Royals Bloodline Standard
              </div>

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
                  <span>High standards + structure</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10">
          <div className="text-2xl font-semibold md:text-3xl">
            How joining works
          </div>

          <p className="mt-3 max-w-2xl text-white/70">
            We keep it simple and direct. Choose your agent, join through their
            link, and get connected with Royals Bloodline.
          </p>

          <ol className="mt-6 grid grid-cols-1 gap-4 text-sm text-white/75 md:grid-cols-3">
            <li className="rounded-2xl border border-white/10 bg-black/10 p-5">
              <div className="font-semibold text-white">1) Pick an agent</div>
              <div className="mt-2">
                Choose the agent that matches your goals and vibe.
              </div>
            </li>

            <li className="rounded-2xl border border-white/10 bg-black/10 p-5">
              <div className="font-semibold text-white">
                2) Use their join link
              </div>
              <div className="mt-2">
                Each agent has their own direct onboarding link.
              </div>
            </li>

            <li className="rounded-2xl border border-white/10 bg-black/10 p-5">
              <div className="font-semibold text-white">3) Get set up</div>
              <div className="mt-2">
                Get connected with expectations, resources, and support.
              </div>
            </li>
          </ol>

          <div className="mt-8">
            <Link
              href="/join"
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-sm transition hover:bg-white/15"
            >
              Start Here →
            </Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-white/10 bg-black/20 p-8 md:flex-row md:items-center md:p-10">
          <div>
            <div className="text-2xl font-semibold">
              Ready to build with us?
            </div>

            <div className="mt-2 max-w-xl text-white/70">
              Apply, pick an agent, and join a team built on structure, growth,
              community, and leadership.
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
            <Link
              href="/join"
              className="rb-gold-button rounded-2xl px-6 py-3 text-center text-sm font-semibold"
            >
              Join Now
            </Link>

            <Link
              href="/agents"
              className="rounded-2xl border border-white/15 bg-black/20 px-6 py-3 text-center text-sm text-white/80 transition hover:bg-black/30 hover:text-white"
            >
              Choose an Agent
            </Link>
          </div>
        </div>
      </section>

      {/* PUBLIC LEGAL FOOTER */}
      <footer className="border-t border-white/10 bg-black/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-4 py-8 text-center sm:flex-row sm:text-left">
          <div>
            <div className="font-semibold text-white">
              Royals Bloodline
            </div>

            <div className="mt-1 text-xs text-white/40">
              © 2026 Royals Bloodline. All rights reserved.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
            <Link
              href="/privacy-policy"
              className="text-white/60 transition hover:text-[#d3a33c]"
            >
              Privacy Policy
            </Link>

            <Link
              href="/terms-of-service"
              className="text-white/60 transition hover:text-[#d3a33c]"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}