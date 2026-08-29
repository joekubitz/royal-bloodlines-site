import Link from "next/link";

export default function CrownLinkTermsPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #4b0d12 0%, #180607 35%, #050505 75%)",
        color: "white",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <Link
          href="/crownlink"
          style={{
            color: "#d3a33c",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          ← Back to Crown Link
        </Link>

        <div
          style={{
            marginTop: 28,
            padding: 28,
            borderRadius: 20,
            background: "rgba(20,10,10,0.78)",
            border: "1px solid rgba(211,163,60,0.22)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
          }}
        >
          <p
            style={{
              color: "#d3a33c",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: 3,
              margin: 0,
            }}
          >
            CROWN LINK
          </p>

          <h1
            style={{
              fontSize: 36,
              margin: "8px 0 0",
              fontWeight: 900,
            }}
          >
            Terms of Service
          </h1>

          <p
            style={{
              marginTop: 10,
              color: "rgba(255,255,255,0.45)",
              fontSize: 13,
            }}
          >
            Last updated: August 29, 2026
          </p>

          <div
            style={{
              marginTop: 28,
              lineHeight: 1.75,
              color: "rgba(255,255,255,0.78)",
              fontSize: 15,
            }}
          >
            <p>
              These Terms of Service govern your access to and use of Crown
              Link, a private creator networking, event signup, and battle
              matchmaking service operated through the Royals Bloodline
              website.
            </p>

            <h2 style={headingStyle}>1. Eligibility and Access</h2>

            <p>
              Crown Link is intended only for approved creators and authorized
              administrators. Access may be limited, suspended, or revoked at
              any time if a user no longer meets Crown Link participation
              requirements or violates these Terms.
            </p>

            <h2 style={headingStyle}>2. Account Information</h2>

            <p>
              Users are responsible for providing accurate information and for
              keeping their account credentials secure. You may not use another
              person&apos;s account or provide false information about your
              identity, agency affiliation, TikTok account, or creator status.
            </p>

            <h2 style={headingStyle}>3. TikTok Connection</h2>

            <p>
              Crown Link may allow users to connect their TikTok account using
              TikTok&apos;s official authorization tools. When a user chooses
              to connect TikTok, Crown Link may receive authorized profile
              information such as a TikTok display name, username, profile
              image, profile identifier, or other information approved by the
              user through TikTok.
            </p>

            <p>
              Connecting TikTok does not transfer ownership or control of your
              TikTok account to Crown Link. Crown Link will only request and
              use information necessary to support creator identification,
              profile setup, matchmaking, event participation, and related
              Crown Link features.
            </p>

            <h2 style={headingStyle}>4. Events and Matchmaking</h2>

            <p>
              Creators may sign up for available Crown Link events. Crown Link
              may use creator information, including agency affiliation and
              self-reported diamond levels, to suggest potential battle
              matchups.
            </p>

            <p>
              Matchmaking suggestions are not guaranteed. Administrators may
              approve, reject, cancel, or modify matchups when necessary.
              Participation in an event does not guarantee that a creator will
              receive a match.
            </p>

            <h2 style={headingStyle}>5. Creator Responsibilities</h2>

            <p>
              Creators are responsible for reviewing their event signups and
              approved battles, communicating when they are unable to
              participate, and maintaining accurate profile information.
            </p>

            <p>
              Users may not misuse Crown Link, interfere with its operation,
              attempt to access unauthorized accounts or data, or use the
              service for harassment, impersonation, fraud, or other abusive
              activity.
            </p>

            <h2 style={headingStyle}>6. Diamond Levels</h2>

            <p>
              Diamond levels displayed within Crown Link may be self-reported
              or obtained through supported integrations where available.
              Creators are expected to provide accurate information. Crown Link
              may update or correct information when necessary.
            </p>

            <h2 style={headingStyle}>7. Availability of the Service</h2>

            <p>
              Crown Link may be changed, updated, temporarily unavailable, or
              discontinued at any time. Features may be added, removed, or
              modified as the service develops.
            </p>

            <h2 style={headingStyle}>8. Third-Party Services</h2>

            <p>
              Crown Link may interact with third-party services, including
              TikTok. Use of those services is also governed by the applicable
              third party&apos;s own terms, policies, and platform rules.
              Crown Link is not responsible for changes, outages, restrictions,
              or actions taken by third-party platforms.
            </p>

            <h2 style={headingStyle}>9. Suspension or Removal</h2>

            <p>
              Crown Link administrators may suspend or remove access for
              misuse, repeated event issues, inaccurate information, security
              concerns, or other behavior that interferes with Crown Link or
              its participants.
            </p>

            <h2 style={headingStyle}>10. No Guarantee of Results</h2>

            <p>
              Crown Link provides tools for creator networking, event
              participation, and matchmaking. It does not guarantee audience
              growth, diamond earnings, battle performance, partnerships,
              revenue, or any particular creator outcome.
            </p>

            <h2 style={headingStyle}>11. Changes to These Terms</h2>

            <p>
              These Terms may be updated as Crown Link changes. Continued use
              of Crown Link after updated Terms are posted constitutes
              acceptance of the revised Terms.
            </p>

            <h2 style={headingStyle}>12. Contact</h2>

            <p>
              Questions regarding Crown Link or these Terms may be directed to
              the Royals Bloodline administration team through the official
              Royals Bloodline communication channels.
            </p>

            <p
              style={{
                marginTop: 30,
                paddingTop: 20,
                borderTop: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.4)",
                fontSize: 12,
              }}
            >
              Crown Link is an independent service and is not owned, sponsored,
              endorsed, or operated by TikTok.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

const headingStyle = {
  marginTop: 28,
  marginBottom: 8,
  color: "#d3a33c",
  fontSize: 19,
  fontWeight: 900,
};