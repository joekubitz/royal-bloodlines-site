export async function trackClick(payload: {
  agent?: string | null;
  linkKey: string;
  pagePath?: string;
}) {
  try {
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // ignore tracking failures
  }
}
