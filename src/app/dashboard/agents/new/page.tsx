import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";
import NewAgentForm from "./NewAgentForm";

export default async function NewAgentPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: lastAgent } = await supabase
    .from("agents")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const suggestedSortOrder = (lastAgent?.sort_order ?? 0) + 1;

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
        Add New Agent
      </h1>

      <p
        style={{
          opacity: 0.8,
          marginTop: 6,
          marginBottom: 24,
        }}
      >
        Add a new agent to the Royals Bloodline website.
      </p>

      <NewAgentForm suggestedSortOrder={suggestedSortOrder} />
    </main>
  );
}