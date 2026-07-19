"use client";

import { BadgeCheck } from "lucide-react";
import { Pill, StepHeader } from "./form-ui";

export default function StrategyBlueprint({ strategy }) {
  if (!strategy) return null;

  const type = String(strategy.strategy_type || "").toLowerCase();
  const typeClasses =
    type === "conservative"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : type === "aggressive"
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm">
      <StepHeader
        icon={BadgeCheck}
        eyebrow="Selected Playbook"
        title={strategy.strategy_name || "Strategy Blueprint"}
        description="This playbook will be snapshotted into the opportunity."
      />
      <div className="mt-5 flex flex-wrap gap-2">
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${typeClasses}`}>
          {strategy.strategy_type || "—"}
        </span>
        <Pill>{strategy.trading_style || "—"}</Pill>
        <Pill>{strategy.setup_type || "—"}</Pill>
      </div>
      {strategy.bias_confluence?.length ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {strategy.bias_confluence.map((item) => (
            <div
              key={item}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">✓</div>
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
