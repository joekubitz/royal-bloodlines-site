"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const DISCORD_INVITE_URL = "https://discord.gg/bFqUE388";

  const navLinks = useMemo(
    () => [
      { href: "/requirements", label: "Requirements" },
      { href: "/agents", label: "Agents" },
      { href: "/leadership", label: "Meet the Founder" },
      { href: "/recruiters", label: "Recruiters" },
      { href: "/apply", label: "Apply to Become an Agent" },
    ],
    []
  );

  const closeMobile = () => setMobileOpen(false);
  const toggleMobile = () => setMobileOpen((v) => !v);

  useEffect(() => {
    closeMobile();
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const linkStyle = (href: string): React.CSSProperties => ({
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 13.5,
    letterSpacing: 0.25,
    padding: "8px 10px",
    borderRadius: 10,
    whiteSpace: "nowrap",
    transition: "all 0.15s ease",
    color:
      pathname === href
        ? "rgba(255,215,0,0.95)"
        : "rgba(255,255,255,0.78)",
  });

  const discordBtnStyle: React.CSSProperties = {
    padding: "9px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,215,0,0.25)",
    background: "rgba(0,0,0,0.35)",
    color: "rgba(255,215,0,0.95)",
    fontWeight: 800,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    transition: "all 0.15s ease",
  };

  const ctaStyle: React.CSSProperties = {
    padding: "9px 16px",
    borderRadius: 12,
    background:
      "linear-gradient(180deg, rgba(255,215,0,0.98), rgba(255,215,0,0.75))",
    color: "black",
    fontWeight: 900,
    textDecoration: "none",
    whiteSpace: "nowrap",
    transition: "all 0.15s ease",
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.88)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,215,0,0.12)",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "10px 16px", // ← tighter left padding
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* LEFT — BRAND */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "rgba(255,215,0,0.95)",
            fontWeight: 950,
            letterSpacing: 0.6,
            whiteSpace: "nowrap",
          }}
        >
          <img
            src="/rb-logo.jpg"
            alt="Royals Bloodline"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "1px solid rgba(255,215,0,0.18)",
            }}
          />
          ROYALS BLOODLINE
        </Link>

        {/* CENTER — NAV LINKS */}
        <nav
          className="rb-desktop-nav"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} style={linkStyle(l.href)}>
              {l.label}
            </Link>
          ))}
        </nav>

        {/* RIGHT — ACTIONS */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={discordBtnStyle}
          >
            Join Discord
          </a>

          <Link href="/join" style={ctaStyle}>
            Claim Your Crown →
          </Link>

          {/* MOBILE HAMBURGER */}
          <button
            className="rb-mobile-btn"
            onClick={toggleMobile}
            style={{
              display: "none",
              border: "1px solid rgba(255,215,0,0.25)",
              background: "rgba(0,0,0,0.35)",
              color: "rgba(255,215,0,0.95)",
              borderRadius: 10,
              padding: "8px 10px",
            }}
          >
            ☰
          </button>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1050px) {
          .rb-desktop-nav {
            display: none !important;
          }
          .rb-mobile-btn {
            display: inline-flex !important;
          }
        }

        :global(nav a:hover) {
          color: rgba(255, 215, 0, 0.95) !important;
          transform: translateY(-1px);
        }
      `}</style>
    </header>
  );
}