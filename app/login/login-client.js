"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
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

    const cleanEmail = email.trim();

    if (isSignup && !acceptedTerms) {
      setMsgType("error");
      setMsg("Please accept the Terms and Privacy Policy.");
      return;
    }

    setLoading(true);

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

        if (error) throw error;

        if (data?.user?.identities?.length === 0) {
          setMsgType("error");
          setMsg("An account with this email already exists.");
          return;
        }

        setMsgType("success");
        setMsg("Account created successfully. You can now sign in.");
        setMode("signin");
        setPassword("");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
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
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setMsgType("error");
      setMsg("Enter your email first, then click Forgot password.");
      return;
    }

    setLoading(true);
    setMsg("");

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setMsgType("error");
      setMsg(error.message);
      return;
    }

    setMsgType("success");
    setMsg("Password reset link sent. Please check your email.");
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eef7ff] text-slate-900">
      <div
        className="absolute inset-0 bg-cover bg-right"
        style={{ backgroundImage: "url('/login-bg.jpeg')" }}
      />

      <div className="absolute inset-0 bg-white/35" />
      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-white via-white/80 to-transparent" />

      <div className="relative z-10 flex min-h-screen flex-col px-6 py-7 md:px-14">
        <header className="flex items-center">
          <img
            src="/logo.png"
            alt="EXCELLION TTC"
            className="h-20 w-auto object-contain md:h-24"
          />
        </header>

        <div className="grid flex-1 items-center gap-10 lg:grid-cols-2">
          <section className="hidden lg:block" />

          <section className="flex items-center justify-center lg:justify-end lg:pr-20">
            <div className="w-full max-w-[530px] rounded-[28px] border border-white/60 bg-white/35 p-7 shadow-[0_24px_80px_rgba(21,54,91,0.22)] backdrop-blur-2xl md:p-10">
              <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                  {isSignup ? (
                    <>
                      Create <span className="text-blue-600">Account</span>
                    </>
                  ) : (
                    <>
                      Welcome <span className="text-blue-600">Back</span>
                    </>
                  )}
                </h1>

                <p className="mt-4 text-base font-medium text-slate-500">
                  {isSignup
                    ? "Create your EXCELLION account and start journaling."
                    : "Log in to continue your journey with EXCELLION."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-9 space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700">
                    Email or Username
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="h-16 w-full rounded-xl border border-white/60 bg-white/45 px-14 text-base text-slate-900 outline-none placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition focus:border-blue-400 focus:bg-white/60 focus:ring-4 focus:ring-blue-100/70"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700">
                    Password
                  </label>

                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-16 w-full rounded-xl border border-white/60 bg-white/45 px-14 pr-14 text-base text-slate-900 outline-none placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition focus:border-blue-400 focus:bg-white/60 focus:ring-4 focus:ring-blue-100/70"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
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
                    <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-500">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 accent-blue-600"
                      />

                      <span>
                        I agree to the{" "}
                        <a href="/terms" className="text-blue-600">
                          Terms
                        </a>{" "}
                        and{" "}
                        <a href="/privacy" className="text-blue-600">
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
                      className="shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Forgot password?
                    </button>
                  ) : null}
                </div>

                {msg ? (
                  <div
                    className={`rounded-xl border px-4 py-3 text-sm ${
                      msgType === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {msg}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading || (isSignup && !acceptedTerms)}
                  className="group relative flex h-16 w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-blue-700 text-lg font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.35)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
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

              {!isSignup ? (
                <>
                  <div className="my-8 flex items-center gap-5">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-sm font-semibold text-slate-400">
                      OR
                    </span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                </>
              ) : null}

              <p className="mt-8 text-center text-sm font-medium text-slate-500">
                {isSignup
                  ? "Already have an account?"
                  : "Don’t have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(isSignup ? "signin" : "signup");
                    setMsg("");
                  }}
                  className="font-bold text-blue-600 hover:text-blue-700"
                >
                  {isSignup ? "Sign in" : "Create Account"}
                </button>
              </p>
            </div>
          </section>
        </div>
      </div>

      <div className="absolute bottom-20 left-10 z-20 hidden lg:block md:left-16">
        <div className="flex flex-wrap gap-5 text-[22px] font-bold">
          <span className="text-slate-700">Process.</span>
          <span className="text-blue-600">Precision.</span>
          <span className="text-cyan-500">Wizardry.</span>
        </div>

        <p className="mt-4 text-xl font-medium text-slate-500">
          Discipline today, freedom tomorrow.
        </p>
      </div>

      <div className="absolute bottom-10 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-8 text-sm font-medium text-slate-400 lg:flex">
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-500" />
          Secure
        </span>
        <span className="h-5 w-px bg-slate-300" />
        <span className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-blue-500" />
          Encrypted
        </span>
        <span className="h-5 w-px bg-slate-300" />
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-500" />
          Protected
        </span>
      </div>
    </main>
  );
}
