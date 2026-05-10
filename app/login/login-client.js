"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginClient() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";

  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");

  const isSignup = mode === "signup";

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        setMsgType("success");
        setMsg("Account created. You can now sign in.");
        setMode("signin");
        setPassword("");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.replace(next);
        router.refresh();
      }
    } catch (err) {
      setMsgType("error");
      setMsg(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="hidden overflow-hidden border-r border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.28),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.18),_transparent_32%)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/70">
              TTC Journal
            </div>

            <div className="mt-20 max-w-xl">
              <h1 className="text-5xl font-semibold tracking-tight">
                Build discipline through every trade.
              </h1>
              <p className="mt-5 text-lg leading-8 text-white/60">
                Track setups, execution, risk, screenshots, and strategy
                feedback in one focused trading journal.
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm text-white/60">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              Strategy-first journaling
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              Image-backed trade reviews
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              Private by default
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="text-sm font-medium text-white/60">
                TTC Journal
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                Build discipline through every trade.
              </h1>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur md:p-8">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  {isSignup ? "Create your account" : "Welcome back"}
                </h2>
                <p className="mt-2 text-sm text-white/50">
                  {isSignup
                    ? "Start tracking your trading process."
                    : "Sign in to continue your journal."}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 rounded-xl border border-white/10 bg-black/20 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setMsg("");
                  }}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    !isSignup
                      ? "bg-white text-black"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Sign in
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setMsg("");
                  }}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    isSignup
                      ? "bg-white text-black"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Sign up
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">
                    Email
                  </label>
                  <input
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/30"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">
                    Password
                  </label>
                  <input
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/30"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    minLength={6}
                  />
                </div>

                {msg ? (
                  <div
                    className={`rounded-xl border px-4 py-3 text-sm ${
                      msgType === "success"
                        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                        : "border-red-400/20 bg-red-400/10 text-red-200"
                    }`}
                  >
                    {msg}
                  </div>
                ) : null}

                <button
                  className="h-12 w-full rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Please wait..."
                    : isSignup
                      ? "Create account"
                      : "Sign in"}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-xs text-white/40">
              By continuing, you agree to use TTC Journal responsibly for your
              personal trading review.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
