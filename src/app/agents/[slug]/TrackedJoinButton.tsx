"use client";

export default function TrackedJoinButton({
  href,
  agentSlug,
  label,
}: {
  href: string;
  agentSlug: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rb-gold-button px-6 py-3 rounded-2xl text-sm font-semibold text-center"
      onClick={async (e) => {
        // Make sure tracking fires before the new tab steals focus
        e.preventDefault();

        try {
          await fetch("/api/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              agent: agentSlug,
              linkKey: `join_${agentSlug}`,
              pagePath: window.location.pathname,
            }),
            keepalive: true,
          });
        } catch {
          // ignore
        }

        window.open(href, "_blank", "noopener,noreferrer");
      }}
    >
      {label}
    </a>
  );
}
