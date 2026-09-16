import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/supabase/server";
import ImportRewardsForm from "../ImportRewardsForm";

export default async function ImportRewardsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/crownlink/login");
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    !roleRow ||
    roleRow.status !== "active" ||
    roleRow.role !== "admin"
  ) {
    redirect("/crownlink");
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link
            href="/crownlink/admin/rewards"
            className="text-sm font-medium text-orange-400 hover:text-orange-300"
          >
            ← Back to Rewards
          </Link>

          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">
              Bloodline Arena
            </p>

            <h1 className="text-3xl font-bold">
              Import Rewards
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Copy the reward rows from Airtable and paste them below.
              Bloodline Arena will separate the records and check for duplicates
              before anything is imported.
            </p>
          </div>
        </div>

        <ImportRewardsForm />
      </div>
    </main>
  );
}