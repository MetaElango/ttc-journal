"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  FileText,
  Loader2,
  Target,
  BadgeCheck,
  Plus,
  Trash2,
  Scale,
  Lightbulb,
  SlidersHorizontal,
} from "lucide-react";

const ACTIVE_STATUSES = ["ENTRY PLACED", "ENTRY TRIGGERED", "RUNNING TRADE"];
const HIDDEN_EDIT_STATUSES = ["ENTRY PLANNED", "ENTRY PLACED", "RUNNING TRADE"];

const PROFIT_CHECKPOINTS = [
  { value: "ACTUAL_TP", label: "Actual TP Hit" },
  { value: "MODIFIED_TP", label: "Modified TP Hit" },
  { value: "TP_BREAKEVEN", label: "TP at Breakeven" },
];

const SL_CHECKPOINTS = [
  { value: "ACTUAL_SL", label: "Actual SL Hit" },
  { value: "MODIFIED_SL", label: "Modified SL Hit" },
  { value: "SL_BREAKEVEN", label: "SL at Breakeven" },
];

function needsEndDate(status) {
  const value = String(status || "")
    .trim()
    .toUpperCase();
  return value && !ACTIVE_STATUSES.includes(value);
}

function toDatetimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function sanitize6dp(raw) {
  const s = String(raw ?? "");
  let out = s.replace(/[^\d.]/g, "");
  const firstDot = out.indexOf(".");

  if (firstDot !== -1) {
    out =
      out.slice(0, firstDot + 1) + out.slice(firstDot + 1).replace(/\./g, "");
  }

  if (out.includes(".")) {
    const [a, b] = out.split(".");
    out = a + "." + (b || "").slice(0, 6);
  }

  return out;
}

function sanitize2dp(raw) {
  const s = String(raw ?? "");
  let out = s.replace(/[^\d.]/g, "");
  const firstDot = out.indexOf(".");

  if (firstDot !== -1) {
    out =
      out.slice(0, firstDot + 1) + out.slice(firstDot + 1).replace(/\./g, "");
  }

  if (out.includes(".")) {
    const [a, b] = out.split(".");
    out = a + "." + (b || "").slice(0, 2);
  }

  return out;
}

function round2(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function defaultSplitWeights(count) {
  if (count <= 0) return [];
  return Array.from({ length: count }, () => 1 / count);
}

function arrayValue(value) {
  return Array.isArray(value) ? value.map((x) => String(x ?? "")) : [];
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
      {children}
    </span>
  );
}

function FieldShell({ label, required, optional, children }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-950">
        {label} {required ? <span className="text-red-500">*</span> : null}
        {optional ? (
          <span className="ml-1 text-xs font-medium text-slate-400">
            optional
          </span>
        ) : null}
      </label>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, eyebrow, title, description }) {
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

function inputClass() {
  return "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
}

function textareaClass() {
  return "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
}

function ReadOnlyBox({ label, value, note }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-lg font-bold text-slate-900">
        {value || "—"}{" "}
        {note ? (
          <span className="text-sm font-medium text-slate-500">{note}</span>
        ) : null}
      </div>
    </div>
  );
}

function TpSlView({ journal }) {
  const tp = arrayValue(journal.take_profit);
  const tpQty = arrayValue(journal.take_profit_qty);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ReadOnlyBox label="Stop Loss" value={journal.stop_loss} />

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-xs font-semibold uppercase text-slate-500">
          Take Profit
        </div>

        <div className="mt-3 space-y-2">
          {tp.length ? (
            tp.map((price, index) => (
              <div
                key={`${price}-${index}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <span className="font-semibold text-slate-900">
                  TP {index + 1}: {price}
                </span>
                <span className="text-slate-500">
                  Qty: {tpQty[index] || "—"}
                </span>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-500">—</div>
          )}
        </div>
      </div>
    </div>
  );
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
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-sky-50 text-sky-600">
            <Target className="h-5 w-5" />
          </div>

          <div>
            <div className="text-lg font-semibold tracking-tight text-slate-950">
              Modified Take Profit <span className="text-red-500">*</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Add one or more targets. Qty sum must equal total lots.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={autoSplitAll}
            disabled={disabled || items.length === 0 || !totalOk}
            className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Auto Split
          </button>

          <button
            type="button"
            onClick={addRow}
            disabled={disabled}
            className="inline-flex h-11 items-center rounded-2xl bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add TP
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm font-medium text-slate-900">
            No take-profit targets yet
          </p>
          <p className="mt-1 text-sm text-slate-500">
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
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4"
              >
                <div className="grid gap-4 md:grid-cols-[90px_1fr_1fr_120px_70px] md:items-end">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-xs font-semibold text-sky-600">
                      {idx + 1}
                    </div>

                    <div className="text-sm font-semibold text-slate-900">
                      TP {idx + 1}
                    </div>
                  </div>

                  <FieldShell label="Price" required>
                    <input
                      value={it.price}
                      onChange={(e) => updatePrice(idx, e.target.value)}
                      inputMode="decimal"
                      placeholder="e.g. 1.123456"
                      disabled={disabled}
                      required
                      className={inputClass()}
                    />
                  </FieldShell>

                  <FieldShell label="Qty / Lots" required>
                    <input
                      value={it.qty}
                      onChange={(e) => updateQty(idx, e.target.value)}
                      inputMode="decimal"
                      placeholder="0.50"
                      disabled={disabled}
                      required
                      className={inputClass()}
                    />
                  </FieldShell>

                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center">
                    <div className="text-base font-semibold text-slate-900">
                      {round2(pct)}%
                    </div>

                    <div className="text-[11px] text-slate-500">Position</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    disabled={disabled}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-sky-600 transition-all"
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
              ? "border-sky-200 bg-sky-50 text-slate-900"
              : "border-red-200 bg-red-50 text-red-600",
          ].join(" ")}
        >
          <Scale className="h-4 w-4" />
          <span>
            TP Qty sum: <strong>{round2(sumTpLots)}</strong> / Total lots:{" "}
            <strong>{totalOk ? round2(totalOk) : "—"}</strong>
          </span>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
          <Lightbulb className="h-4 w-4 text-sky-600" />
          Tip: edit any TP qty except last to auto-split the remainder.
        </div>
      </div>
    </section>
  );
}

export default function EditJournalForm({
  action,
  journal,
  strategyName,
  symbolLabel,
  statusOptions,
  errorType,
}) {
  const [status, setStatus] = useState(journal.status || "");
  const [exitCheckpoint, setExitCheckpoint] = useState(
    journal.exit_checkpoint || "",
  );

  const [journalEndAt, setJournalEndAt] = useState(() => {
    return (
      toDatetimeLocal(journal.journal_end_at) || toDatetimeLocal(new Date())
    );
  });

  const [exitPrice, setExitPrice] = useState(
    journal.exit_price != null ? String(journal.exit_price) : "",
  );

  const [exitReason, setExitReason] = useState(journal.exit_reason || "");

  const [modifiedSlPrice, setModifiedSlPrice] = useState(
    journal.modified_sl_price != null
      ? String(journal.modified_sl_price)
      : journal.modified_sl != null
        ? String(journal.modified_sl)
        : "",
  );

  const [modifiedTpRows, setModifiedTpRows] = useState(() => {
    const existingPrice = arrayValue(journal.modified_tp_price);
    const existingQty = arrayValue(journal.modified_tp_qty);

    const originalPrice = arrayValue(journal.take_profit);
    const originalQty = arrayValue(journal.take_profit_qty);

    const priceSource = existingPrice.length ? existingPrice : originalPrice;
    const qtySource = existingQty.length ? existingQty : originalQty;

    return priceSource.length
      ? priceSource.map((price, index) => ({
          price,
          qty: qtySource[index] || "",
        }))
      : [{ price: "", qty: "" }];
  });

  const [submitting, setSubmitting] = useState(false);

  const journalStartAt = toDatetimeLocal(journal.journal_start_at);
  const endDateRequired = useMemo(() => needsEndDate(status), [status]);

  const filteredStatusOptions = useMemo(() => {
    return statusOptions.filter((x) => !HIDDEN_EDIT_STATUSES.includes(x));
  }, [statusOptions]);

  const isEntryTriggered = status === "ENTRY TRIGGERED";
  const isEntryCancelled = status === "ENTRY CANCELLED";
  const isEntryMissed = status === "ENTRY MISSED";
  const isSlStatus = status === "TRADE SL HIT";
  const isProfitStatus = status === "TRADE CLOSE WITH PROFIT";
  const isMidExit = status === "TRADE EXIT IN MID";

  const isActualSl = exitCheckpoint === "ACTUAL_SL";
  const isModifiedSl = exitCheckpoint === "MODIFIED_SL";
  const isSlBreakeven = exitCheckpoint === "SL_BREAKEVEN";
  const isActualTp = exitCheckpoint === "ACTUAL_TP";
  const isModifiedTp = exitCheckpoint === "MODIFIED_TP";
  const isTpBreakeven = exitCheckpoint === "TP_BREAKEVEN";

  const needsExitReason =
    isEntryCancelled ||
    isEntryMissed ||
    isSlStatus ||
    isProfitStatus ||
    isMidExit;

  const needsManualExitPrice = isMidExit;

  const autoExitPrice = isActualSl
    ? String(journal.stop_loss ?? "")
    : isSlBreakeven || isTpBreakeven
      ? String(journal.entry_price ?? "")
      : isModifiedSl
        ? modifiedSlPrice
        : "";

  const disableUpdate = isEntryTriggered;

  const modifiedTpQtySum = useMemo(() => {
    return modifiedTpRows.reduce((acc, row) => acc + (Number(row.qty) || 0), 0);
  }, [modifiedTpRows]);

  const modifiedTpQtyOk =
    !isModifiedTp ||
    Math.abs(round2(modifiedTpQtySum) - round2(journal.quantity)) <= 0.01;

  const canSubmit = useMemo(() => {
    if (!status) return false;
    if (disableUpdate) return false;
    if (endDateRequired && !journalEndAt) return false;

    if (isSlStatus && !exitCheckpoint) return false;
    if (isProfitStatus && !exitCheckpoint) return false;

    if (isModifiedSl && !modifiedSlPrice.trim()) return false;

    if (isModifiedTp) {
      const hasInvalidRow = modifiedTpRows.some(
        (row) => !String(row.price).trim() || !String(row.qty).trim(),
      );
      if (hasInvalidRow) return false;
      if (!modifiedTpQtyOk) return false;
    }

    if (needsManualExitPrice && !exitPrice.trim()) return false;
    if (needsExitReason && !exitReason.trim()) return false;

    return true;
  }, [
    status,
    disableUpdate,
    endDateRequired,
    journalEndAt,
    isSlStatus,
    isProfitStatus,
    exitCheckpoint,
    isModifiedSl,
    modifiedSlPrice,
    isModifiedTp,
    modifiedTpRows,
    modifiedTpQtyOk,
    needsManualExitPrice,
    exitPrice,
    needsExitReason,
    exitReason,
  ]);

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6">
        <img
          src="/playbook-bg.png"
          alt=""
          className="absolute right-0 top-0 h-full w-[65%] object-cover opacity-80"
        />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white/80 px-4 py-2 text-sm font-semibold text-sky-600">
              <Target className="h-4 w-4" />
              OPPORTUNITY UPDATE
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950">
              Edit <span className="text-sky-500">Opportunity</span>
            </h1>

            <p className="mt-3 max-w-2xl text-sm text-slate-500">
              Update the status and final outcome for this opportunity.
            </p>
          </div>

          <Link
            href="/app/radars"
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <SectionHeader
          icon={BadgeCheck}
          eyebrow="Selected Opportunity"
          title={strategyName}
          description="Original trade details are shown here for context."
        />

        <div className="mt-5 flex flex-wrap gap-2">
          <Pill>Symbol: {symbolLabel}</Pill>
          <Pill>Direction: {journal.direction || "—"}</Pill>
          <Pill>Purpose: {journal.purpose || "—"}</Pill>
          <Pill>Current Status: {journal.status || "—"}</Pill>
          <Pill>Entry: {journal.entry_price ?? "—"}</Pill>
          <Pill>SL: {journal.stop_loss ?? "—"}</Pill>
          <Pill>Total Lots: {journal.quantity ?? "—"}</Pill>
        </div>
      </section>

      <form
        action={action}
        className="space-y-6"
        onSubmit={() => setSubmitting(true)}
      >
        <input type="hidden" name="exit_checkpoint" value={exitCheckpoint} />
        <input type="hidden" name="journal_start_at" value={journalStartAt} />

        <input
          type="hidden"
          name="exit_price"
          value={needsManualExitPrice ? exitPrice : autoExitPrice}
        />

        <input
          type="hidden"
          name="modified_sl_price"
          value={isModifiedSl ? modifiedSlPrice : ""}
        />

        {isModifiedTp
          ? modifiedTpRows.map((row, index) => (
              <div key={`hidden-modified-tp-${index}`}>
                <input
                  type="hidden"
                  name="modified_tp_price"
                  value={row.price}
                />
                <input type="hidden" name="modified_tp_qty" value={row.qty} />
              </div>
            ))
          : null}

        {errorType ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
            {decodeURIComponent(errorType)}
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            icon={CalendarClock}
            eyebrow="Step 1"
            title="Status & Time"
            description="Choose the latest status and set the correct opportunity timing."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <FieldShell label="Status" required>
              <select
                name="status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setExitCheckpoint("");
                }}
                className={inputClass()}
                required
              >
                <option value="" disabled>
                  Select status
                </option>

                {filteredStatusOptions.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </FieldShell>

            <FieldShell label="Opportunity Start Date" required>
              <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700">
                {journalStartAt ? journalStartAt.replace("T", " ") : "—"}
              </div>
            </FieldShell>

            {endDateRequired ? (
              <FieldShell label="Opportunity End Date" required>
                <input
                  name="journal_end_at"
                  type="datetime-local"
                  value={journalEndAt}
                  onChange={(e) => setJournalEndAt(e.target.value)}
                  className={inputClass()}
                  required
                />
              </FieldShell>
            ) : (
              <input type="hidden" name="journal_end_at" value="" />
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            icon={CheckCircle2}
            eyebrow="Step 2"
            title="Exit Details"
            description="Fields below change based on selected status."
          />

          <div className="mt-6 space-y-6">
            {isEntryTriggered ? (
              <>
                <TpSlView journal={journal} />
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                  Entry is triggered and still active, so no exit update is
                  needed.
                </div>
              </>
            ) : null}

            {isEntryCancelled || isEntryMissed || isMidExit ? (
              <TpSlView journal={journal} />
            ) : null}

            {isSlStatus ? (
              <FieldShell label="SL Exit Type" required>
                <select
                  value={exitCheckpoint}
                  onChange={(e) => setExitCheckpoint(e.target.value)}
                  className={inputClass()}
                  required
                >
                  <option value="" disabled>
                    Select SL type
                  </option>

                  {SL_CHECKPOINTS.map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </FieldShell>
            ) : null}

            {isProfitStatus ? (
              <FieldShell label="Profit Exit Type" required>
                <select
                  value={exitCheckpoint}
                  onChange={(e) => setExitCheckpoint(e.target.value)}
                  className={inputClass()}
                  required
                >
                  <option value="" disabled>
                    Select profit type
                  </option>

                  {PROFIT_CHECKPOINTS.map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </FieldShell>
            ) : null}

            {isActualSl ? (
              <ReadOnlyBox
                label="Exit Price"
                value={journal.stop_loss}
                note="from original SL"
              />
            ) : null}

            {isSlBreakeven || isTpBreakeven ? (
              <ReadOnlyBox
                label="Exit Price"
                value={journal.entry_price}
                note="from entry price"
              />
            ) : null}

            {isModifiedSl ? (
              <div className="grid gap-4 md:grid-cols-2">
                <ReadOnlyBox label="Original SL" value={journal.stop_loss} />

                <FieldShell label="Modified SL Price" required>
                  <input
                    value={modifiedSlPrice}
                    onChange={(e) =>
                      setModifiedSlPrice(sanitize6dp(e.target.value))
                    }
                    className={inputClass()}
                    inputMode="decimal"
                    required
                  />
                </FieldShell>
              </div>
            ) : null}

            {isActualTp ? <TpSlView journal={journal} /> : null}

            {isModifiedTp ? (
              <TakeProfitEditor
                items={modifiedTpRows}
                setItems={setModifiedTpRows}
                totalLots={journal.quantity}
                disabled={submitting}
              />
            ) : null}

            {needsManualExitPrice ? (
              <FieldShell label="Exit Price" required>
                <input
                  name="manual_exit_price"
                  type="text"
                  inputMode="decimal"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(sanitize6dp(e.target.value))}
                  className={inputClass()}
                  placeholder="e.g. 245.500000"
                  required
                />
              </FieldShell>
            ) : null}

            {needsExitReason ? (
              <FieldShell label="Exit Reason" required>
                <textarea
                  name="exit_reason"
                  rows={6}
                  value={exitReason}
                  onChange={(e) => setExitReason(e.target.value)}
                  className={textareaClass()}
                  placeholder="Why did you update or close this trade?"
                  required
                />
              </FieldShell>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            icon={FileText}
            eyebrow="Original Note"
            title="Entry Reason"
            description="Readonly note from the original opportunity."
          />

          <textarea
            readOnly
            rows={6}
            value={journal.entry_reason || "—"}
            className="mt-5 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 outline-none"
          />
        </section>

        {!canSubmit ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
            Fill the required fields before updating.
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-200 bg-white/90 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <p className="hidden text-sm text-slate-500 md:block">
              Save this opportunity update and return to Opportunities.
            </p>

            <div className="ml-auto flex gap-2">
              <Link
                href="/app/radars"
                className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={!canSubmit || submitting || disableUpdate}
                className="inline-flex h-11 items-center rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : disableUpdate ? (
                  "No Update Needed"
                ) : (
                  "Update Opportunity"
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
