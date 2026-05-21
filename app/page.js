"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
        const { error } = await supabase.auth.signUp({ email, password });
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
    <main className="min-h-screen bg-[#02040b] text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden border-r border-cyan-400/10 lg:block">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/excellion-hero.jpeg')" }}
          />

          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,180,255,0.14),transparent_44%)]" />

          <div className="relative z-10 flex min-h-screen flex-col px-10 py-8">
            <Link href="/" className="inline-flex w-fit items-center">
              <img
                src="/logo.png"
                alt="EXCELLION TTC"
                className="h-36 w-auto object-contain"
              />
            </Link>

            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <h1 className="text-6xl font-black uppercase tracking-[0.14em]">
                <span className="bg-gradient-to-r from-white via-white to-cyan-400 bg-clip-text text-transparent">
                  EXCELLION
                </span>
              </h1>

              <p className="mt-3 text-2xl font-light tracking-wide text-white/75">
                Forging Market Wizards Through Discipline.
              </p>

              <div className="relative mt-7 h-[2px] w-[360px] overflow-hidden rounded-full bg-white/10">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_25px_rgba(0,180,255,1)]" />
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-3xl font-semibold tracking-[0.12em]">
                <span className="text-cyan-300">Process.</span>
                <span className="text-blue-400">Precision.</span>
                <span className="text-orange-400">Wizardry.</span>
              </div>

              <p className="mt-7 max-w-xl text-lg leading-8 text-white/72">
                An ecosystem centered on disciplined execution, transparent
                learning, and collective accountability shaping long-term market
                mastery.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <img
                src="/logo.png"
                alt="EXCELLION TTC"
                className="h-28 w-auto object-contain"
              />
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                EXCELLION
              </h1>
              <p className="mt-2 text-sm text-white/50">
                Forging Market Wizards Through Discipline.
              </p>
            </div>

            <div className="rounded-3xl border border-cyan-400/15 bg-white/[0.04] p-6 shadow-2xl backdrop-blur md:p-8">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  {isSignup ? "Create your account" : "Welcome back"}
                </h2>
                <p className="mt-2 text-sm text-white/50">
                  {isSignup
                    ? "Start your disciplined trading journal."
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
                      ? "bg-cyan-500 text-white"
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
                      ? "bg-cyan-500 text-white"
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
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/50"
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
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/50"
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
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-white shadow-[0_0_28px_rgba(0,180,255,0.35)] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Please wait..."
                    : isSignup
                      ? "Create account"
                      : "Sign in"}
                  {!loading ? <ArrowRight className="h-4 w-4" /> : null}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-xs text-white/40">
              By continuing, you agree to use EXCELLION responsibly for your
              personal trading review.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
