import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-20">

      <h1 className="text-5xl font-bold mb-6">
        Royal Bloodlines
      </h1>

      <p className="text-white/70 text-lg mb-8">
        The next generation of elite creators starts here.
        Choose your agent and begin your journey.
      </p>

      <Link
        href="/agents"
        className="bg-white/10 border border-white/20 px-6 py-3 rounded-xl hover:bg-white/20 transition"
      >
        Find Your Agent
      </Link>

    </main>
  );
}
