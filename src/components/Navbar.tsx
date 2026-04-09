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
    justifyContent: "center",
    gap: 8,
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
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
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
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
          padding: "10px 14px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            minWidth: 0,
          }}
        >
          {/* LEFT — BRAND */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "rgba(255,215,0,0.95)",
              fontWeight: 950,
              letterSpacing: 0.4,
              minWidth: 0,
              flex: "1 1 auto",
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
                flexShrink: 0,
              }}
            />
            <span className="rb-brand-text">ROYALS BLOODLINE</span>
          </Link>

          {/* CENTER — NAV LINKS */}
          <nav
            className="rb-desktop-nav"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              flexShrink: 0,
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
              gap: 8,
              flexShrink: 0,
            }}
          >
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rb-discord-btn"
              style={discordBtnStyle}
            >
              Join Discord
            </a>

            <Link href="/join" className="rb-cta-btn" style={ctaStyle}>
              <span className="rb-cta-desktop">Claim Your Crown →</span>
              <span className="rb-cta-mobile">Join</span>
            </Link>

            <button
              className="rb-mobile-btn"
              onClick={toggleMobile}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              style={{
                display: "none",
                border: "1px solid rgba(255,215,0,0.25)",
                background: "rgba(0,0,0,0.35)",
                color: "rgba(255,215,0,0.95)",
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              {mobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {mobileOpen && (
          <div
            className="rb-mobile-menu"
            style={{
              marginTop: 12,
              padding: 12,
              border: "1px solid rgba(255,215,0,0.12)",
              borderRadius: 16,
              background: "rgba(10,10,10,0.96)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={closeMobile}
                style={{
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 14,
                  padding: "12px 12px",
                  borderRadius: 10,
                  color:
                    pathname === l.href
                      ? "rgba(255,215,0,0.95)"
                      : "rgba(255,255,255,0.9)",
                  background:
                    pathname === l.href
                      ? "rgba(255,215,0,0.08)"
                      : "transparent",
                }}
              >
                {l.label}
              </Link>
            ))}

            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMobile}
              style={{
                ...discordBtnStyle,
                width: "100%",
                marginTop: 4,
              }}
            >
              Join Discord
            </a>
          </div>
        )}
      </div>

      <style jsx>{`
        .rb-brand-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 1rem;
        }

        .rb-cta-mobile {
          display: none;
        }

        @media (max-width: 1050px) {
          .rb-desktop-nav {
            display: none !important;
          }

          .rb-mobile-btn {
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
          }
        }

        @media (max-width: 768px) {
          .rb-discord-btn {
            display: none !important;
          }

          .rb-brand-text {
            font-size: 0.9rem;
            letter-spacing: 0.25px;
            max-width: 140px;
          }

          .rb-cta-btn {
            padding: 9px 12px !important;
            font-size: 13px !important;
          }

          .rb-cta-desktop {
            display: none;
          }

          .rb-cta-mobile {
            display: inline;
          }
        }

        @media (max-width: 420px) {
          .rb-brand-text {
            max-width: 115px;
            font-size: 0.82rem;
          }

          .rb-cta-btn {
            padding: 8px 10px !important;
            border-radius: 10px !important;
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