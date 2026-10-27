
import { NextResponse } from "next/server";
import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

async function authorized() {
  const client = await createClient();

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) return false;

  const { data, error } = await client
    .from("user_roles")
    .select("role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    !error &&
    data?.role === "admin" &&
    data?.status === "active"
  );
}

function normalizeManager(value: string) {
  return value.trim().toLowerCase();
}

// Retrieve all Backstage manager identifiers.
// Pagination avoids Supabase's default row limit.
async function getBackstageManagers(
  admin: ReturnType<typeof createAdminClient>
) {
  const managers = new Set<string>();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from("backstage_creator_stats")
      .select("manager")
      .not("manager", "is", null)
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);

    for (const row of data ?? []) {
      if (typeof row.manager === "string") {
        const manager = normalizeManager(row.manager);
        if (manager) managers.add(manager);
      }
    }

    if ((data?.length ?? 0) < pageSize) break;
    from += pageSize;
  }

  return [...managers].sort((a, b) =>
    a.localeCompare(b)
  );
}

export async function GET() {
  if (!(await authorized())) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  const admin = createAdminClient();

  try {
    const [
      roles,
      access,
      assignments,
      backstageAssignments,
      backstageManagers,
    ] = await Promise.all([
      admin
        .from("user_roles")
        .select("user_id, role, status")
        .eq("role", "agent")
        .eq("status", "active"),

      admin
        .from("analytics_agent_access")
        .select("user_id, backstage_manager, status"),

      admin
        .from("analytics_agent_hierarchy")
        .select("parent_agent_id, child_agent_id"),

      admin
        .from("analytics_backstage_hierarchy")
        .select("supervisor_manager, underagent_manager"),

      getBackstageManagers(admin),
    ]);

    const queryError =
      roles.error ??
      access.error ??
      assignments.error ??
      backstageAssignments.error;

    if (queryError) {
      return NextResponse.json(
        { error: queryError.message },
        { status: 500 }
      );
    }

    const accessByUser = new Map(
      (access.data ?? []).map((a) => [a.user_id, a])
    );

    const agentIds = new Set(
      (roles.data ?? []).map((role) => role.user_id)
    );

    const emailByUser = new Map<string, string>();
    let page = 1;

    while (true) {
      const { data, error: usersError } =
        await admin.auth.admin.listUsers({
          page,
          perPage: 1000,
        });

      if (usersError) {
        return NextResponse.json(
          { error: usersError.message },
          { status: 500 }
        );
      }

      for (const user of data.users) {
        if (agentIds.has(user.id)) {
          emailByUser.set(user.id, user.email ?? "");
        }
      }

      if (data.users.length < 1000) break;
      page++;
    }

    // Existing registered website agents.
    const agents = (roles.data ?? [])
      .map((role) => {
        const analytics = accessByUser.get(role.user_id);

        return {
          user_id: role.user_id,
          email: emailByUser.get(role.user_id) ?? "",
          backstage_manager:
            analytics?.backstage_manager ?? "",
          status: analytics?.status ?? "not_configured",
        };
      })
      .sort((a, b) =>
        (a.email || a.backstage_manager).localeCompare(
          b.email || b.backstage_manager
        )
      );

    // Backstage managers, including those without accounts.
    const backstageAgents = backstageManagers.map(
      (manager) => {
        const linkedAccount = agents.find(
          (agent) =>
            normalizeManager(agent.backstage_manager) ===
            manager
        );

        return {
          manager,
          user_id: linkedAccount?.user_id ?? null,
          email: linkedAccount?.email ?? "",
          has_website_account: Boolean(linkedAccount),
          analytics_configured:
            linkedAccount?.status === "active",
        };
      }
    );

    return NextResponse.json({
      agents,
      assignments: assignments.data ?? [],
      backstageAgents,
      backstageAssignments:
        backstageAssignments.data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load hierarchy.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await authorized())) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const admin = createAdminClient();

  // New Backstage hierarchy assignment.
  if (body?.type === "backstage") {
    if (
      typeof body.supervisorManager !== "string" ||
      typeof body.underagentManager !== "string"
    ) {
      return NextResponse.json(
        { error: "Select two Backstage managers." },
        { status: 400 }
      );
    }

    const supervisor = normalizeManager(
      body.supervisorManager
    );
    const underagent = normalizeManager(
      body.underagentManager
    );

    if (
      !supervisor ||
      !underagent ||
      supervisor === underagent
    ) {
      return NextResponse.json(
        { error: "Select two different managers." },
        { status: 400 }
      );
    }

    try {
      const validManagers = new Set(
        await getBackstageManagers(admin)
      );

      if (
        !validManagers.has(supervisor) ||
        !validManagers.has(underagent)
      ) {
        return NextResponse.json(
          {
            error:
              "Both managers must exist in Backstage analytics.",
          },
          { status: 400 }
        );
      }

      const { data: hierarchy, error } = await admin
        .from("analytics_backstage_hierarchy")
        .select("supervisor_manager, underagent_manager");

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      const parents = new Map(
        (hierarchy ?? []).map((row) => [
          normalizeManager(row.underagent_manager),
          normalizeManager(row.supervisor_manager),
        ])
      );

      let cursor: string | undefined = supervisor;
      const visited = new Set<string>();

      while (cursor) {
        if (cursor === underagent) {
          return NextResponse.json(
            {
              error:
                "This assignment would create a reporting cycle.",
            },
            { status: 400 }
          );
        }

        if (visited.has(cursor)) {
          return NextResponse.json(
            {
              error:
                "An existing reporting cycle was detected.",
            },
            { status: 400 }
          );
        }

        visited.add(cursor);
        cursor = parents.get(cursor);
      }

      const { error: writeError } = await admin
        .from("analytics_backstage_hierarchy")
        .upsert(
          {
            supervisor_manager: supervisor,
            underagent_manager: underagent,
          },
          { onConflict: "underagent_manager" }
        );

      if (writeError) {
        return NextResponse.json(
          { error: writeError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unable to save Backstage assignment.",
        },
        { status: 500 }
      );
    }
  }

  // Existing website-agent hierarchy assignment.
  const supervisor = body?.supervisorUserId;
  const underagent = body?.underagentUserId;

  if (
    typeof supervisor !== "string" ||
    typeof underagent !== "string" ||
    supervisor === underagent
  ) {
    return NextResponse.json(
      { error: "Select two different agents." },
      { status: 400 }
    );
  }

  const { data: agents, error } = await admin
    .from("analytics_agent_access")
    .select("user_id, backstage_manager, status")
    .in("user_id", [supervisor, underagent]);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  if (
    agents?.length !== 2 ||
    agents.some(
      (a) => a.status !== "active" || !a.backstage_manager
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Both users must have active analytics access.",
      },
      { status: 400 }
    );
  }

  const { data: hierarchy, error: hierarchyError } =
    await admin
      .from("analytics_agent_hierarchy")
      .select("parent_agent_id, child_agent_id");

  if (hierarchyError) {
    return NextResponse.json(
      { error: hierarchyError.message },
      { status: 500 }
    );
  }

  const parents = new Map(
    (hierarchy ?? []).map((row) => [
      row.child_agent_id,
      row.parent_agent_id,
    ])
  );

  let cursor: string | undefined = supervisor;
  const visited = new Set<string>();

  while (cursor) {
    if (cursor === underagent) {
      return NextResponse.json(
        {
          error:
            "This assignment would create a reporting cycle.",
        },
        { status: 400 }
      );
    }

    if (visited.has(cursor)) {
      return NextResponse.json(
        { error: "Existing reporting cycle detected." },
        { status: 400 }
      );
    }

    visited.add(cursor);
    cursor = parents.get(cursor);
  }

  const { error: writeError } = await admin
    .from("analytics_agent_hierarchy")
    .upsert(
      {
        parent_agent_id: supervisor,
        child_agent_id: underagent,
      },
      { onConflict: "child_agent_id" }
    );

  if (writeError) {
    return NextResponse.json(
      { error: writeError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  if (!(await authorized())) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const admin = createAdminClient();

  // Remove a Backstage hierarchy assignment.
  if (body?.type === "backstage") {
    if (typeof body.underagentManager !== "string") {
      return NextResponse.json(
        { error: "Missing Backstage underagent." },
        { status: 400 }
      );
    }

    const underagent = normalizeManager(
      body.underagentManager
    );

    const { error } = await admin
      .from("analytics_backstage_hierarchy")
      .delete()
      .eq("underagent_manager", underagent);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  }

  // Existing website hierarchy deletion.
  if (typeof body?.underagentUserId !== "string") {
    return NextResponse.json(
      { error: "Missing underagent." },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from("analytics_agent_hierarchy")
    .delete()
    .eq("child_agent_id", body.underagentUserId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
