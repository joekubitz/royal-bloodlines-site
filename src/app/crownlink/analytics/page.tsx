import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

import ConnectAnalyticsClient from "./ConnectAnalyticsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CreatorAnalyticsPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
    ROLE CHECK
  */

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    !userRole ||
    userRole.status !== "active" ||
    userRole.role !== "creator"
  ) {
    redirect("/portal");
  }

  /*
    CHECK FOR APPROVED LINK
  */

  const { data: analyticsLink } =
    await adminSupabase
      .from("creator_analytics_links")
      .select(`
        id,
        creator_record_id,
        status,
        approved_at
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

  /*
    IF LINKED, LOAD THEIR LATEST STATS
  */

  let latestStats: {
    creator_id: string;
    username: string;
    manager: string | null;
    diamonds: number | null;
    live_days: number | null;
    live_duration: number | null;
    matches: number | null;
    diamonds_from_matches: number | null;
    last_month_diamonds: number | null;
    last_month_days: number | null;
    last_month_hours: number | null;
    days_since_joining: number | null;
    imported_at: string | null;
  } | null = null;

  if (analyticsLink?.creator_record_id) {
    const { data } = await adminSupabase
      .from("backstage_creator_stats")
      .select(`
        creator_id,
        username,
        manager,
        diamonds,
        live_days,
        live_duration,
        matches,
        diamonds_from_matches,
        last_month_diamonds,
        last_month_days,
        last_month_hours,
        days_since_joining,
        imported_at
      `)
      .eq(
        "creator_id",
        analyticsLink.creator_record_id
      )
      .order("imported_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    latestStats = data ?? null;
  }

  /*
    CHECK PENDING REQUEST
  */

  const { data: pendingRequest } =
    await adminSupabase
      .from(
        "creator_analytics_link_requests"
      )
      .select(`
        id,
        requested_creator_record_id,
        requested_username,
        status,
        created_at
      `)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/crownlink"
          className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white"
        >
          ← Back to Bloodline Arena
        </Link>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-500">
            Royals Bloodline
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Creator Analytics
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            View your personal TikTok LIVE
            Backstage performance inside
            Bloodline Arena.
          </p>
        </div>

        {analyticsLink ? (
          /*
            APPROVED / LINKED
          */
          <section className="mt-8">
            {latestStats ? (
              <>
                <div className="rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-950/30 via-zinc-950 to-black p-7">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-400">
                    Connected Profile
                  </p>

                  <h2 className="mt-2 text-3xl font-black">
                    @{latestStats.username}
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    Your analytics are securely
                    connected using your TikTok
                    Creator ID.
                  </p>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    label="Diamonds"
                    value={formatNumber(
                      latestStats.diamonds
                    )}
                    featured
                  />

                  <StatCard
                    label="LIVE Days"
                    value={formatNumber(
                      latestStats.live_days
                    )}
                  />

                  <StatCard
                    label="LIVE Hours"
                    value={formatDecimal(
                      latestStats.live_duration
                    )}
                  />

                  <StatCard
                    label="Matches"
                    value={formatNumber(
                      latestStats.matches
                    )}
                  />

                  <StatCard
                    label="Match Diamonds"
                    value={formatNumber(
                      latestStats.diamonds_from_matches
                    )}
                  />

                  <StatCard
                    label="Last Month Diamonds"
                    value={formatNumber(
                      latestStats.last_month_diamonds
                    )}
                  />

                  <StatCard
                    label="Last Month Days"
                    value={formatNumber(
                      latestStats.last_month_days
                    )}
                  />

                  <StatCard
                    label="Last Month Hours"
                    value={formatDecimal(
                      latestStats.last_month_hours
                    )}
                  />
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Backstage Information
                  </p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    

                    <InfoRow
                      label="Days Since Joining"
                      value={formatNumber(
                        latestStats.days_since_joining
                      )}
                    />

                    <InfoRow
                      label="Creator ID"
                      value={
                        latestStats.creator_id
                      }
                    />

                    <InfoRow
                      label="Last Updated"
                      value={
                        latestStats.imported_at
                          ? new Date(
                              latestStats.imported_at
                            ).toLocaleString()
                          : "Unknown"
                      }
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6">
                <h2 className="font-bold text-yellow-300">
                  Analytics connected
                </h2>

                <p className="mt-2 text-sm text-yellow-100/70">
                  Your account is connected,
                  but we couldn't find statistics
                  from the latest Backstage
                  uploads yet.
                </p>
              </div>
            )}
          </section>
        ) : pendingRequest ? (
          /*
            PENDING
          */
          <section className="mt-8 rounded-3xl border border-yellow-500/25 bg-yellow-500/[0.07] p-7">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
              Pending Approval
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Your analytics connection is
              waiting for approval.
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              You requested access to{" "}
              <span className="font-bold text-white">
                @
                {
                  pendingRequest.requested_username
                }
              </span>
              . An administrator will verify
              that this profile belongs to you
              before analytics are displayed.
            </p>
          </section>
        ) : (
          /*
            NOT CONNECTED
          */
          <ConnectAnalyticsClient />
        )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  featured = false,
}: {
  label: string;
  value: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        featured
          ? "border-orange-500/30 bg-orange-500/10"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-black ${
          featured
            ? "text-orange-400"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-gray-600">
        {label}
      </p>

      <p className="mt-1 break-all text-sm font-semibold text-gray-300">
        {value}
      </p>
    </div>
  );
}

function formatNumber(
  value: number | null | undefined
) {
  return Number(value ?? 0).toLocaleString();
}

function formatDecimal(
  value: number | null | undefined
) {
  return Number(value ?? 0).toFixed(2);
}