"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginClient() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";

  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");

  const isSignup = mode === "signup";

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (!acceptedTerms) {
      setMsgType("error");
      setMsg("Please accept the Terms and Privacy Policy.");
      return;
    }

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
      setMsg(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setMsgType("error");
      setMsg("Enter your email first, then click Forgot password.");
      return;
    }

    setLoading(true);
    setMsg("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setMsgType("error");
      setMsg(error.message);
      return;
    }

    setMsgType("success");
    setMsg("Password reset link sent to your email.");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#02040b] text-white">
      <div
        className="absolute inset-0 bg-cover"
        style={{ backgroundImage: "url('/login-bg.png')" }}
      />

      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_46%,rgba(0,140,255,0.16),transparent_32%)]" />

      <div className="relative z-10 flex min-h-screen flex-col px-8 py-8 md:px-14">
        <header className="flex items-center">
          <img
            src="/logo.png"
            alt="EXCELLION TTC"
            className="h-56 w-auto object-contain md:h-56"
          />
        </header>

        <div className="grid flex-1 items-center gap-10 lg:grid-cols-2">
          <section className="relative hidden lg:flex">
            <div className="absolute bottom-10 left-0">
              <div className="flex flex-wrap gap-5 text-[34px] font-semibold tracking-[0.08em]">
                <span className="text-cyan-300">Process.</span>
                <span className="text-blue-400">Precision.</span>
                <span className="text-orange-400">Wizardry.</span>
              </div>

              <p className="mt-5 text-[32px] font-light text-white/90">
                Discipline today, freedom tomorrow.
              </p>
            </div>
          </section>
          <section className="flex items-center justify-center lg:justify-end">
            {" "}
            <div className="w-full max-w-xl rounded-3xl border border-cyan-400/45 bg-black/45 p-6 shadow-[0_0_65px_rgba(0,140,255,0.24)] backdrop-blur-xl md:p-10">
              <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight">
                  {isSignup ? (
                    <>
                      Create <span className="text-cyan-400">Account</span>
                    </>
                  ) : (
                    <>
                      Welcome <span className="text-cyan-400">Back</span>
                    </>
                  )}
                </h1>

                <p className="mt-3 text-base text-white/60">
                  {isSignup
                    ? "Create your EXCELLION account and start journaling."
                    : "Log in to continue your journey with EXCELLION."}
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 rounded-2xl border border-cyan-400/20 bg-black/30 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setMsg("");
                  }}
                  className={`rounded-xl px-3 py-3 text-sm font-medium transition ${
                    !isSignup
                      ? "bg-cyan-500 text-white shadow-[0_0_22px_rgba(0,180,255,0.45)]"
                      : "text-white/55 hover:text-white"
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
                  className={`rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isSignup
                      ? "bg-cyan-500 text-white shadow-[0_0_22px_rgba(0,180,255,0.45)]"
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  Sign up
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm text-white/80">Email</label>

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="h-14 w-full rounded-2xl border border-blue-500/35 bg-black/35 px-12 text-base text-white outline-none placeholder:text-white/35 transition focus:border-cyan-400 focus:shadow-[0_0_24px_rgba(0,180,255,0.22)]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-white/80">Password</label>

                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45" />

                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-14 w-full rounded-2xl border border-blue-500/35 bg-black/35 px-12 pr-14 text-base text-white outline-none placeholder:text-white/35 transition focus:border-cyan-400 focus:shadow-[0_0_24px_rgba(0,180,255,0.22)]"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/55 hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4">
                  {isSignup ? (
                    <label className="flex cursor-pointer items-start gap-3 text-sm text-white/60">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-white/20 bg-black accent-cyan-500"
                      />

                      <span>
                        I agree to the{" "}
                        <a
                          href="/terms"
                          className="text-cyan-400 hover:text-cyan-300"
                        >
                          Terms
                        </a>{" "}
                        and{" "}
                        <a
                          href="/privacy"
                          className="text-cyan-400 hover:text-cyan-300"
                        >
                          Privacy Policy
                        </a>
                        .
                      </span>
                    </label>
                  ) : (
                    <div />
                  )}

                  {!isSignup ? (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="shrink-0 text-sm text-cyan-400 hover:text-cyan-300"
                    >
                      Forgot password?
                    </button>
                  ) : null}
                </div>

                {msg ? (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      msgType === "success"
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                        : "border-red-400/30 bg-red-400/10 text-red-200"
                    }`}
                  >
                    {msg}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading || (isSignup && !acceptedTerms)}
                  className="group relative flex h-16 w-full items-center justify-center rounded-2xl border border-cyan-400/70 bg-black/30 text-xl font-semibold text-white shadow-[0_0_30px_rgba(0,180,255,0.35)] transition hover:border-orange-300 hover:shadow-[0_0_35px_rgba(249,115,22,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>
                    {loading
                      ? "Please wait..."
                      : isSignup
                        ? "Create Account"
                        : "Log In"}
                  </span>

                  {!loading ? (
                    <ArrowRight className="absolute right-6 h-6 w-6 transition group-hover:translate-x-1" />
                  ) : null}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-white/55">
                {isSignup
                  ? "Already have an account?"
                  : "Don’t have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(isSignup ? "signin" : "signup");
                    setMsg("");
                  }}
                  className="font-medium text-cyan-400 hover:text-cyan-300"
                >
                  {isSignup ? "Sign in" : "Create Account"}
                </button>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
