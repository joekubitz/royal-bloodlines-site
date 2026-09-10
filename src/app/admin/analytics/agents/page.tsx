import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import AgentAccessClient from "./AgentAccessClient";

export default async function AnalyticsAgentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userRole, error: roleError } = await supabase
    .from("user_roles")
    .select("role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    roleError ||
    userRole?.role !== "admin" ||
    userRole?.status !== "active"
  ) {
    redirect("/admin/analytics");
  }

  return <AgentAccessClient />;
}
