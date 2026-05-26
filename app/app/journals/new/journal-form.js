// app/app/journals/new/journal-form.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BadgeCheck,
  CalendarClock,
  Camera,
  ChevronRight,
  FileText,
  ImagePlus,
  Loader2,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  X,
  BarChart3,
  GripVertical,
  Lightbulb,
  Plus,
  Scale,
  SlidersHorizontal,
  Trash2,
  CheckCircle2,
} from "lucide-react";

function normPurpose(v) {
  return String(v || "")
    .trim()
    .toUpperCase();
}

const TF = [
  "MN",
  "Week",
  "2D",
  "D",
  "H16",
  "H14",
  "H12",
  "H10",
  "H8",
  "H6",
  "H4",
  "H3",
  "H2",
  "H1",
  "30",
  "30M",
  "15M",
  "10M",
  "5M",
  "1M",
];

const ACTIVE_STATUSES = ["ENTRY PLACED", "ENTRY TRIGGERED"];

function needsEndDate(status) {
  const value = String(status || "")
    .trim()
    .toUpperCase();
  return value && !ACTIVE_STATUSES.includes(value);
}

function nowLocalDateTimeValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function toDatetimeLocal(value) {
  if (!value) return nowLocalDateTimeValue();

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return nowLocalDateTimeValue();

  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

const PURPOSE_CONFIG = {
  "TRADE OBSERVATION": {
    showStatusDropdown: true,
    disable: { tradingAccount: true, risk: true },
    required: {
      tradingAccount: false,
      symbol: true,
      quantity: true,
      direction: true,
      entry_price: true,
      stop_loss: true,
      take_profit: true,
      entry_reason: true,
      exit_reason: true,
      exit_price: false,
      risk_mode: false,
      risk_per_trade: false,
      status: false,
    },
    exitRule: "reason_required_price_optional",
  },
  "TRADE EXECUTION": {
    showStatusDropdown: true,
    disable: { tradingAccount: false, risk: false },
    required: {
      tradingAccount: true,
      symbol: true,
      quantity: true,
      direction: true,
      entry_price: true,
      stop_loss: true,
      take_profit: true,
      entry_reason: true,
      exit_reason: false,
      exit_price: false,
      risk_mode: true,
      risk_per_trade: true,
      status: true,
    },
    exitRule: "pair_or_empty",
  },
  "FORWARD TESTING": {
    showStatusDropdown: true,
    disable: { tradingAccount: false, risk: false },
    required: {
      tradingAccount: true,
      symbol: true,
      quantity: true,
      direction: true,
      entry_price: true,
      stop_loss: true,
      take_profit: true,
      entry_reason: true,
      exit_reason: false,
      exit_price: false,
      risk_mode: true,
      risk_per_trade: true,
      status: true,
    },
    exitRule: "pair_or_empty",
  },
};

const PURPOSES = ["TRADE OBSERVATION", "TRADE EXECUTION", "FORWARD TESTING"];

const STATUS_OPTIONS_BY_PURPOSE = {
  "TRADE OBSERVATION": ["ENTRY MISSED", "ENTRY CLOSED"],
  "TRADE EXECUTION": [
    "ENTRY PLANNED",
    "ENTRY PLACED",
    "ENTRY TRIGGERED",
    "ENTRY CANCELLED",
    "ENTRY MISSED",
    "TRADE SL HIT",
    "TRADE CLOSE WITH PROFIT",
    "TRADE EXIT IN MID",
  ],
  "FORWARD TESTING": [
    "ENTRY PLANNED",
    "ENTRY PLACED",
    "ENTRY TRIGGERED",
    "ENTRY CANCELLED",
    "ENTRY MISSED",
    "TRADE SL HIT",
    "TRADE CLOSE WITH PROFIT",
    "TRADE EXIT IN MID",
  ],
};

function getStatusOptions(purpose) {
  const key = normPurpose(purpose);
  return (
    STATUS_OPTIONS_BY_PURPOSE[key] ||
    STATUS_OPTIONS_BY_PURPOSE["TRADE OBSERVATION"]
  );
}

function FieldShell({ label, required, hint, children }) {
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

function NativeSelect({ children, ...props }) {
  return (
    <select
      {...props}
      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </select>
  );
}

function StepHeader({ icon: Icon, eyebrow, title, description }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
        <Icon className="h-5 w-5" />
      </div>

      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-sky-600">
          {eyebrow}
        </div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}

function StrategyBlueprint({ s }) {
  if (!s) return null;

  const strategyType = String(s.strategy_type || "").toLowerCase();

  const strategyTypeClasses =
    strategyType === "conservative"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : strategyType === "aggressive"
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm">
      <StepHeader
        icon={BadgeCheck}
        eyebrow="Selected Playbook"
        title={s.strategy_name || "Strategy Blueprint"}
        description="This playbook will be snapshotted into the opportunity."
      />

      <div className="mt-5 flex flex-wrap gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${strategyTypeClasses}`}
        >
          {s.strategy_type || "—"}
        </span>

        <Pill>{s.trading_style || "—"}</Pill>

        <Pill>{s.setup_type || "—"}</Pill>
      </div>

      {s.bias_confluence?.length ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {s.bias_confluence.map((b) => (
            <div
              key={b}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                ✓
              </div>

              <span>{b}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PreviewBox({ title, children }) {
  return (
    <div className="rounded-2xl border bg-background/60 p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
        {children || "—"}
      </div>
    </div>
  );
}

function round2(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return 0;
  return Math.round(v * 100) / 100;
}

function sanitize2dp(raw) {
  const s = String(raw ?? "");
  let out = s.replace(/[^\d.]/g, "");

  const firstDot = out.indexOf(".");
  if (firstDot !== -1) {
    out =
      out.slice(0, firstDot + 1) + out.slice(firstDot + 1).replace(/\./g, "");
  }

  if (firstDot !== -1) {
    const [a, b] = out.split(".");
    out = a + "." + (b || "").slice(0, 2);
  }

  return out;
}

function sanitize6dp(raw) {
  const s = String(raw ?? "");
  let out = s.replace(/[^\d.]/g, "");

  const firstDot = out.indexOf(".");

  if (firstDot !== -1) {
    out =
      out.slice(0, firstDot + 1) + out.slice(firstDot + 1).replace(/\./g, "");
  }

  if (firstDot !== -1) {
    const [a, b] = out.split(".");
    out = a + "." + (b || "").slice(0, 6);
  }

  return out;
}

function defaultSplitWeights(n) {
  if (n <= 0) return [];
  if (n === 1) return [1];

  const w = [];
  let remaining = 1;

  for (let i = 0; i < n; i++) {
    if (i === n - 1) {
      w.push(remaining);
      break;
    }

    const next = i === 0 ? 0.5 : w[i - 1] / 2;
    w.push(next);
    remaining -= next;
  }

  const sum = w.reduce((a, b) => a + b, 0);
  if (Math.abs(1 - sum) > 1e-10) w[w.length - 1] += 1 - sum;

  return w;
}

function TakeProfitEditor({ items, setItems, totalLots, disabled }) {
  const total = round2(totalLots);
  const totalOk = total > 0 ? total : 0;

  const sumTpLots = useMemo(
    () => items.reduce((acc, it) => acc + (Number(it.qty) || 0), 0),
    [items],
  );

  const sumOk = totalOk > 0 ? Math.abs(sumTpLots - totalOk) <= 0.01 : false;

  function applySplit(next) {
    if (!totalOk || next.length === 0) return next;

    const weights = defaultSplitWeights(next.length);

    const applied = next.map((it, idx) => ({
      ...it,
      qty: round2(weights[idx] * totalOk),
    }));

    const s = applied.reduce((a, b) => a + (Number(b.qty) || 0), 0);
    const diff = round2(totalOk - s);

    if (applied.length > 0 && diff !== 0) {
      applied[applied.length - 1] = {
        ...applied[applied.length - 1],
        qty: round2((Number(applied[applied.length - 1].qty) || 0) + diff),
      };
    }

    return applied;
  }

  function autoSplitAll() {
    if (disabled) return;
    setItems(applySplit(items));
  }

  function addRow() {
    if (disabled) return;
    setItems(applySplit([...items, { price: "", qty: "" }]));
  }

  function removeRow(i) {
    if (disabled) return;
    setItems(applySplit(items.filter((_, idx) => idx !== i)));
  }

  function updatePrice(i, raw) {
    if (disabled) return;

    const next = [...items];
    next[i] = { ...next[i], price: sanitize6dp(raw) };
    setItems(next);
  }

  function updateQty(i, raw) {
    if (disabled) return;

    const vStr = sanitize2dp(raw);
    const v = vStr === "" ? "" : round2(vStr);

    const next = [...items];
    next[i] = { ...next[i], qty: vStr === "" ? "" : v };

    if (!totalOk) {
      setItems(next);
      return;
    }

    const lastIndex = next.length - 1;

    if (i === lastIndex) {
      setItems(next);
      return;
    }

    let fixedSum = 0;
    for (let k = 0; k <= i; k++) fixedSum += Number(next[k].qty) || 0;
    fixedSum = round2(fixedSum);

    let remaining = round2(totalOk - fixedSum);
    if (remaining < 0) remaining = 0;

    const tailCount = lastIndex - i;
    const weights = defaultSplitWeights(tailCount);

    for (let t = 0; t < tailCount; t++) {
      const idx = i + 1 + t;
      next[idx] = { ...next[idx], qty: round2(weights[t] * remaining) };
    }

    const sumNow = round2(
      next.reduce((acc, it) => acc + (Number(it.qty) || 0), 0),
    );

    const diff = round2(totalOk - sumNow);

    if (diff !== 0 && next.length > 0) {
      next[lastIndex] = {
        ...next[lastIndex],
        qty: round2((Number(next[lastIndex].qty) || 0) + diff),
      };
    }

    setItems(next);
  }

  return (
    <section className="rounded-3xl border bg-card p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-primary/10 text-primary">
            <Target className="h-5 w-5" />
          </div>

          <div>
            <Label className="text-lg font-semibold tracking-tight">
              Take Profit <span className="text-destructive">*</span>
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Add one or more targets. Qty sum must equal total lots.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={autoSplitAll}
            disabled={disabled || items.length === 0 || !totalOk}
            className="h-11 rounded-2xl"
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Auto Split
          </Button>

          <Button
            type="button"
            onClick={addRow}
            disabled={disabled}
            className="h-11 rounded-2xl"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add TP
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">No take-profit targets yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Click Add TP to create your first target.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {items.map((it, idx) => {
            const tpLots = Number(it.qty) || 0;
            const pct = totalOk ? Math.min((tpLots / totalOk) * 100, 100) : 0;

            return (
              <div
                key={idx}
                className="rounded-2xl border bg-background/40 p-4"
              >
                <div className="grid gap-4 md:grid-cols-[90px_1fr_1fr_120px_70px] md:items-end">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {idx + 1}
                    </div>

                    <div className="font-semibold text-sm">TP {idx + 1}</div>
                  </div>

                  <FieldShell label="Price" required>
                    <Input
                      value={it.price}
                      onChange={(e) => updatePrice(idx, e.target.value)}
                      inputMode="decimal"
                      placeholder="e.g. 1.123456"
                      disabled={disabled}
                      required
                      className="h-11 rounded-xl"
                    />
                  </FieldShell>

                  <FieldShell label="Qty / Lots" required>
                    <Input
                      value={it.qty}
                      onChange={(e) => updateQty(idx, e.target.value)}
                      inputMode="decimal"
                      placeholder="0.50"
                      disabled={disabled}
                      required
                      className="h-11 rounded-xl"
                    />
                  </FieldShell>

                  <div className="rounded-xl border bg-muted/30 px-3 py-2 text-center">
                    <div className="text-base font-semibold">
                      {round2(pct)}%
                    </div>

                    <div className="text-[11px] text-muted-foreground">
                      Position
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(idx)}
                    disabled={disabled}
                    className="h-11 w-11 rounded-xl text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div
          className={[
            "inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm",
            sumOk
              ? "bg-primary/5 text-foreground"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          ].join(" ")}
        >
          <Scale className="h-4 w-4" />
          <span>
            TP Qty sum: <strong>{round2(sumTpLots)}</strong> / Total lots:{" "}
            <strong>{totalOk ? round2(totalOk) : "—"}</strong>
          </span>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Lightbulb className="h-4 w-4 text-primary" />
          Tip: edit any TP qty except last to auto-split the remainder.
        </div>
      </div>
    </section>
  );
}

function ExistingImageGrid({ title, images, onRemove }) {
  if (!images?.length) return null;

  return (
    <div className="space-y-3">
      <Label>{title}</Label>

      <div className="grid gap-3 sm:grid-cols-3">
        {images.map((img) => (
          <div
            key={img.path}
            className="group relative overflow-hidden rounded-2xl border bg-muted"
          >
            {img.url ? (
              <img
                src={img.url}
                alt={title}
                className="h-40 w-full object-cover transition group-hover:scale-105"
              />
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                Image URL missing
              </div>
            )}

            <button
              type="button"
              onClick={() => onRemove(img.path)}
              className="absolute right-2 top-2 rounded-full bg-black/75 p-1.5 text-white hover:bg-black"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewImageUploader({
  title,
  files,
  setFiles,
  existingCount,
  max,
  error,
  setError,
}) {
  const previews = useMemo(() => {
    return files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
  }, [files]);

  useEffect(() => {
    return () => {
      previews.forEach((img) => URL.revokeObjectURL(img.url));
    };
  }, [previews]);

  return (
    <div className="space-y-3">
      <div>
        <Label>{title}</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          {existingCount} existing, {files.length} selected. Max {max} total.
        </p>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed bg-muted/30 p-6 text-center transition hover:bg-muted/50">
        <Upload className="h-7 w-7 text-muted-foreground" />
        <div className="mt-3 text-sm font-medium">Upload images</div>
        <div className="mt-1 text-xs text-muted-foreground">
          PNG, JPG or WebP
        </div>

        <input
          className="hidden"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            const selected = Array.from(e.target.files || []);
            const totalCount = selected.length + existingCount;

            if (totalCount > max) {
              setError(`${title} can be maximum ${max} images total.`);
              e.target.value = "";
              setFiles([]);
              return;
            }

            setError("");
            setFiles(selected);
          }}
        />
      </label>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {previews.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {previews.map((img, index) => (
            <div
              key={`${img.file.name}-${index}`}
              className="group relative overflow-hidden rounded-2xl border bg-muted"
            >
              <img
                src={img.url}
                alt={`${title} ${index + 1}`}
                className="h-40 w-full object-cover transition group-hover:scale-105"
              />

              <button
                type="button"
                onClick={() => {
                  setFiles((prev) => prev.filter((_, i) => i !== index));
                }}
                className="absolute right-2 top-2 rounded-full bg-black/75 p-1.5 text-white hover:bg-black"
                aria-label="Remove selected image"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="absolute bottom-2 left-2 max-w-[85%] rounded-full bg-black/70 px-2 py-1 text-xs text-white">
                {img.file.name}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
function TimeframePreview({ title, values = [] }) {
  const items = Array.isArray(values) ? values : [];

  return (
    <div className="rounded-2xl border bg-background/60 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>

      {items.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-full border bg-card px-3 py-1 text-xs font-medium"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-destructive">No {title} found.</p>
      )}
    </div>
  );
}
function TimeframeSelector({ title, values = [], selected, setSelected }) {
  const items = Array.isArray(values) ? values : [];

  function toggle(item) {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );
  }

  return (
    <div className="rounded-2xl border bg-background/60 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title} <span className="text-destructive">*</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => {
          const active = selected.includes(item);

          return (
            <button
              key={item}
              type="button"
              onClick={() => toggle(item)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-accent"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      {selected.length === 0 ? (
        <p className="mt-3 text-xs text-destructive">
          Select at least one {title}.
        </p>
      ) : null}
    </div>
  );
}
function JournalDetailsCommon({
  cfg,
  purpose,
  setPurpose,
  status,
  setStatus,
  accounts,
  symbols,
  tpItems,
  setTpItems,
  direction,
  setDirection,
  quantity,
  setQuantity,
  riskMode,
  setRiskMode,
  strategy,
  entryPrice,
  setEntryPrice,
  stopLoss,
  setStopLoss,
  setupImages,
  setSetupImages,
  referenceImages,
  setReferenceImages,
  setupImageError,
  setSetupImageError,
  referenceImageError,
  setReferenceImageError,
  prefillJournal,
  existingSetupImages,
  setExistingSetupImages,
  existingReferenceImages,
  setExistingReferenceImages,
  journalStartAt,
  setJournalStartAt,
  journalEndAt,
  setJournalEndAt,
  selectedHtf,
  setSelectedHtf,
  selectedEntryTf,
  setSelectedEntryTf,
}) {
  const disableTradingAccount = !!cfg.disable?.tradingAccount;
  const disableRisk = !!cfg.disable?.risk;
  const required = cfg.required || {};

  const [symbolQuery, setSymbolQuery] = useState("");

  const filteredSymbols = useMemo(() => {
    const q = symbolQuery.trim().toLowerCase();
    if (!q) return symbols;

    return symbols.filter(
      (s) =>
        s.symbol_name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  }, [symbols, symbolQuery]);

  const totalLotsNum = Number(quantity);
  const totalLotsOk =
    !Number.isNaN(totalLotsNum) && totalLotsNum > 0 ? round2(totalLotsNum) : 0;

  const sumTpLots = useMemo(
    () => tpItems.reduce((acc, it) => acc + (Number(it.qty) || 0), 0),
    [tpItems],
  );

  const sumOk =
    totalLotsOk > 0 ? Math.abs(round2(sumTpLots) - totalLotsOk) <= 0.01 : false;

  const entryNum = Number(entryPrice);
  const slNum = Number(stopLoss);

  let slDirectionError = "";

  if (entryPrice !== "" && stopLoss !== "") {
    if (direction === "BUY" && !(slNum < entryNum)) {
      slDirectionError = "For BUY, stop loss must be less than entry price.";
    }

    if (direction === "SELL" && !(slNum > entryNum)) {
      slDirectionError =
        "For SELL, stop loss must be greater than entry price.";
    }
  }

  const exitReasonRequired = !!required.exit_reason;
  const exitPriceRequired = !!required.exit_price;
  const statusOptions = getStatusOptions(purpose);
  const statusRequired = !!required.status;

  function onPurposeChange(next) {
    const nextKey = normPurpose(next);
    setPurpose(nextKey);

    if (!getStatusOptions(nextKey).includes(status)) {
      setStatus("");
    }
  }

  return (
    <>
      <input
        type="hidden"
        name="take_profit_json"
        value={JSON.stringify(tpItems)}
      />

      <input
        type="hidden"
        name="existing_setup_images"
        value={JSON.stringify((existingSetupImages || []).map((x) => x.path))}
      />

      <input
        type="hidden"
        name="existing_reference_images"
        value={JSON.stringify(
          (existingReferenceImages || []).map((x) => x.path),
        )}
      />
      <input
        type="hidden"
        name="htf_json"
        value={JSON.stringify(selectedHtf)}
      />

      <input
        type="hidden"
        name="entry_tf_json"
        value={JSON.stringify(selectedEntryTf)}
      />

      <section
        id="setup"
        className="scroll-mt-24 rounded-3xl border bg-card p-5 shadow-sm md:p-6"
      >
        <StepHeader
          icon={Target}
          eyebrow="Step 1"
          title="Opportunity Setup"
          description="Choose purpose, account, symbol, status and timing."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <FieldShell label="Purpose" required>
            <NativeSelect
              name="purpose"
              value={normPurpose(purpose)}
              onChange={(e) => onPurposeChange(e.target.value)}
              required
            >
              {PURPOSES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </NativeSelect>
          </FieldShell>
          <FieldShell
            label="Trading Account"
            required={required.tradingAccount}
          >
            <NativeSelect
              name="trading_account_id"
              required={!!required.tradingAccount}
              defaultValue={prefillJournal?.trading_account_id || ""}
              disabled={disableTradingAccount}
            >
              <option value="" disabled>
                Select account
              </option>

              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name} — {a.framework} — {a.account_size}
                </option>
              ))}
            </NativeSelect>

            {disableTradingAccount ? (
              <p className="text-xs text-muted-foreground">
                Disabled for {purpose}.
              </p>
            ) : null}
          </FieldShell>
          <div className="md:col-span-2">
            <FieldShell label="Symbol" required={required.symbol}>
              <Input
                value={symbolQuery}
                onChange={(e) => setSymbolQuery(e.target.value)}
                placeholder="Search symbol e.g. GOLD, EURUSD, Indices"
                className="mb-2 h-11 rounded-xl"
              />

              <NativeSelect
                name="symbol_id"
                required={!!required.symbol}
                defaultValue={prefillJournal?.symbol_id || ""}
              >
                <option value="" disabled>
                  Select symbol
                </option>

                {filteredSymbols.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.symbol_name} — {s.category}
                  </option>
                ))}
              </NativeSelect>
            </FieldShell>
          </div>

          <FieldShell label="Status" required={statusRequired}>
            <NativeSelect
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required={statusRequired}
            >
              <option value="">
                {statusRequired ? "Select status" : "No status"}
              </option>

              {statusOptions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </NativeSelect>
          </FieldShell>

          <FieldShell label="Create Date & Time" required>
            <Input
              name="journal_start_at"
              type="datetime-local"
              value={journalStartAt}
              onChange={(e) => setJournalStartAt(e.target.value)}
              required
              className="h-11 rounded-xl"
            />
          </FieldShell>

          {needsEndDate(status) ? (
            <FieldShell label="End Date & Time" required>
              <Input
                name="journal_end_at"
                type="datetime-local"
                value={journalEndAt}
                onChange={(e) => setJournalEndAt(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </FieldShell>
          ) : (
            <input type="hidden" name="journal_end_at" value="" />
          )}
        </div>
      </section>

      <section
        id="levels"
        className="scroll-mt-24 rounded-3xl border bg-card p-5 shadow-sm md:p-6"
      >
        <StepHeader
          icon={ChevronRight}
          eyebrow="Step 2"
          title="Trade Levels"
          description="Enter direction, quantity, entry, stop loss and targets."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <TimeframeSelector
            title="HTF"
            values={prefillJournal ? TF : strategy?.htf || []}
            selected={selectedHtf}
            setSelected={setSelectedHtf}
          />

          <TimeframeSelector
            title="Entry TF"
            values={prefillJournal ? TF : strategy?.entry_tf || []}
            selected={selectedEntryTf}
            setSelected={setSelectedEntryTf}
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <FieldShell label="Direction" required={required.direction}>
            <NativeSelect
              name="direction"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              required={!!required.direction}
            >
              <option value="BUY">Long</option>
              <option value="SELL">Short</option>
            </NativeSelect>
          </FieldShell>

          <FieldShell label="Quantity" required={required.quantity} hint="Lots">
            <Input
              name="quantity"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(sanitize2dp(e.target.value))}
              required={!!required.quantity}
              placeholder="1"
              className="h-11 rounded-xl"
            />
          </FieldShell>

          <FieldShell label="Entry Price" required={required.entry_price}>
            <Input
              name="entry_price"
              inputMode="decimal"
              value={entryPrice}
              required={!!required.entry_price}
              onChange={(e) => setEntryPrice(sanitize6dp(e.target.value))}
              className="h-11 rounded-xl"
            />
          </FieldShell>

          <FieldShell label="Stop Loss" required={required.stop_loss}>
            <Input
              name="stop_loss"
              inputMode="decimal"
              value={stopLoss}
              required={!!required.stop_loss}
              onChange={(e) => setStopLoss(sanitize6dp(e.target.value))}
              className="h-11 rounded-xl"
            />

            {slDirectionError ? (
              <p className="text-xs text-destructive">{slDirectionError}</p>
            ) : null}
          </FieldShell>
        </div>

        <div className="mt-6">
          <TakeProfitEditor
            items={tpItems}
            setItems={setTpItems}
            totalLots={quantity}
            disabled={false}
          />
        </div>

        {!sumOk && tpItems.length > 0 && totalLotsOk ? (
          <p className="mt-3 text-xs text-destructive">
            Fix TP quantities to match total lots.
          </p>
        ) : null}
      </section>

      <section
        id="reasoning"
        className="scroll-mt-24 rounded-3xl border bg-card p-5 shadow-sm md:p-6"
      >
        <StepHeader
          icon={FileText}
          eyebrow="Step 3"
          title="Reasoning"
          description="Capture why you entered and how/why the trade ended."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <FieldShell label="Entry Reason" required={required.entry_reason}>
            <Textarea
              name="entry_reason"
              rows={4}
              defaultValue={prefillJournal?.entry_reason || ""}
              required={!!required.entry_reason}
              className="rounded-xl"
            />
          </FieldShell>

          <FieldShell label="Exit Reason" required={exitReasonRequired}>
            <Textarea
              name="exit_reason"
              rows={4}
              defaultValue={prefillJournal?.exit_reason || ""}
              required={exitReasonRequired}
              className="rounded-xl"
            />
          </FieldShell>

          <FieldShell
            label="Exit Price"
            required={exitPriceRequired}
            hint={exitPriceRequired ? "" : "Optional"}
          >
            <Input
              name="exit_price"
              inputMode="decimal"
              defaultValue={prefillJournal?.exit_price ?? ""}
              required={exitPriceRequired}
              onChange={(e) => {
                e.target.value = sanitize2dp(e.target.value);
              }}
              className="h-11 rounded-xl"
            />
          </FieldShell>
        </div>
      </section>

      <section
        id="images"
        className="scroll-mt-24 rounded-3xl border bg-card p-5 shadow-sm md:p-6"
      >
        <StepHeader
          icon={Camera}
          eyebrow="Step 4"
          title="Images"
          description="Add setup screenshots and reference charts. You can remove copied images before saving."
        />

        <div className="mt-6 grid gap-6">
          <ExistingImageGrid
            title="Existing Setup Images"
            images={existingSetupImages}
            onRemove={(path) =>
              setExistingSetupImages((prev) =>
                prev.filter((x) => x.path !== path),
              )
            }
          />

          <ExistingImageGrid
            title="Existing Reference Images"
            images={existingReferenceImages}
            onRemove={(path) =>
              setExistingReferenceImages((prev) =>
                prev.filter((x) => x.path !== path),
              )
            }
          />

          <div className="grid gap-4 md:grid-cols-2">
            <NewImageUploader
              title="Add Setup Images"
              files={setupImages}
              setFiles={setSetupImages}
              existingCount={existingSetupImages?.length || 0}
              max={2}
              error={setupImageError}
              setError={setSetupImageError}
            />

            <NewImageUploader
              title="Add Reference Images"
              files={referenceImages}
              setFiles={setReferenceImages}
              existingCount={existingReferenceImages?.length || 0}
              max={5}
              error={referenceImageError}
              setError={setReferenceImageError}
            />
          </div>
        </div>
      </section>

      <section
        id="risk"
        className="scroll-mt-24 rounded-3xl border bg-card p-5 shadow-sm md:p-6"
      >
        <StepHeader
          icon={ShieldCheck}
          eyebrow="Step 5"
          title="Risk"
          description="Set risk mode and risk per trade."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <FieldShell label="Risk Mode" required={required.risk_mode}>
            <NativeSelect
              name="risk_mode"
              value={riskMode}
              onChange={(e) => setRiskMode(e.target.value)}
              required={!!required.risk_mode && !disableRisk}
              disabled={disableRisk}
            >
              <option value="PERCENT">Percentage</option>
              <option value="AMOUNT">$ Amount</option>
            </NativeSelect>

            {disableRisk ? (
              <input type="hidden" name="risk_mode" value={riskMode} />
            ) : null}
          </FieldShell>

          <FieldShell label="Risk Per Trade" required={required.risk_per_trade}>
            <Input
              name="risk_per_trade"
              inputMode="decimal"
              defaultValue={prefillJournal?.risk_per_trade ?? ""}
              required={!!required.risk_per_trade && !disableRisk}
              placeholder={riskMode === "PERCENT" ? "e.g. 1.5" : "e.g. 25"}
              disabled={disableRisk}
              onChange={(e) => {
                e.target.value = sanitize2dp(e.target.value);
              }}
              className="h-11 rounded-xl"
            />

            {disableRisk ? (
              <input
                type="hidden"
                name="risk_per_trade"
                value={strategy.risk_per_trade || 1}
              />
            ) : null}
          </FieldShell>

          <div className="rounded-2xl border bg-background/60 p-4 text-sm">
            <div className="mb-2 font-medium">Strategy Risk</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>Risk/Trade: {strategy.risk_per_trade}</div>
              <div>AVG R:R: {strategy.avg_planned_rr}</div>
              <div>Planned R/Year: {strategy.planned_r_year}</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function OpportunityStepper({ activeSection }) {
  const steps = [
    { id: "setup", label: "Setup", step: 1 },
    { id: "levels", label: "Trade Levels", step: 2 },
    { id: "reasoning", label: "Reasoning", step: 3 },
    { id: "images", label: "Images", step: 4 },
    { id: "risk", label: "Risk", step: 5 },
  ];

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <aside className="sticky top-24 hidden h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:block">
      <div className="space-y-7">
        {steps.map((item, index) => {
          const active = activeSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className="relative flex w-full items-center gap-3 text-left"
            >
              {index !== steps.length - 1 ? (
                <span className="absolute left-4 top-9 h-7 border-l border-dashed border-slate-300" />
              ) : null}

              <span
                className={`z-10 flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
                  active
                    ? "border-sky-500 bg-sky-500 text-white"
                    : "border-slate-300 bg-white text-slate-500"
                }`}
              >
                {item.step}
              </span>

              <span
                className={`text-sm font-semibold ${
                  active ? "text-sky-600" : "text-slate-700"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default function NewJournalForm({
  action,
  strategy,
  strategies = [],
  accounts,
  symbols,
  prefillJournal = null,
}) {
  const router = useRouter();
  const [selectedStrategy, setSelectedStrategy] = useState(strategy || null);
  const [setupImages, setSetupImages] = useState([]);
  const [referenceImages, setReferenceImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [setupImageError, setSetupImageError] = useState("");
  const [referenceImageError, setReferenceImageError] = useState("");

  const [existingSetupImages, setExistingSetupImages] = useState([]);
  const [existingReferenceImages, setExistingReferenceImages] = useState([]);
  const [selectedHtf, setSelectedHtf] = useState(() => {
    if (prefillJournal?.htf?.length) {
      return prefillJournal.htf;
    }

    return [];
  });

  const [selectedEntryTf, setSelectedEntryTf] = useState(() => {
    if (prefillJournal?.entry_tf?.length) {
      return prefillJournal.entry_tf;
    }

    return [];
  });

  const [activeSection, setActiveSection] = useState("playbook");

  useEffect(() => {
    const sections = ["setup", "levels", "reasoning", "images", "risk"];

    function handleScroll() {
      const scrollPosition = window.scrollY + 180;

      for (const id of sections) {
        const element = document.getElementById(id);
        if (!element) continue;

        if (
          scrollPosition >= element.offsetTop &&
          scrollPosition < element.offsetTop + element.offsetHeight
        ) {
          setActiveSection(id);
          break;
        }
      }
    }

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => {
    async function loadSignedUrls() {
      if (!prefillJournal) return;

      const supabase = createClient();

      async function buildImages(paths = []) {
        const results = await Promise.all(
          paths.map(async (path) => {
            const { data } = await supabase.storage
              .from("journal-images")
              .createSignedUrl(path, 60 * 60);

            return {
              path,
              url: data?.signedUrl || "",
            };
          }),
        );

        return results;
      }

      const setup = await buildImages(prefillJournal.setup_images || []);
      const reference = await buildImages(
        prefillJournal.reference_images || [],
      );

      setExistingSetupImages(setup);
      setExistingReferenceImages(reference);
    }

    loadSignedUrls();
  }, [prefillJournal]);

  const [state, formAction, pending] = useActionState(action, {
    ok: true,
    message: "",
  });

  const [purpose, setPurpose] = useState(
    prefillJournal?.purpose || "TRADE OBSERVATION",
  );

  const purposeKey = normPurpose(purpose);
  const cfg = PURPOSE_CONFIG[purposeKey] || PURPOSE_CONFIG["TRADE OBSERVATION"];

  const [status, setStatus] = useState(prefillJournal?.status || "");

  const [journalStartAt, setJournalStartAt] = useState(
    prefillJournal?.journal_start_at
      ? toDatetimeLocal(prefillJournal.journal_start_at)
      : nowLocalDateTimeValue(),
  );

  const [journalEndAt, setJournalEndAt] = useState(
    prefillJournal?.journal_end_at
      ? toDatetimeLocal(prefillJournal.journal_end_at)
      : nowLocalDateTimeValue(),
  );

  const [riskMode, setRiskMode] = useState(
    prefillJournal?.risk_mode || "PERCENT",
  );

  const [direction, setDirection] = useState(
    prefillJournal?.direction || "BUY",
  );

  const [quantity, setQuantity] = useState(
    prefillJournal?.quantity != null ? String(prefillJournal.quantity) : "1",
  );

  const [entryPrice, setEntryPrice] = useState(
    prefillJournal?.entry_price != null
      ? String(prefillJournal.entry_price)
      : "",
  );

  const [stopLoss, setStopLoss] = useState(
    prefillJournal?.stop_loss != null ? String(prefillJournal.stop_loss) : "",
  );

  const [tpItems, setTpItems] = useState(() => {
    if (!prefillJournal) return [];

    const prices = Array.isArray(prefillJournal.take_profit)
      ? prefillJournal.take_profit
      : [];

    const qtys = Array.isArray(prefillJournal.take_profit_qty)
      ? prefillJournal.take_profit_qty
      : [];

    return prices.map((price, index) => ({
      price: String(price),
      qty: String(qtys[index] || ""),
    }));
  });

  const totalLotsNum = Number(quantity);
  const totalLotsOk =
    !Number.isNaN(totalLotsNum) && totalLotsNum > 0 ? round2(totalLotsNum) : 0;

  const sumTpLots = useMemo(
    () => tpItems.reduce((acc, it) => acc + (Number(it.qty) || 0), 0),
    [tpItems],
  );

  const sumOk =
    totalLotsOk > 0 ? Math.abs(round2(sumTpLots) - totalLotsOk) <= 0.01 : false;

  const entryNum = Number(entryPrice);
  const slNum = Number(stopLoss);

  let slOk = true;

  if (entryPrice !== "" && stopLoss !== "") {
    if (direction === "BUY") slOk = slNum < entryNum;
    if (direction === "SELL") slOk = slNum > entryNum;
  }

  useEffect(() => {
    async function uploadImagesAndRedirect() {
      if (!state?.ok || !state?.journalId) return;

      setUploadingImages(true);
      setUploadError("");

      try {
        const supabase = createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("User not found.");
        }

        let copiedSetupImages = [];
        let copiedReferenceImages = [];

        const hasExistingImages =
          (state.existingSetupImages || []).length > 0 ||
          (state.existingReferenceImages || []).length > 0;

        if (hasExistingImages) {
          const copyRes = await fetch("/api/journals/copy-images", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              journalId: state.journalId,
              setupImages: state.existingSetupImages || [],
              referenceImages: state.existingReferenceImages || [],
            }),
          });

          const copyJson = await copyRes.json();

          if (!copyJson.ok) {
            throw new Error(copyJson.message || "Failed to copy images.");
          }

          copiedSetupImages = copyJson.setupImages || [];
          copiedReferenceImages = copyJson.referenceImages || [];
        }

        async function uploadFiles(files, type) {
          const uploadedPaths = [];

          for (let i = 0; i < files.length; i++) {
            const file = files[i];

            const ext = file.name.split(".").pop() || "jpg";
            const filePath = `${user.id}/${state.journalId}/${type}/${Date.now()}-${i}.${ext}`;

            const { error } = await supabase.storage
              .from("journal-images")
              .upload(filePath, file, {
                contentType: file.type,
                upsert: false,
              });

            if (error) throw new Error(error.message);

            uploadedPaths.push(filePath);
          }

          return uploadedPaths;
        }

        const uploadedSetupImages = await uploadFiles(setupImages, "setup");
        const uploadedReferenceImages = await uploadFiles(
          referenceImages,
          "reference",
        );

        const finalSetupImages = [...copiedSetupImages, ...uploadedSetupImages];

        const finalReferenceImages = [
          ...copiedReferenceImages,
          ...uploadedReferenceImages,
        ];

        const { error: updateError } = await supabase
          .from("journals")
          .update({
            setup_images: finalSetupImages,
            reference_images: finalReferenceImages,
          })
          .eq("id", state.journalId);

        if (updateError) throw new Error(updateError.message);

        router.push("/app/journals");
      } catch (err) {
        setUploadError(err.message || "Image upload failed.");
      } finally {
        setUploadingImages(false);
      }
    }

    uploadImagesAndRedirect();
  }, [state?.ok, state?.journalId]);
  const setupImageCount =
    (existingSetupImages?.length || 0) + (setupImages?.length || 0);

  const setupImagesOk = setupImageCount >= 1 && setupImageCount <= 2;

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6">
        <img
          src="/playbook-bg.png"
          alt=""
          className="absolute right-0 top-0 h-full w-[65%] object-cover opacity-80"
        />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white/80 px-4 py-2 text-sm font-semibold text-sky-600">
            <Sparkles className="h-4 w-4" />
            OPPORTUNITY BUILDER
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950">
            {prefillJournal ? (
              <>
                Edit <span className="text-sky-500">Opportunity</span>
              </>
            ) : (
              <>
                Create <span className="text-sky-500">Opportunity</span>
              </>
            )}
          </h1>

          <p className="mt-4 max-w-2xl text-sm text-slate-500">
            {prefillJournal
              ? "Modify your existing trading opportunity and update execution details."
              : "Select a live playbook and create a structured trading opportunity."}
          </p>
        </div>
      </div>

      {!selectedStrategy && !prefillJournal ? (
        <div className="grid gap-5 md:grid-cols-2">
          {strategies.map((s) => {
            const isConservative = s.strategy_type === "Conservative";

            return (
              <div
                key={s.id}
                className="
    group relative overflow-hidden rounded-3xl border border-slate-200
    bg-gradient-to-br from-white via-slate-50 to-sky-50/40
    p-6 shadow-sm transition duration-300
    hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl
  pointer"
              >
                <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-sky-100/40 blur-3xl transition group-hover:bg-sky-200/50" />

                <div className="relative z-10">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-2xl font-bold text-slate-950">
                      {s.strategy_name}
                    </h3>

                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      LIVE
                    </div>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {s.trading_style} • {s.setup_type}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        isConservative
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-orange-50 text-orange-700"
                      }`}
                    >
                      {s.strategy_type}
                    </span>

                    <Pill>
                      Risk: {Number(s.risk_per_trade || 0).toFixed(3)}%
                    </Pill>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                        HTF
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {(s.htf || []).map((tf) => (
                          <span
                            key={tf}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                          >
                            {tf}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                        ENTRY TF
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {(s.entry_tf || []).map((tf) => (
                          <span
                            key={tf}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                          >
                            {tf}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white/70 p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-sky-600">
                      Confluence
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {(s.bias_confluence || []).map((b) => (
                        <span
                          key={b}
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <FieldShell label="Checklist">
                      <textarea
                        readOnly
                        rows={4}
                        value={s.checklist || "—"}
                        className="w-full resize-y rounded-xl border border-slate-200 bg-white/80 p-3 text-sm leading-6 text-slate-600 outline-none"
                      />
                    </FieldShell>

                    <FieldShell label="Entry Criteria">
                      <textarea
                        readOnly
                        rows={4}
                        value={s.entry_rules || "—"}
                        className="w-full resize-y rounded-xl border border-slate-200 bg-white/80 p-3 text-sm leading-6 text-slate-600 outline-none"
                      />
                    </FieldShell>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button
                      type="button"
                      onClick={() => {
                        setSelectedStrategy(s);
                        setSelectedHtf([]);
                        setSelectedEntryTf([]);
                      }}
                      className="h-12 rounded-2xl bg-sky-600 px-5 text-white hover:bg-sky-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New Opportunity
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {selectedStrategy || prefillJournal ? (
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <OpportunityStepper activeSection={activeSection} />

          <div className="space-y-6">
            {!prefillJournal ? (
              <StrategyBlueprint s={selectedStrategy} />
            ) : null}

            <form action={formAction} className="space-y-6">
              <JournalDetailsCommon
                cfg={cfg}
                purpose={purposeKey}
                setPurpose={setPurpose}
                status={status}
                setStatus={setStatus}
                accounts={accounts}
                symbols={symbols}
                tpItems={tpItems}
                setTpItems={setTpItems}
                direction={direction}
                setDirection={setDirection}
                quantity={quantity}
                setQuantity={setQuantity}
                riskMode={riskMode}
                setRiskMode={setRiskMode}
                strategy={selectedStrategy || strategy}
                entryPrice={entryPrice}
                setEntryPrice={setEntryPrice}
                stopLoss={stopLoss}
                setStopLoss={setStopLoss}
                setupImages={setupImages}
                setSetupImages={setSetupImages}
                referenceImages={referenceImages}
                setReferenceImages={setReferenceImages}
                setupImageError={setupImageError}
                setSetupImageError={setSetupImageError}
                referenceImageError={referenceImageError}
                setReferenceImageError={setReferenceImageError}
                prefillJournal={prefillJournal}
                existingSetupImages={existingSetupImages}
                setExistingSetupImages={setExistingSetupImages}
                existingReferenceImages={existingReferenceImages}
                setExistingReferenceImages={setExistingReferenceImages}
                journalStartAt={journalStartAt}
                setJournalStartAt={setJournalStartAt}
                journalEndAt={journalEndAt}
                setJournalEndAt={setJournalEndAt}
                selectedHtf={selectedHtf}
                setSelectedHtf={setSelectedHtf}
                selectedEntryTf={selectedEntryTf}
                setSelectedEntryTf={setSelectedEntryTf}
              />
              <input
                type="hidden"
                name="strategy_id"
                value={selectedStrategy?.id || ""}
              />
              {state?.message ? (
                <div
                  className={`rounded-2xl border p-4 text-sm ${
                    state.ok
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  {state.message}
                </div>
              ) : null}

              {uploadError ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  {uploadError}
                </div>
              ) : null}

              <div className="bottom-4 z-10 rounded-3xl border bg-background/85 p-4 shadow-lg backdrop-blur">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="max-w-xl">
                    <p className="mt-1 text-sm">
                      Save this trade plan for disciplined execution and
                      post-trade review. You can edit details and add images
                      after saving.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={
                      pending ||
                      uploadingImages ||
                      tpItems.length === 0 ||
                      !sumOk ||
                      !slOk ||
                      selectedHtf.length === 0 ||
                      selectedEntryTf.length === 0 ||
                      !setupImagesOk ||
                      (cfg.required?.status && !status)
                    }
                    className="h-11 rounded-2xl bg-sky-600 px-5 text-white hover:bg-sky-700 md:ml-auto"
                  >
                    {pending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {prefillJournal ? "Updating..." : "Saving..."}
                      </>
                    ) : uploadingImages ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading Images...
                      </>
                    ) : prefillJournal ? (
                      "Update Opportunity"
                    ) : (
                      "Create Opportunity"
                    )}
                  </Button>
                </div>

                {!slOk ? (
                  <p className="mt-3 text-xs text-destructive">
                    Fix Stop Loss based on direction. BUY: SL &lt; Entry, SELL:
                    SL &gt; Entry.
                  </p>
                ) : null}

                {cfg.required?.status && !status ? (
                  <p className="mt-3 text-xs text-destructive">
                    Please select a status.
                  </p>
                ) : null}

                {!setupImagesOk ? (
                  <p className="mt-3 text-xs text-destructive">
                    Please upload at least 1 setup image. Maximum allowed is 2.
                  </p>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
