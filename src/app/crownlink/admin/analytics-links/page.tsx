import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/app/supabase/server";
import { createAdminClient } from "@/app/supabase/admin";

import AnalyticsLinkActions from "./AnalyticsLinkActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AnalyticsLinksAdminPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

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
    !role ||
    role.role !== "admin" ||
    role.status !== "active"
  ) {
    redirect("/portal");
  }

  const {
    data: requests,
    error,
  } = await adminSupabase
    .from("creator_analytics_link_requests")
    .select(`
      id,
      user_id,
      requested_creator_record_id,
      requested_username,
      status,
      created_at
    `)
    .eq("status", "pending")
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Analytics link requests load error:",
      error
    );
  }

  const requestList = requests ?? [];

  const enrichedRequests = await Promise.all(
    requestList.map(async (request) => {
      const { data: profile } =
        await adminSupabase
          .from("crownlink_profiles")
          .select(`
            display_name,
            tiktok_username
          `)
          .eq("user_id", request.user_id)
          .maybeSingle();

      const { data: backstage } =
        await adminSupabase
          .from("backstage_creator_stats")
          .select(`
            creator_id,
            username,
            manager,
            diamonds,
            live_days,
            live_duration
          `)
          .eq(
            "creator_id",
            request.requested_creator_record_id
          )
          .order("imported_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

      return {
        ...request,
        profile,
        backstage,
      };
    })
  );

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/crownlink/admin"
          className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white"
        >
          ← Back to Admin
        </Link>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-500">
            Royals Bloodline
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Analytics Link Requests
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            Review creator requests to connect their
            Royals Battles account to their TikTok
            Backstage analytics.
          </p>
        </div>

        {enrichedRequests.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <h2 className="text-xl font-black">
              No pending requests
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              There are currently no creator analytics
              requests waiting for approval.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {enrichedRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
                      Requested Profile
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      @{request.requested_username}
                    </h2>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Info
                        label="Account Display Name"
                        value={
                          request.profile?.display_name ||
                          "Not set"
                        }
                      />

                      <Info
                        label="Account TikTok"
                        value={
                          request.profile?.tiktok_username
                            ? `@${request.profile.tiktok_username}`
                            : "Not set"
                        }
                      />

                      <Info
                        label="Backstage Username"
                        value={
                          request.backstage?.username
                            ? `@${request.backstage.username}`
                            : "Not found"
                        }
                      />

                      <Info
                        label="Manager"
                        value={
                          request.backstage?.manager ||
                          "Not listed"
                        }
                      />

                      <Info
                        label="Diamonds"
                        value={Number(
                          request.backstage?.diamonds ?? 0
                        ).toLocaleString()}
                      />

                      <Info
                        label="Creator ID"
                        value={
                          request.requested_creator_record_id
                        }
                      />
                    </div>
                  </div>

                  <AnalyticsLinkActions
                    requestId={request.id}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
        {label}
      </p>

      <p className="mt-1 break-all text-sm font-semibold text-gray-300">
        {value}
      </p>
    </div>
  );
}