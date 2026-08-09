import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: clicks, error } = await supabase
    .from("clicks")
    .select("id, created_at, agent, link_key, page_path")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) {
    console.log("SUPABASE ERROR:", error);

    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>Dashboard</h1>

        <p style={{ color: "red" }}>
          Error loading clicks: {error.message}
        </p>
      </main>
    );
  }

  const byLink: Record<string, number> = {};
  const byAgent: Record<string, number> = {};

  for (const click of clicks ?? []) {
    const linkKey = click.link_key || "Unknown";
    byLink[linkKey] = (byLink[linkKey] ?? 0) + 1;

    const agent = (click.agent ?? "Unknown").trim();
    byAgent[agent] = (byAgent[agent] ?? 0) + 1;
  }

  const topLinks = Object.entries(byLink)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  const topAgents = Object.entries(byAgent)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  return (
    <main
      style={{
        padding: 24,
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 900 }}>
        Royals Bloodline Analytics
      </h1>

      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Admin dashboard (click tracking)
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 18,
          marginTop: 22,
        }}
      >
        <section
          style={{
            border: "1px solid #333",
            borderRadius: 14,
            padding: 16,
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>
            Top Links
          </h2>

          <ol style={{ marginTop: 12 }}>
            {topLinks.length === 0 ? (
              <li style={{ opacity: 0.8 }}>No clicks yet</li>
            ) : (
              topLinks.map(([key, total]) => (
                <li key={key} style={{ padding: "6px 0" }}>
                  <b>{key}</b> — {total}
                </li>
              ))
            )}
          </ol>
        </section>

        <section
          style={{
            border: "1px solid #333",
            borderRadius: 14,
            padding: 16,
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>
            Top Agents
          </h2>

          <ol style={{ marginTop: 12 }}>
            {topAgents.length === 0 ? (
              <li style={{ opacity: 0.8 }}>No clicks yet</li>
            ) : (
              topAgents.map(([agent, total]) => (
                <li key={agent} style={{ padding: "6px 0" }}>
                  <b>{agent}</b> — {total}
                </li>
              ))
            )}
          </ol>
        </section>
      </div>

      <section
        style={{
          marginTop: 18,
          border: "1px solid #333",
          borderRadius: 14,
          padding: 16,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>
          Recent Clicks
        </h2>

        <div
          style={{
            display: "grid",
            gap: 8,
            marginTop: 12,
          }}
        >
          {(clicks ?? []).length === 0 ? (
            <p style={{ opacity: 0.8 }}>No clicks yet</p>
          ) : (
            (clicks ?? []).slice(0, 25).map((click) => (
              <div
                key={click.id}
                style={{
                  padding: 10,
                  border: "1px solid #222",
                  borderRadius: 12,
                }}
              >
                <div style={{ fontWeight: 800 }}>
                  {click.link_key || "Unknown link"}
                </div>

                <div style={{ opacity: 0.8 }}>
                  Agent: {click.agent || "Unknown"} • Page:{" "}
                  {click.page_path || "-"} •{" "}
                  {new Date(click.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}