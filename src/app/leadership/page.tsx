import Link from "next/link";

export default function LeadershipPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <div className="text-xs tracking-[0.25em] text-white/60">
        ROYALS BLOODLINE
      </div>

      <h1 className="mt-3 text-4xl md:text-6xl font-semibold">
        Leadership
      </h1>

      <p className="mt-4 max-w-3xl text-white/70 leading-relaxed">
        Royals Bloodline is led by CameraKings.
      </p>

      <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8 items-start">
          {/* Image */}
          <div className="w-full">
            <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-white/10 bg-black/20">
  <img
    src="/leadership/camerakings.png"
    alt="CameraKings"
    className="h-full w-full object-cover"
  />
  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
</div>

          </div>

          {/* Text */}
          <div>
            <div className="text-xs tracking-[0.25em] text-white/60">
              LEAD FOUNDER
            </div>



            <h2 className="mt-3 text-3xl md:text-5xl font-semibold">
              CameraKings
            </h2>

            <div className="mt-2 text-sm text-yellow-500/80">
              Founder & CEO • Royal Bloodlines
            </div>

            <div className="mt-5 text-white/75 leading-relaxed whitespace-pre-line">
              {`Camera Kings is the Founder and CEO of Royals Bloodline, a high-performance TikTok LIVE agency built on structure, strategy, and elite execution. Since becoming a talent agent in 2023, he has dedicated himself to mastering the TikTok LIVE ecosystem — from battle mechanics and diamond optimization to creator psychology and long-term brand scaling.

Before focusing primarily on agency leadership, Camera Kings was active in battles and tournaments, gaining firsthand experience in competitive LIVE environments. Today, while he still enjoys going live and hosting box battles, his primary mission is developing creators into high-earning, high-impact digital brands.

His expertise spans:
	•	Battle strategy & box battle hosting
	•	Diamond scaling systems
	•	Creator positioning & optimization
	•	Agency infrastructure & performance accountability
	•	Leadership development within LIVE environments

Camera Kings has faced significant personal struggles and adversity throughout his life — experiences that shaped his resilience, discipline, and leadership philosophy. That resilience now defines how he builds. While life has tested him, the TikTok LIVE arena is a space he understands instinctively. He approaches the platform not casually, but strategically — analyzing patterns, studying gifting behavior, and engineering growth systems that produce measurable results.

He doesn’t just build creators. He builds empires.

Under his leadership, Royals Bloodline operates as more than an agency — it is a performance-driven network committed to growth, structure, and excellence. Creators who join are expected to execute with discipline, elevate their standards, and operate with purpose.

This isn’t for the weak.
This is for creators ready to level up.

Crowning Creators. Building Empires.`}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/requirements"
                className="rb-gold-button px-6 py-3 rounded-2xl text-sm font-semibold text-center"
              >
                View Requirements
              </Link>

              <Link
                href="/agents"
                className="rounded-2xl border border-white/15 bg-black/20 px-6 py-3 text-sm text-white/80 hover:text-white hover:bg-black/30 transition text-center"
              >
                Browse Agents
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
