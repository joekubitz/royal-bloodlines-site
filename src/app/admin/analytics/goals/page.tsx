import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

type GoalRow = {
  id: string;
  goal_month: string;
  goal_type: "overall" | "manager";
  backstage_manager: string | null;
  diamond_goal: number;
};

type AccessRow = {
  user_id: string;
  backstage_manager: string;
  status: string;
};

function getMonthStart() {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1
    )
  )
    .toISOString()
    .slice(0, 10);
}

export default async function DiamondGoalsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin =
    userRole?.role === "admin" &&
    userRole?.status === "active";

  if (!isAdmin) {
    redirect("/portal");
  }

  const adminSupabase = createAdminClient();

  const currentMonth = getMonthStart();

  const [
    { data: goalsData },
    { data: accessData },
  ] = await Promise.all([
    adminSupabase
      .from("analytics_diamond_goals")
      .select(
        `
          id,
          goal_month,
          goal_type,
          backstage_manager,
          diamond_goal
        `
      )
      .eq("goal_month", currentMonth),

    adminSupabase
      .from("analytics_agent_access")
      .select(
        `
          user_id,
          backstage_manager,
          status
        `
      )
      .eq("status", "active")
      .order("backstage_manager", {
        ascending: true,
      }),
  ]);

  const goals = (goalsData ?? []) as GoalRow[];
  const accessRows = (accessData ?? []) as AccessRow[];

  const overallGoal =
    goals.find(
      (goal) => goal.goal_type === "overall"
    ) ?? null;

  const managerGoals = new Map(
    goals
      .filter(
        (goal) => goal.goal_type === "manager"
      )
      .map((goal) => [
        goal.backstage_manager
          ?.trim()
          .toLowerCase() ?? "",
        goal,
      ])
  );

  const managers = Array.from(
    new Set(
      accessRows
        .map((row) =>
          row.backstage_manager?.trim()
        )
        .filter(Boolean)
    )
  ) as string[];

  async function saveOverallGoal(
    formData: FormData
  ) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: role } = await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      role?.role !== "admin" ||
      role?.status !== "active"
    ) {
      redirect("/portal");
    }

    const rawGoal = String(
      formData.get("diamond_goal") ?? ""
    ).replace(/,/g, "");

    const diamondGoal = Number(rawGoal);

    if (
      !Number.isFinite(diamondGoal) ||
      diamondGoal < 0
    ) {
      return;
    }

    const adminSupabase =
      createAdminClient();

    const { data: existingGoal } =
      await adminSupabase
        .from("analytics_diamond_goals")
        .select("id")
        .eq("goal_month", currentMonth)
        .eq("goal_type", "overall")
        .maybeSingle();

    if (existingGoal) {
      await adminSupabase
        .from("analytics_diamond_goals")
        .update({
          diamond_goal: Math.round(
            diamondGoal
          ),
        })
        .eq("id", existingGoal.id);
    } else {
      await adminSupabase
        .from("analytics_diamond_goals")
        .insert({
          goal_month: currentMonth,
          goal_type: "overall",
          backstage_manager: null,
          diamond_goal: Math.round(
            diamondGoal
          ),
          created_by: user.id,
        });
    }

    revalidatePath(
      "/admin/analytics/goals"
    );

    revalidatePath(
      "/admin/analytics"
    );
  }

  async function saveManagerGoal(
    formData: FormData
  ) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: role } = await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      role?.role !== "admin" ||
      role?.status !== "active"
    ) {
      redirect("/portal");
    }

    const manager = String(
      formData.get("backstage_manager") ?? ""
    ).trim();

    const rawGoal = String(
      formData.get("diamond_goal") ?? ""
    ).replace(/,/g, "");

    const diamondGoal = Number(rawGoal);

    if (
      !manager ||
      !Number.isFinite(diamondGoal) ||
      diamondGoal < 0
    ) {
      return;
    }

    const adminSupabase =
      createAdminClient();

    const { data: existingGoals } =
      await adminSupabase
        .from("analytics_diamond_goals")
        .select(
          `
            id,
            backstage_manager
          `
        )
        .eq("goal_month", currentMonth)
        .eq("goal_type", "manager");

    const existingGoal =
      existingGoals?.find(
        (goal) =>
          goal.backstage_manager
            ?.trim()
            .toLowerCase() ===
          manager.toLowerCase()
      );

    if (existingGoal) {
      await adminSupabase
        .from("analytics_diamond_goals")
        .update({
          diamond_goal: Math.round(
            diamondGoal
          ),
          backstage_manager: manager,
        })
        .eq("id", existingGoal.id);
    } else {
      await adminSupabase
        .from("analytics_diamond_goals")
        .insert({
          goal_month: currentMonth,
          goal_type: "manager",
          backstage_manager: manager,
          diamond_goal: Math.round(
            diamondGoal
          ),
          created_by: user.id,
        });
    }

    revalidatePath(
      "/admin/analytics/goals"
    );

    revalidatePath(
      "/admin/analytics"
    );
  }

  async function deleteManagerGoal(
    formData: FormData
  ) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: role } = await supabase
      .from("user_roles")
      .select("role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      role?.role !== "admin" ||
      role?.status !== "active"
    ) {
      redirect("/portal");
    }

    const goalId = String(
      formData.get("goal_id") ?? ""
    );

    if (!goalId) {
      return;
    }

    const adminSupabase =
      createAdminClient();

    await adminSupabase
      .from("analytics_diamond_goals")
      .delete()
      .eq("id", goalId)
      .eq("goal_type", "manager");

    revalidatePath(
      "/admin/analytics/goals"
    );

    revalidatePath(
      "/admin/analytics"
    );
  }

  const monthLabel = new Date(
    `${currentMonth}T12:00:00`
  ).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/admin/analytics"
              className="mb-4 inline-flex text-sm font-semibold text-[#d3a33c]"
            >
              ← Back to Analytics
            </Link>

            <p className="text-sm uppercase tracking-[0.3em] text-red-500">
              Royals Bloodline
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Diamond Goals
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Set monthly diamond targets for the
              overall team and individual agents.
            </p>
          </div>

          <div className="rounded-2xl border border-[#d3a33c]/20 bg-[#d3a33c]/5 px-5 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              Goal Month
            </p>

            <p className="mt-1 font-black text-[#d3a33c]">
              {monthLabel}
            </p>
          </div>
        </div>

        {/* OVERALL GOAL */}
        <section className="mt-8 rounded-3xl border border-[#d3a33c]/20 bg-gradient-to-br from-red-950/20 to-neutral-950 p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d3a33c]">
            Overall Agency
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Royals Bloodline Goal
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            This target includes all agents and
            CameraKings&apos; own team combined. Only
            administrators will see this overall goal.
          </p>

          <form
            action={saveOverallGoal}
            className="mt-6 flex flex-col gap-3 sm:flex-row"
          >
            <input
              name="diamond_goal"
              type="number"
              min="0"
              step="1"
              defaultValue={
                overallGoal?.diamond_goal ?? ""
              }
              placeholder="Example: 50000000"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-[#d3a33c]/60"
            />

            <button
              type="submit"
              className="rounded-xl bg-[#d3a33c] px-6 py-3 font-black text-black"
            >
              Save Overall Goal
            </button>
          </form>

          {overallGoal && (
            <p className="mt-4 text-sm text-gray-400">
              Current target:{" "}
              <span className="font-black text-[#d3a33c]">
                {Number(
                  overallGoal.diamond_goal
                ).toLocaleString()}{" "}
                diamonds
              </span>
            </p>
          )}
        </section>

        {/* AGENT GOALS */}
        <section className="mt-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#d3a33c]">
              Team Targets
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Agent Goals
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              Each agent will only see the goal assigned
              to their own Backstage team.
            </p>
          </div>

          <div className="mt-5 grid gap-4">
            {managers.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-gray-400">
                No active Analytics agents were found.
              </div>
            ) : (
              managers.map((manager) => {
                const goal =
                  managerGoals.get(
                    manager.toLowerCase()
                  );

                return (
                  <div
                    key={manager}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
                          Backstage Manager
                        </p>

                        <h3 className="mt-1 text-lg font-black">
                          {manager}
                        </h3>

                        {goal ? (
                          <p className="mt-2 text-sm text-gray-400">
                            Current goal:{" "}
                            <span className="font-bold text-[#d3a33c]">
                              {Number(
                                goal.diamond_goal
                              ).toLocaleString()}{" "}
                              diamonds
                            </span>
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-gray-500">
                            No goal set yet.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <form
                          action={saveManagerGoal}
                          className="flex flex-col gap-3 sm:flex-row"
                        >
                          <input
                            type="hidden"
                            name="backstage_manager"
                            value={manager}
                          />

                          <input
                            name="diamond_goal"
                            type="number"
                            min="0"
                            step="1"
                            defaultValue={
                              goal?.diamond_goal ?? ""
                            }
                            placeholder="Diamond goal"
                            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-[#d3a33c]/60 sm:w-48"
                          />

                          <button
                            type="submit"
                            className="rounded-xl border border-[#d3a33c]/30 bg-[#d3a33c]/10 px-5 py-3 text-sm font-black text-[#d3a33c]"
                          >
                            {goal
                              ? "Update Goal"
                              : "Set Goal"}
                          </button>
                        </form>

                        {goal && (
                          <form
                            action={
                              deleteManagerGoal
                            }
                          >
                            <input
                              type="hidden"
                              name="goal_id"
                              value={goal.id}
                            />

                            <button
                              type="submit"
                              className="h-full rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-black text-red-300"
                            >
                              Remove
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}