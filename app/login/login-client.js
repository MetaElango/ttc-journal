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

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        setMsg("Account created. You can now sign in.");
        setMode("signin");
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
      setMsg(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">
        {mode === "signin" ? "Sign in" : "Create account"}
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
        <input
          className="h-11 rounded-md border px-3"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
        />

        <input
          className="h-11 rounded-md border px-3"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          minLength={6}
        />

        <button
          className="h-11 rounded-md border px-3"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Please wait..."
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>

        {msg ? <p className="text-sm opacity-80">{msg}</p> : null}
      </form>

      <div className="mt-6 text-sm">
        {mode === "signin" ? (
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => setMode("signup")}
          >
            Don’t have an account? Create one
          </button>
        ) : (
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => setMode("signin")}
          >
            Already have an account? Sign in
          </button>
        )}
      </div>
    </main>
  );
}
