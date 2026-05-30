"use client";

import { useActionState } from "react";
import { ArrowRight, Instagram, User, Globe2, Trophy } from "lucide-react";

export default function SettingsForm({ initialProfile, action }) {
  const [state, formAction, pending] = useActionState(action, {
    profile: initialProfile,
    message: "",
  });

  const p = state.profile || {};

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-[28px] border border-white/70 bg-white/70 p-6 shadow-[0_24px_80px_rgba(21,54,91,0.14)] backdrop-blur-2xl md:p-9">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Complete <span className="text-blue-600">Profile</span>
          </h1>

          <p className="mt-3 text-sm font-medium text-slate-500">
            Set up your EXCELLION profile before continuing.
          </p>

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
            <p className="text-sm font-medium text-amber-800">
              Complete your profile to continue.
            </p>

            <p className="mt-1 text-xs text-amber-700">
              You will not be able to access the dashboard, journals,
              strategies, or any other section of EXCELLION until all required
              profile information is completed.
            </p>

            <p className="mt-3 text-xs text-amber-700">
              <span className="font-bold text-red-500">*</span> Required fields
            </p>
          </div>

          {p.username ? (
            <p className="mt-4 text-sm text-slate-500">
              Username:{" "}
              <span className="font-semibold text-slate-800">{p.username}</span>
            </p>
          ) : null}
        </div>

        <form action={formAction} className="mt-8 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Full Name <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <User className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                name="full_name"
                defaultValue={p.full_name || ""}
                placeholder="Enter your full name"
                className="h-14 w-full rounded-xl border border-slate-200 bg-white px-14 text-base text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Country <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <Globe2 className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                name="country"
                defaultValue={p.country || ""}
                placeholder="Enter your country"
                className="h-14 w-full rounded-xl border border-slate-200 bg-white px-14 text-base text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Experience Level <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <Trophy className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <select
                name="experience_level"
                defaultValue={p.experience_level || ""}
                className="h-14 w-full appearance-none rounded-xl border border-slate-200 bg-white px-14 text-base text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70"
                required
              >
                <option value="" disabled>
                  Select level
                </option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Instagram Handle{" "}
              <span className="font-medium text-slate-400">(optional)</span>
            </label>

            <div className="relative">
              <Instagram className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                name="instagram_handle"
                defaultValue={p.instagram_handle || ""}
                placeholder="@yourhandle"
                className="h-14 w-full rounded-xl border border-slate-200 bg-white px-14 text-base text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70"
              />
            </div>
          </div>

          {state.message ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
              {state.message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="group relative flex h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-blue-700 text-base font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.28)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{pending ? "Saving..." : "Save Profile"}</span>

            {!pending ? (
              <ArrowRight className="absolute right-6 h-5 w-5 transition group-hover:translate-x-1" />
            ) : null}
          </button>
        </form>
      </div>
    </div>
  );
}
