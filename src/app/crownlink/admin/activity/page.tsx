import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function getSourceBadge(source: string) {
  switch (source) {
    case "ai":
      return "bg-purple-500/15 text-purple-300 border-purple-500/20";
    case "system":
      return "bg-blue-500/15 text-blue-300 border-blue-500/20";
    default:
      return "bg-orange-500/15 text-orange-300 border-orange-500/20";
  }
}

export default async function ActivityLogPage() {
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
    roleRow.role !== "admin" ||
    roleRow.status !== "active"
  ) {
    redirect("/crownlink");
  }

  const { data: activities, error } = await supabase
    .from("crownlink_activity_log")
    .select("*")
    .order("created_at", {
      ascending: false,
    })
    .limit(250);

  if (error) {
    console.error(
      "Failed to load activity log:",
      error
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">
            Royals Battles Administration
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Activity Log
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            Review important administrative,
            system, and AI actions across
            Royals Battles.
          </p>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Loaded Activity
            </p>

            <p className="mt-2 text-3xl font-bold">
              {activities?.length ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              AI Actions
            </p>

            <p className="mt-2 text-3xl font-bold">
              {activities?.filter(
                (activity) =>
                  activity.source === "ai"
              ).length ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              System Actions
            </p>

            <p className="mt-2 text-3xl font-bold">
              {activities?.filter(
                (activity) =>
                  activity.source === "system"
              ).length ?? 0}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="font-semibold">
              Recent Activity
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Newest activity appears first.
            </p>
          </div>

          {!activities ||
          activities.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10 text-xl">
                ◷
              </div>

              <h3 className="font-semibold">
                No activity yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Once we connect actions around
                Royals Battles, analytics,
                support, announcements, and RB
                AI, they will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="px-5 py-5 transition hover:bg-white/[0.02]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-white">
                          {activity.action_label}
                        </h3>

                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${getSourceBadge(
                            activity.source
                          )}`}
                        >
                          {activity.source}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                          {activity.area}
                        </span>
                      </div>

                      {activity.description && (
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                          {activity.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500">
                        <span>
                          By{" "}
                          <span className="font-medium text-zinc-300">
                            {activity.actor_name ||
                              "System"}
                          </span>
                        </span>

                        {activity.actor_role && (
                          <span>
                            Role:{" "}
                            <span className="text-zinc-300">
                              {activity.actor_role}
                            </span>
                          </span>
                        )}

                        {activity.target_name && (
                          <span>
                            Target:{" "}
                            <span className="text-zinc-300">
                              {activity.target_name}
                            </span>
                          </span>
                        )}

                        {activity.target_type && (
                          <span>
                            Type:{" "}
                            <span className="text-zinc-300">
                              {activity.target_type}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-xs text-zinc-500 sm:text-right">
                      {formatDate(
                        activity.created_at
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}