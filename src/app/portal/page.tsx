import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/supabase/server";

export default async function PortalPage() {
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

  const { data: analyticsAccess } = await supabase
    .from("analytics_agent_access")
    .select("backstage_manager, status")
    .eq("user_id", user.id)
    .maybeSingle();

  const isActive = userRole?.status === "active";

  const isAdmin =
    isActive && userRole?.role === "admin";

  const isAgent =
    isActive && userRole?.role === "agent";

  const isCreator =
    isActive && userRole?.role === "creator";

  const hasAnalyticsAccess =
    isAdmin ||
    (analyticsAccess?.status === "active" &&
      Boolean(analyticsAccess?.backstage_manager));

  const hasBattleAccess =
    isAdmin || isAgent || isCreator;

  if (!hasAnalyticsAccess && !hasBattleAccess) {
    redirect("/login");
  }

  let displayRole = "Member";
  let subtitle =
    "Access your available Royals Bloodline tools.";

  if (isAdmin) {
    displayRole = "Administrator";
    subtitle =
      "Manage Royals Battles, Analytics, and website administration from one place.";
  } else if (isAgent) {
    displayRole = "Agent";
    subtitle =
      "Access your battle tools and team performance in one place.";
  } else if (isCreator) {
    displayRole = "Creator";
    subtitle =
      "Access your Royals Bloodline tools.";
  } else if (hasAnalyticsAccess) {
    displayRole = "Analytics User";
    subtitle =
      "Access your Royals Bloodline performance analytics.";
  }

  let battleHref = "/crownlink";

  if (isAdmin) {
    battleHref = "/crownlink/admin";
  } else if (isAgent) {
    battleHref = "/crownlink/agent";
  }

  const toolCount = [
    hasBattleAccess,
    hasAnalyticsAccess,
    isAdmin,
  ].filter(Boolean).length;

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-5 py-10 text-white">
      {/* BACKGROUND */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-red-950/30 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[380px] w-[380px] rounded-full bg-red-950/20 blur-[110px]" />
      <div className="pointer-events-none absolute right-[8%] top-0 h-[280px] w-[280px] rounded-full bg-yellow-900/10 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* HEADER */}
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black tracking-[0.3em] text-[#d3a33c]">
              <span className="h-2 w-2 rounded-full bg-[#d3a33c] shadow-[0_0_12px_rgba(211,163,60,0.6)]" />
              ROYALS BLOODLINE
            </div>

            <h1 className="text-4xl font-black tracking-tight md:text-5xl">
              Member Portal
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-gray-400">
              {subtitle}
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#d3a33c]/20 bg-[#d3a33c]/5 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d3a33c]/20 bg-[#d3a33c]/10 text-lg text-[#d3a33c]">
              ♛
            </div>

            <div>
              <p className="text-[9px] font-black tracking-[0.2em] text-gray-500">
                ACCOUNT TYPE
              </p>

              <p className="mt-1 text-sm font-black text-[#d3a33c]">
                {displayRole}
              </p>
            </div>
          </div>
        </header>

        {/* WELCOME PANEL */}
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-[#d3a33c]/15 bg-gradient-to-br from-red-950/40 via-neutral-950 to-black p-8 shadow-2xl">
          <div className="relative z-10 max-w-2xl">
            <p className="text-[10px] font-black tracking-[0.3em] text-[#d3a33c]">
              ROYALS BLOODLINE NETWORK
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Welcome Back
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              Everything available to your account is organized below.
              Choose a section to continue.
            </p>
          </div>

          <div className="pointer-events-none absolute -bottom-8 right-6 text-[120px] text-[#d3a33c]/10">
            ♛
          </div>
        </section>

        {/* SECTION HEADER */}
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[9px] font-black tracking-[0.25em] text-[#d3a33c]">
              YOUR ACCESS
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Platform Tools
            </h2>
          </div>

          <span className="text-xs font-bold text-gray-500">
            {toolCount} available
          </span>
        </div>

        {/* CARDS */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {hasBattleAccess && (
            <Link
              href={battleHref}
              className="group flex min-h-[300px] flex-col rounded-3xl border border-[#d3a33c]/15 bg-gradient-to-br from-neutral-950 to-black p-6 text-white shadow-xl transition hover:-translate-y-1 hover:border-[#d3a33c]/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d3a33c]/20 bg-[#d3a33c]/10 text-xl text-[#d3a33c]">
                  ⚔
                </div>

                <span className="rounded-full border border-[#d3a33c]/20 bg-[#d3a33c]/5 px-3 py-1 text-[8px] font-black tracking-[0.2em] text-[#d3a33c]">
                  AVAILABLE
                </span>
              </div>

              <div className="mt-8">
                <p className="text-[9px] font-black tracking-[0.25em] text-[#d3a33c]">
                  ROYALS BATTLES
                </p>

                <h3 className="mt-2 text-2xl font-black">
                  Battle Center
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Access tournament events, matchmaking, schedules,
                  battle opponents, signups, and creator battle tools.
                </p>
              </div>

              <div className="mt-auto flex items-center justify-between pt-8 text-sm font-black text-[#d3a33c]">
                <span>Open Royals Battles</span>
                <span className="text-xl transition group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>
          )}

          {hasAnalyticsAccess && (
            <Link
              href="/admin/analytics"
              className="group flex min-h-[300px] flex-col rounded-3xl border border-[#d3a33c]/15 bg-gradient-to-br from-neutral-950 to-black p-6 text-white shadow-xl transition hover:-translate-y-1 hover:border-[#d3a33c]/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d3a33c]/20 bg-[#d3a33c]/10 text-xl text-[#d3a33c]">
                  ◈
                </div>

                <span className="rounded-full border border-[#d3a33c]/20 bg-[#d3a33c]/5 px-3 py-1 text-[8px] font-black tracking-[0.2em] text-[#d3a33c]">
                  AVAILABLE
                </span>
              </div>

              <div className="mt-8">
                <p className="text-[9px] font-black tracking-[0.25em] text-[#d3a33c]">
                  PERFORMANCE
                </p>

                <h3 className="mt-2 text-2xl font-black">
                  Backstage Analytics
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Review creator performance, diamonds, live
                  requirements, team activity, rankings, and reports.
                </p>
              </div>

              <div className="mt-auto flex items-center justify-between pt-8 text-sm font-black text-[#d3a33c]">
                <span>Open Analytics</span>
                <span className="text-xl transition group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/dashboard"
              className="group flex min-h-[300px] flex-col rounded-3xl border border-red-900/30 bg-gradient-to-br from-red-950/20 to-black p-6 text-white shadow-xl transition hover:-translate-y-1 hover:border-red-700/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-900/40 bg-red-950/30 text-xl text-red-400">
                  ♛
                </div>

                <span className="rounded-full border border-red-900/40 bg-red-950/30 px-3 py-1 text-[8px] font-black tracking-[0.2em] text-red-400">
                  ADMIN
                </span>
              </div>

              <div className="mt-8">
                <p className="text-[9px] font-black tracking-[0.25em] text-red-400">
                  ADMINISTRATION
                </p>

                <h3 className="mt-2 text-2xl font-black">
                  Website Admin
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Manage recruiting agents, tracked website links,
                  click activity, and other website tools.
                </p>
              </div>

              <div className="mt-auto flex items-center justify-between pt-8 text-sm font-black text-red-400">
                <span>Open Website Admin</span>
                <span className="text-xl transition group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>
          )}
        </div>

        {/* ACCOUNT NOTE */}
        <section className="mt-8 flex gap-4 rounded-2xl border border-[#d3a33c]/10 bg-[#d3a33c]/[0.03] p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d3a33c]/15 bg-[#d3a33c]/5 text-[#d3a33c]">
            ♛
          </div>

          <div>
            <h3 className="text-sm font-black text-gray-200">
              One Royals Bloodline Account
            </h3>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              Your access is automatically based on your assigned role
              and permissions. You do not need separate accounts for
              each section.
            </p>
          </div>
        </section>

        <p className="mt-6 text-center text-[9px] font-black tracking-[0.3em] text-gray-800">
          ROYALS BLOODLINE · MEMBER PORTAL
        </p>
      </div>
    </main>
  );
}