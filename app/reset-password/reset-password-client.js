// app/reset-password/reset-password-client.js

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordClient() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (password.length < 6) {
      setMsgType("error");
      setMsg("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMsgType("error");
      setMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setMsgType("error");
      setMsg(error.message);
      return;
    }

    setMsgType("success");
    setMsg("Password updated successfully.");

    setTimeout(() => {
      router.replace("/login");
    }, 1200);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#02040b] text-white">
      <div
        className="absolute inset-0 bg-cover"
        style={{ backgroundImage: "url('/login-bg.png')" }}
      />

      <div className="absolute inset-0 bg-black/45" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-lg rounded-3xl border border-cyan-400/45 bg-black/50 p-8 shadow-[0_0_65px_rgba(0,140,255,0.24)] backdrop-blur-xl">
          <img
            src="/logo.PNG"
            alt="EXCELLION TTC"
            className="mx-auto mb-8 h-20 w-auto object-contain"
          />

          <div className="text-center">
            <h1 className="text-3xl font-bold">
              Reset <span className="text-cyan-400">Password</span>
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Enter your new password to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <PasswordInput
              label="New Password"
              value={password}
              setValue={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
            />

            <PasswordInput
              label="Confirm Password"
              value={confirmPassword}
              setValue={setConfirmPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
            />

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
              disabled={loading}
              className="h-14 w-full rounded-2xl border border-cyan-400/70 bg-black/30 text-lg font-semibold text-white shadow-[0_0_30px_rgba(0,180,255,0.35)] hover:border-orange-300 disabled:opacity-60"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function PasswordInput({
  label,
  value,
  setValue,
  showPassword,
  setShowPassword,
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-white/80">{label}</label>

      <div className="relative">
        <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45" />

        <input
          type={showPassword ? "text" : "password"}
          required
          minLength={6}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter password"
          className="h-14 w-full rounded-2xl border border-blue-500/35 bg-black/35 px-12 pr-14 text-base text-white outline-none placeholder:text-white/35 focus:border-cyan-400"
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
  );
}
