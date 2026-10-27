
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";
import AgentAccessClient from "./AgentAccessClient";
import HierarchyClient, {
  BackstageHierarchyClient,
} from "./HierarchyClient";

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

  return (
    <>
      <AgentAccessClient />

      <div className="mx-auto max-w-3xl px-6 pb-12">
        {/* Existing website agent hierarchy */}
        <HierarchyClient />

        {/* New Backstage manager hierarchy */}
        <BackstageHierarchyClient />
      </div>
    </>
  );
}
