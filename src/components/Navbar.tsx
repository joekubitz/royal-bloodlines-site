"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const linkStyle = (href: string): React.CSSProperties => ({
    color:
      pathname === href
        ? "rgba(255,215,0,0.95)"
        : "rgba(255,255,255,0.75)",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
    letterSpacing: 0.3,
    padding: "8px 10px",
    borderRadius: 8,
    transition: "all 0.15s ease",
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
          maxWidth: 1100,
          margin: "0 auto",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
          }}
        >
          <img
            src="/rb-logo.jpg"
            alt="Royals Bloodline"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
            }}
          />
          ROYAL BLOODLINES
        </Link>

        {/* RIGHT SIDE — NAV LINKS */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
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
            Meet the Leadership 👑
          </Link>

          <Link href="/apply" style={linkStyle("/apply")}>
            Apply to Become an Agent
          </Link>

          {/* JOIN NOW BUTTON (CTA LAST) */}
          <Link
            href="/join"
            style={{
              marginLeft: 10,
              padding: "8px 14px",
              borderRadius: 10,
              background:
                "linear-gradient(180deg, rgba(255,215,0,0.95), rgba(255,215,0,0.75))",
              color: "black",
              fontWeight: 800,
              textDecoration: "none",
              boxShadow: "0 8px 30px rgba(255,215,0,0.25)",
            }}
          >
            Join Now
          </Link>
        </nav>
      </div>
    </header>
  );
}
