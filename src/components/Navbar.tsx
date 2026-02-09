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
          <Link href="/" className="text-white/70 hover:text-white">
            Home
          </Link>

          <Link href="/agents" className="text-white/70 hover:text-white">
            Agents
          </Link>

          <Link href="/agents" className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 hover:bg-white/20 transition">
            Join Now
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white text-xl"
          onClick={() => setOpen(!open)}
          aria-label="Open menu"
        >
          ☰
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/10">
          <div className="flex flex-col px-4 py-4 gap-3">
            <Link href="/" onClick={() => setOpen(false)}>
              Home
            </Link>

            <Link href="/agents" onClick={() => setOpen(false)}>
              Agents
            </Link>

            <Link
              href="/agents"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 hover:bg-white/20 transition"
            >
              Join Now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
