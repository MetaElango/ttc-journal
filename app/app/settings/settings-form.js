"use client";

import { useActionState } from "react";

export default function SettingsForm({ initialProfile, action }) {
  const [state, formAction, pending] = useActionState(action, {
    profile: initialProfile,
    message: "",
  });

  const p = state.profile || {};

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Complete your profile</h1>
      {p.username ? (
        <p className="text-sm text-muted-foreground">
          Username: <span className="font-medium">{p.username}</span>
        </p>
      ) : null}

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm">Full Name</label>
          <input
            name="full_name"
            defaultValue={p.full_name || ""}
            className="w-full rounded-md border px-3 py-2"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm">Country</label>
          <input
            name="country"
            defaultValue={p.country || ""}
            className="w-full rounded-md border px-3 py-2"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm">Experience Level</label>
          <select
            name="experience_level"
            defaultValue={p.experience_level || ""}
            className="w-full rounded-md border px-3 py-2"
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

        <div className="space-y-2">
          <label className="text-sm">Instagram Handle (optional)</label>
          <input
            name="instagram_handle"
            defaultValue={p.instagram_handle || ""}
            placeholder="@yourhandle"
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md border px-4 py-2"
        >
          {pending ? "Saving..." : "Save"}
        </button>

        {state.message ? (
          <p className="text-sm opacity-80">{state.message}</p>
        ) : null}
      </form>
    </div>
  );
}
