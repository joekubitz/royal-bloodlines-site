import Link from "next/link";

export default function LeadershipPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <div className="text-xs tracking-[0.25em] text-white/60">
        ROYAL BLOODLINES
      </div>

      <h1 className="mt-3 text-4xl md:text-6xl font-semibold">
        Leadership
      </h1>

      <p className="mt-4 max-w-3xl text-white/70 leading-relaxed">
        Royal Bloodlines is led by CameraKings.
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
              {`CameraKings is the founder and leader of Royal Bloodlines.

This organization is built for creators who want structure, growth, and a real standard — without gatekeeping.

If you’re ready to build something serious, start by reviewing the requirements and choosing an agent.`}
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
