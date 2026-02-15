"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const linkStyle = (href: string): React.CSSProperties => ({
    color:
      pathname === href
        ? "rgba(255,215,0,0.95)"
        : "rgba(255,255,255,0.75)",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
    letterSpacing: 0.3,
    padding: "10px 12px",
    borderRadius: 8,
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  });

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
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Link href="/" style={linkStyle("/")}>
            Home
          </Link>

          <Link href="/requirements" style={linkStyle("/requirements")}>
            Requirements
          </Link>

          <Link href="/agents" style={linkStyle("/agents")}>
            Agents
          </Link>

          <Link href="/leadership" style={linkStyle("/leadership")}>
            Meet the Founder
          </Link>

          <Link href="/recruiters" style={linkStyle("/recruiters")}>
            Recruiters
          </Link>

          <Link href="/apply" style={linkStyle("/apply")}>
            Apply to Become an Agent
          </Link>

          <Link
            href="/join"
            style={{
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
            }}
          >
            Join Now
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
            // X icon
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            // Hamburger icon
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
          <Link href="/" onClick={closeMobile} style={linkStyle("/")}>
            Home
          </Link>

          <Link
            href="/requirements"
            onClick={closeMobile}
            style={linkStyle("/requirements")}
          >
            Requirements
          </Link>

          <Link
            href="/agents"
            onClick={closeMobile}
            style={linkStyle("/agents")}
          >
            Agents
          </Link>

          <Link
            href="/leadership"
            onClick={closeMobile}
            style={linkStyle("/leadership")}
          >
            Meet the Founder
          </Link>

          <Link
            href="/recruiters"
            onClick={closeMobile}
            style={linkStyle("/recruiters")}
          >
            Recruiters
          </Link>

          <Link href="/apply" onClick={closeMobile} style={linkStyle("/apply")}>
            Apply to Become an Agent
          </Link>

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

      {/* Responsive + animation styles */}
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
