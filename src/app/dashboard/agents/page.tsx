import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../supabase/server";

type Agent = {
  id: number;
  slug: string;
  name: string;
  bio_short: string;
  bio: string;
  join_link: string | null;
  image: string | null;
  sort_order: number;
};

export default async function ManageAgentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: agents, error } = await supabase
    .from("agents")
    .select(
      "id, slug, name, bio_short, bio, join_link, image, sort_order"
    )
    .order("sort_order", { ascending: true });

  if (error) {
    return (
      <main
        style={{
          padding: 24,
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <h1 style={{ fontSize: 32, fontWeight: 900 }}>
          Manage Agents
        </h1>

        <p style={{ color: "red", marginTop: 12 }}>
          Error loading agents: {error.message}
        </p>
      </main>
    );
  }

  return (
    <main
      style={{
        padding: 24,
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900 }}>
            Manage Agents
          </h1>

          <p style={{ opacity: 0.8, marginTop: 6 }}>
            Add, edit, remove, and organize Royals Bloodline agents.
          </p>
        </div>

        <Link
          href="/dashboard/agents/new"
          style={{
            background: "#d4af37",
            color: "#000",
            padding: "12px 18px",
            borderRadius: 10,
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          + Add Agent
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gap: 14,
          marginTop: 24,
        }}
      >
        {(agents as Agent[] | null)?.length === 0 ? (
          <p>No agents found.</p>
        ) : (
          (agents as Agent[] | null)?.map((agent) => (
            <section
              key={agent.id}
              style={{
                border: "1px solid #333",
                borderRadius: 14,
                padding: 16,
                display: "grid",
                gridTemplateColumns: "80px 1fr auto",
                gap: 16,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid #333",
                  background: "#111",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {agent.image ? (
                  <img
                    src={agent.image}
                    alt={agent.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span style={{ opacity: 0.6 }}>No image</span>
                )}
              </div>

              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>
                  {agent.name}
                </h2>

                <p style={{ opacity: 0.7, marginTop: 4 }}>
                  /agents/{agent.slug}
                </p>

                <p
                  style={{
                    opacity: 0.85,
                    marginTop: 8,
                    lineHeight: 1.5,
                  }}
                >
                  {agent.bio_short}
                </p>

                <p style={{ opacity: 0.65, marginTop: 8 }}>
                  Display order: {agent.sort_order}
                </p>
              </div>

              <Link
                href={`/dashboard/agents/${agent.id}`}
                style={{
                  border: "1px solid #d4af37",
                  color: "#d4af37",
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontWeight: 700,
                  textDecoration: "none",
                  textAlign: "center",
                }}
              >
                Edit
              </Link>
            </section>
          ))
        )}
      </div>
    </main>
  );
}