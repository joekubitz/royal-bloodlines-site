import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";
import EditAgentForm from "./EditAgentForm";

export type Agent = {
  id: number;
  slug: string;
  name: string;
  bio_short: string;
  bio: string;
  join_link: string | null;
  image: string | null;
  sort_order: number;
};

type EditAgentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditAgentPage({
  params,
}: EditAgentPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const agentId = Number(id);

  if (!Number.isInteger(agentId)) {
    notFound();
  }

  const { data: agent, error } = await supabase
    .from("agents")
    .select(
      "id, slug, name, bio_short, bio, join_link, image, sort_order"
    )
    .eq("id", agentId)
    .single();

  if (error || !agent) {
    notFound();
  }

  return (
    <main
      style={{
        padding: 24,
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <Link
        href="/dashboard/agents"
        style={{
          color: "#d4af37",
          textDecoration: "none",
          fontWeight: 700,
        }}
      >
        ← Back to Manage Agents
      </Link>

      <h1
        style={{
          fontSize: 32,
          fontWeight: 900,
          marginTop: 20,
        }}
      >
        Edit Agent
      </h1>

      <p
        style={{
          opacity: 0.8,
          marginTop: 6,
          marginBottom: 24,
        }}
      >
        Update {agent.name}&apos;s information.
      </p>

      <EditAgentForm agent={agent as Agent} />
    </main>
  );
}