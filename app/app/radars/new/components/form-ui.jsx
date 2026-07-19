"use client";

import { Label } from "@/components/ui/label";

export function FieldShell({ label, required, hint, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <Label className="text-sm font-semibold text-slate-950">
          {label} {required ? <span className="text-red-500">*</span> : null}
        </Label>
        {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function NativeSelect({ children, className = "", ...props }) {
  return (
    <select
      {...props}
      className={`h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </select>
  );
}

export function StepHeader({ icon: Icon, eyebrow, title, description }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-sky-600">{eyebrow}</div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}
