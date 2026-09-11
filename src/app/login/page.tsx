"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "../supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      const user = authData.user;

      if (!user) {
        setError("Unable to sign in.");
        return;
      }

      /*
        CHECK BLOODLINE ARENA ROLE
      */
      const {
        data: userRole,
        error: roleError,
      } = await supabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", user.id)
        .maybeSingle();

      const hasActiveRole =
        !roleError &&
        userRole?.status === "active" &&
        ["admin", "agent", "creator"].includes(
          userRole?.role ?? ""
        );

      /*
        CHECK ANALYTICS ACCESS
      */
      const {
        data: analyticsAccess,
        error: analyticsAccessError,
      } = await supabase
        .from("analytics_agent_access")
        .select("backstage_manager, status")
        .eq("user_id", user.id)
        .maybeSingle();

      const hasAnalyticsAccess =
        !analyticsAccessError &&
        analyticsAccess?.status === "active" &&
        Boolean(analyticsAccess?.backstage_manager);

      /*
        CHECK ADMIN
      */
      const isAdmin =
        userRole?.role === "admin" &&
        userRole?.status === "active";

      /*
        USER MUST HAVE ACCESS TO AT LEAST
        ONE PART OF THE PLATFORM
      */
      if (
        !isAdmin &&
        !hasActiveRole &&
        !hasAnalyticsAccess
      ) {
        await supabase.auth.signOut();

        setError(
          "Your account does not currently have access to the Royals Bloodline portal."
        );

        return;
      }

      /*
        CREATORS GO DIRECTLY
        TO BLOODLINE ARENA
      */
      if (
        userRole?.role === "creator" &&
        userRole?.status === "active"
      ) {
        router.push("/bloodline-arena");
        router.refresh();
        return;
      }

      /*
        AGENTS + ADMINS GO
        TO THE SHARED PORTAL
      */
      router.push("/portal");
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);

      setError(
        "Unexpected error. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter" && !loading) {
      signIn();
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl">

          {/* BRANDING */}
          <div className="text-center">
            <div className="mb-2 text-4xl text-[#d3a33c]">
              ♛
            </div>

            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#d3a33c]">
              Royals Bloodline
            </p>

            <h1 className="mt-3 text-3xl font-bold">
              Member Portal
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Sign in to access Bloodline Arena,
              Analytics, and your available tools.
            </p>
          </div>

          {/* EMAIL */}
          <div className="mt-8">
            <label className="mb-2 block text-sm font-semibold text-gray-300">
              Email
            </label>

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              onKeyDown={handleKeyDown}
              autoComplete="email"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-[#d3a33c]/60"
            />
          </div>

          {/* PASSWORD */}
          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-gray-300">
              Password
            </label>

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              onKeyDown={handleKeyDown}
              autoComplete="current-password"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-[#d3a33c]/60"
            />
          </div>

          {/* FORGOT PASSWORD */}
          <div className="mt-3 text-right">
            <Link
              href="/bloodline-arena/forgot-password"
              className="text-sm font-semibold text-[#d3a33c] transition hover:opacity-80"
            >
              Forgot Password?
            </Link>
          </div>

          {/* SIGN IN */}
          <button
            type="button"
            onClick={signIn}
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-[#d3a33c] px-5 py-3 font-black text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>

          {/* ERROR */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* CREATOR DIVIDER */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />

            <span className="whitespace-nowrap text-xs font-bold uppercase tracking-widest text-gray-600">
              New Creator?
            </span>

            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* CREATOR REGISTRATION */}
          <Link
            href="/bloodline-arena/register"
            className="block w-full rounded-xl border border-[#d3a33c]/40 bg-[#d3a33c]/10 px-5 py-3 text-center font-black text-[#d3a33c] transition hover:bg-[#d3a33c]/15"
          >
            Create Creator Account
          </Link>

          <p className="mt-3 text-center text-xs leading-5 text-gray-500">
            You will need a valid registration code from your agent.
          </p>

          {/* FOOTER */}
          <p className="mt-6 text-center text-xs text-gray-600">
            Royals Bloodline Member Access
          </p>
        </div>
      </div>
    </main>
  );
}