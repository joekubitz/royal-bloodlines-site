"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const DISCORD_INVITE_URL = "https://discord.gg/bFqUE388"; // TODO: replace

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

  // Close on route change
  useEffect(() => {
    closeMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close on ESC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const baseLinkStyle: React.CSSProperties = {
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
    letterSpacing: 0.3,
    padding: "10px 12px",
    borderRadius: 8,
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  };

  const navLinkStyle = (href: string): React.CSSProperties => ({
    ...baseLinkStyle,
    color:
      pathname === href
        ? "rgba(255,215,0,0.95)"
        : "rgba(255,255,255,0.75)",
  });

  const joinNowStyle: React.CSSProperties = {
    marginLeft: 6,
    padding: "10px 14px",
    borderRadius: 10,
    background:
      "linear-gradient(180deg, rgba(255,215,0,0.95), rgba(255,215,0,0.75))",
    color: "black",
    fontWeight: 800,
    textDecoration: "none",
    boxShadow: "0 8px 30px rgba(255,215,0,0.25)",
    whiteSpace: "nowrap",
  };

  const discordBtnStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,215,0,0.25)",
    background: "rgba(0,0,0,0.35)",
    color: "rgba(255,215,0,0.95)",
    fontWeight: 800,
    textDecoration: "none",
    boxShadow: "0 10px 30px rgba(255,215,0,0.12)",
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,215,0,0.15)",
      }}
    >
      <div
        style={{
          maxWidth: 1300,
          margin: "0 auto",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {/* LEFT SIDE — LOGO */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "rgba(255,215,0,0.95)",
            fontWeight: 900,
            letterSpacing: 0.5,
            whiteSpace: "nowrap",
          }}
        >
          <img
            src="/rb-logo.jpg"
            alt="Royals Bloodline"
            style={{ width: 28, height: 28, borderRadius: 6 }}
          />
          ROYALS BLOODLINE
        </Link>

        {/* DESKTOP NAV */}
        <nav
          className="rb-desktop-nav"
          style={{ display: "flex", alignItems: "center", gap: 14 }}
        >
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} style={navLinkStyle(l.href)}>
              {l.label}
            </Link>
          ))}

          {/* Discord button (external) */}
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={discordBtnStyle}
          >
            {/* Discord-ish icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 11.5c0 .8-.6 1.5-1.4 1.5S6.2 12.3 6.2 11.5 6.8 10 7.6 10 9 10.7 9 11.5Zm8.8 0c0 .8-.6 1.5-1.4 1.5S15 12.3 15 11.5 15.6 10 16.4 10s1.4.7 1.4 1.5Z"
                fill="currentColor"
              />
              <path
                d="M19.2 5.6A16.7 16.7 0 0 0 15 4.2l-.2.4a14.7 14.7 0 0 1 3.1 1c-2.5-1.2-5.1-1.3-5.9-1.3s-3.4.1-5.9 1.3a14.7 14.7 0 0 1 3.1-1l-.2-.4a16.7 16.7 0 0 0-4.2 1.4C2.4 9.2 2 13 2 13c1.1 6.3 5.8 6.8 5.8 6.8l.7-1.1c-1.2-.4-1.9-1-1.9-1 1.7 1.2 3.8 1.3 5.4 1.3s3.7-.1 5.4-1.3c0 0-.7.6-1.9 1l.7 1.1S20.9 19.3 22 13c0 0-.4-3.8-2.8-7.4Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
            Join Discord
          </a>

          {/* Your existing Join page (internal) */}
          <Link href="/join" style={joinNowStyle}>
            Claim Your Crown
          </Link>
        </nav>

        {/* MOBILE HAMBURGER */}
        <button
          className="rb-mobile-btn"
          onClick={toggleMobile}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          style={{
            display: "none",
            border: "1px solid rgba(255,215,0,0.25)",
            background: "rgba(0,0,0,0.35)",
            color: "rgba(255,215,0,0.95)",
            borderRadius: 10,
            padding: "10px 12px",
            cursor: "pointer",
            lineHeight: 0,
          }}
        >
          {mobileOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </div>

      {/* OVERLAY */}
      <div
        className={`rb-overlay ${mobileOpen ? "open" : ""}`}
        onClick={closeMobile}
        aria-hidden={!mobileOpen}
      />

      {/* MOBILE MENU (animated) */}
      <div className={`rb-mobile-menu ${mobileOpen ? "open" : ""}`}>
        <div className="rb-mobile-inner">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={closeMobile}
              style={navLinkStyle(l.href)}
            >
              {l.label}
            </Link>
          ))}

          {/* Discord in mobile menu too */}
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeMobile}
            style={{
              ...discordBtnStyle,
              justifyContent: "center",
              padding: "12px 14px",
              marginTop: 6,
            }}
          >
            Join Discord
          </a>

          <Link
            href="/join"
            onClick={closeMobile}
            style={{
              marginTop: 10,
              padding: "12px 14px",
              borderRadius: 12,
              background:
                "linear-gradient(180deg, rgba(255,215,0,0.95), rgba(255,215,0,0.75))",
              color: "black",
              fontWeight: 900,
              textDecoration: "none",
              textAlign: "center",
              boxShadow: "0 10px 40px rgba(255,215,0,0.22)",
            }}
          >
            Join Now
          </Link>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 980px) {
          .rb-desktop-nav {
            display: none !important;
          }
          .rb-mobile-btn {
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
          }
        }

        .rb-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          opacity: 0;
          pointer-events: none;
          transition: opacity 180ms ease;
          z-index: 90;
        }
        .rb-overlay.open {
          opacity: 1;
          pointer-events: auto;
        }

        .rb-mobile-menu {
          position: absolute;
          left: 0;
          right: 0;
          top: 100%;
          background: rgba(0, 0, 0, 0.92);
          border-top: 1px solid rgba(255, 215, 0, 0.12);

          transform: translateY(-8px);
          opacity: 0;
          pointer-events: none;
          transition: transform 220ms ease, opacity 220ms ease;
          z-index: 95;
        }
        .rb-mobile-menu.open {
          transform: translateY(0);
          opacity: 1;
          pointer-events: auto;
        }

        .rb-mobile-inner {
          max-width: 1300px;
          margin: 0 auto;
          padding: 12px 16px 16px;
          display: grid;
          gap: 8px;
        }
      `}</style>
    </header>
  );
}