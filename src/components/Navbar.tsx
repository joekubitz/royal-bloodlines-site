"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-yellow-600/20 bg-black/40 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/rb-logo.jpg"
            alt="Royal Bloodlines"
            className="h-9 w-9 rounded-xl border border-yellow-600/20 object-cover"
          />
          <span className="text-xl font-semibold tracking-wider rb-gold-text">
            ROYAL BLOODLINES
          </span>
        </Link>

        {/* Desktop menu */}
        <div className="hidden md:flex gap-6 items-center">

          <Link
            href="/"
            className="text-white/70 hover:text-white transition"
          >
            Home
          </Link>

          <Link
            href="/requirements"
            className="text-white/70 hover:text-white transition"
          >
            Requirements
          </Link>

          <Link
            href="/agents"
            className="text-white/70 hover:text-white transition"
          >
            Agents
          </Link>

          <Link
            href="/join"
            className="rb-gold-button px-4 py-2 rounded-xl text-sm font-semibold"
          >
            Join Now
          </Link>
          <Link href="/leadership" className="text-white/70 hover:text-white transition">
  Meet the Leadership 👑
</Link>


        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white text-2xl"
          onClick={() => setOpen(!open)}
          aria-label="Open menu"
        >
          ☰
        </button>

      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-black/80 backdrop-blur">
          <div className="flex flex-col px-4 py-4 gap-3">

            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white transition"
            >
              Home
            </Link>

            <Link
              href="/requirements"
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white transition"
            >
              Requirements
            </Link>

            <Link
              href="/agents"
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white transition"
            >
              Agents
            </Link>

            <Link
              href="/join"
              onClick={() => setOpen(false)}
              className="rb-gold-button px-4 py-2 rounded-xl text-sm font-semibold text-center"
            >
              Join Now
            </Link>
            <Link href="/leadership" onClick={() => setOpen(false)} className="text-white/80 hover:text-white transition">
  Meet the Leadership 👑
</Link>


          </div>
        </div>
      )}

    </header>
  );
}
