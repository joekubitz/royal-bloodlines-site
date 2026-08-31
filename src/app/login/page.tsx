"use client";

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
        email,
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
        CHECK USER ROLE
      */

      const {
        data: userRole,
        error: roleError,
      } = await supabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", user.id)
        .single();

      if (roleError || !userRole) {
        await supabase.auth.signOut();

        setError(
          "Your account does not have access to the admin portal."
        );

        return;
      }

      if (
        userRole.role !== "admin" ||
        userRole.status !== "active"
      ) {
        await supabase.auth.signOut();

        setError(
          "Your account does not have active admin access."
        );

        return;
      }

      /*
        ADMIN LOGIN SUCCESS
      */

      router.push("/admin/analytics");
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

          <div className="text-center">

            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-500">
              Royals Bloodline
            </p>

            <h1 className="mt-3 text-3xl font-bold">
              Admin Login
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Sign in to access Backstage Analytics.
            </p>

          </div>

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
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500/60"
            />

          </div>

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
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500/60"
            />

          </div>

          <button
            type="button"
            onClick={signIn}
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-red-700 px-5 py-3 font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

        </div>

      </div>

    </main>
  );
}