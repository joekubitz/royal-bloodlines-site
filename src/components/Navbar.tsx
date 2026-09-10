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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Crown Link is its own app experience.
  // Hide the regular Royals Bloodline navbar on all /crownlink pages.
  if (pathname.startsWith("/crownlink")) {
    return null;
  }

  const activeColor = "rgba(255,215,0,0.95)";
  const inactiveColor = "rgba(255,255,255,0.78)";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.88)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,215,0,0.12)",
        overflow: "visible",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "10px 12px",
        }}
      >
        <div className="rb-nav-row">
          <Link href="/" className="rb-brand">
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

            <span className="rb-brand-full">
              ROYALS BLOODLINE
            </span>

            <span className="rb-brand-short">
              RB
            </span>
          </Link>

          <nav className="rb-desktop-nav">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: 13.5,
                  letterSpacing: 0.25,
                  padding: "8px 10px",
                  borderRadius: 10,
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                  color:
                    pathname === l.href
                      ? activeColor
                      : inactiveColor,
                }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="rb-actions">
            {/* MEMBER LOGIN */}
            <Link
              href="/login"
              className="rb-member-btn"
            >
              <span className="rb-member-icon">
                ♛
              </span>

              <span className="rb-member-long">
                Member Login
              </span>

              <span className="rb-member-short">
                Login
              </span>
            </Link>

            {/* DISCORD */}
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rb-discord-btn"
            >
              Join Discord
            </a>

            {/* CTA */}
            <Link href="/join" className="rb-cta-btn">
              <span className="rb-cta-long">
                Claim Your Crown →
              </span>

              <span className="rb-cta-short">
                Join
              </span>
            </Link>

            {/* MOBILE MENU BUTTON */}
            <button
              className="rb-mobile-btn"
              onClick={() =>
                setMobileOpen((v) => !v)
              }
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              type="button"
            >
              {mobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="rb-mobile-menu">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() =>
                  setMobileOpen(false)
                }
                className="rb-mobile-link"
                style={{
                  color:
                    pathname === l.href
                      ? activeColor
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

            {/* MOBILE MEMBER LOGIN */}
            <Link
              href="/login"
              onClick={() =>
                setMobileOpen(false)
              }
              className="rb-mobile-member"
            >
              <span>♛</span>
              Member Login
            </Link>

            {/* MOBILE DISCORD */}
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                setMobileOpen(false)
              }
              className="rb-mobile-discord"
            >
              Join Discord
            </a>

            {/* MOBILE JOIN */}
            <Link
              href="/join"
              onClick={() =>
                setMobileOpen(false)
              }
              className="rb-mobile-join"
            >
              Claim Your Crown →
            </Link>
          </div>
        )}
      </div>

      <style jsx>{`
        .rb-nav-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-width: 0;
        }

        .rb-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex: 1 1 auto;
          text-decoration: none;
          color: rgba(255, 215, 0, 0.95);
          font-weight: 950;
          letter-spacing: 0.4px;
          white-space: nowrap;
        }

        .rb-brand-full {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rb-brand-short {
          display: none;
        }

        .rb-desktop-nav {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-shrink: 0;
        }

        .rb-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        :global(.rb-member-btn) {
          padding: 9px 13px;
          border-radius: 12px;
          border: 1px solid rgba(255, 215, 0, 0.18);
          background:
            linear-gradient(
              180deg,
              rgba(255, 215, 0, 0.07),
              rgba(255, 215, 0, 0.025)
            );
          color: rgba(255, 225, 105, 0.95);
          font-weight: 850;
          font-size: 13px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
          transition:
            background 0.15s ease,
            border-color 0.15s ease,
            transform 0.15s ease;
        }

        :global(.rb-member-btn:hover) {
          transform: translateY(-1px);
          border-color: rgba(255, 215, 0, 0.38);
          background: rgba(255, 215, 0, 0.1);
        }

        .rb-member-icon {
          font-size: 13px;
          color: rgba(255, 215, 0, 0.95);
        }

        .rb-member-short {
          display: none;
        }

        .rb-discord-btn {
          padding: 9px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 215, 0, 0.25);
          background: rgba(0, 0, 0, 0.35);
          color: rgba(255, 215, 0, 0.95);
          font-weight: 800;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
        }

        .rb-cta-btn {
          padding: 9px 16px;
          border-radius: 12px;
          background: linear-gradient(
            180deg,
            rgba(255, 215, 0, 0.98),
            rgba(255, 215, 0, 0.75)
          );
          color: black;
          font-weight: 900;
          text-decoration: none;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .rb-cta-short {
          display: none;
        }

        .rb-mobile-btn {
          display: none;
          border: 1px solid rgba(255, 215, 0, 0.25);
          background: rgba(0, 0, 0, 0.35);
          color: rgba(255, 215, 0, 0.95);
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 16px;
          line-height: 1;
        }

        .rb-mobile-menu {
          margin-top: 12px;
          padding: 12px;
          border: 1px solid rgba(255, 215, 0, 0.12);
          border-radius: 16px;
          background: rgba(10, 10, 10, 0.96);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .rb-mobile-link {
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
          padding: 12px;
          border-radius: 10px;
        }

        :global(.rb-mobile-member) {
          margin-top: 4px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 215, 0, 0.18);
          background: rgba(255, 215, 0, 0.06);
          color: rgba(255, 225, 105, 0.95);
          font-weight: 850;
          text-decoration: none;
          text-align: center;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
        }

        .rb-mobile-discord {
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 215, 0, 0.25);
          background: rgba(0, 0, 0, 0.35);
          color: rgba(255, 215, 0, 0.95);
          font-weight: 800;
          text-decoration: none;
          text-align: center;
        }

        :global(.rb-mobile-join) {
          padding: 12px;
          border-radius: 12px;
          background: linear-gradient(
            180deg,
            rgba(255, 215, 0, 0.98),
            rgba(255, 215, 0, 0.75)
          );
          color: #000;
          font-weight: 900;
          text-decoration: none;
          text-align: center;
        }

        @media (max-width: 1180px) {
          .rb-desktop-nav {
            display: none;
          }

          .rb-mobile-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
        }

        @media (max-width: 1080px) {
          .rb-member-long {
            display: none;
          }

          .rb-member-short {
            display: inline;
          }
        }

        @media (max-width: 980px) {
          .rb-discord-btn {
            display: none;
          }

          .rb-cta-long {
            display: none;
          }

          .rb-cta-short {
            display: inline;
          }

          .rb-cta-btn {
            padding: 9px 12px;
            font-size: 13px;
          }
        }

        @media (max-width: 760px) {
          :global(.rb-member-btn) {
            display: none;
          }
        }

        @media (max-width: 680px) {
          .rb-brand-full {
            display: none;
          }

          .rb-brand-short {
            display: inline;
          }
        }
      `}</style>
    </header>
  );
}