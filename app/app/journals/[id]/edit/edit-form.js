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
} from "lucide-react";

const EXIT_REQUIRED_STATUSES = ["TRADE CLOSE WITH PROFIT", "TRADE EXIT IN MID"];
const ACTIVE_STATUSES = ["ENTRY PLACED", "ENTRY TRIGGERED", "RUNNING TRADE"];

function needsEndDate(status) {
  const value = String(status || "")
    .trim()
    .toUpperCase();
  return value && !ACTIVE_STATUSES.includes(value);
}

function toDatetimeLocal(value) {
  if (!value) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }

  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
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

function Pill({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 ${className}`}
    >
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
        {eyebrow ? (
          <div className="text-xs font-bold uppercase tracking-wide text-sky-600">
            {eyebrow}
          </div>
        ) : null}

        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function inputClass() {
  return "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60";
}

function textareaClass() {
  return "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
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
  const [journalStartAt, setJournalStartAt] = useState(
    toDatetimeLocal(journal.journal_start_at),
  );
  const [journalEndAt, setJournalEndAt] = useState(
    toDatetimeLocal(journal.journal_end_at),
  );
  const [exitPrice, setExitPrice] = useState(
    journal.exit_price != null ? String(journal.exit_price) : "",
  );
  const [exitReason, setExitReason] = useState(journal.exit_reason || "");
  const [submitting, setSubmitting] = useState(false);

  const exitRequired = useMemo(
    () => EXIT_REQUIRED_STATUSES.includes(status),
    [status],
  );

  const endDateRequired = useMemo(() => needsEndDate(status), [status]);

  const canSubmit = useMemo(() => {
    if (!status) return false;
    if (!journalStartAt) return false;
    if (endDateRequired && !journalEndAt) return false;
    if (!exitRequired) return true;

    return exitReason.trim() !== "" && exitPrice.trim() !== "";
  }, [
    status,
    journalStartAt,
    journalEndAt,
    endDateRequired,
    exitRequired,
    exitReason,
    exitPrice,
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
              Update status, timing, exit price, and exit reason for this
              opportunity.
            </p>
          </div>

          <Link
            href="/app/journals"
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
        </div>
      </section>

      <form
        action={action}
        className="space-y-6"
        onSubmit={() => setSubmitting(true)}
      >
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
                onChange={(e) => setStatus(e.target.value)}
                className={inputClass()}
                required
              >
                <option value="" disabled>
                  Select status
                </option>

                {statusOptions.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </FieldShell>

            <FieldShell label="Opportunity Start Date" required>
              <input
                name="journal_start_at"
                type="datetime-local"
                value={journalStartAt}
                onChange={(e) => setJournalStartAt(e.target.value)}
                className={inputClass()}
                required
              />
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
            description={
              exitRequired
                ? "Exit price and exit reason are required for this status."
                : "Exit details are optional for this status."
            }
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <FieldShell
              label="Exit Price"
              required={exitRequired}
              optional={!exitRequired}
            >
              <input
                name="exit_price"
                type="text"
                inputMode="decimal"
                value={exitPrice}
                onChange={(e) => setExitPrice(sanitize2dp(e.target.value))}
                className={inputClass()}
                placeholder="e.g. 245.50"
                required={exitRequired}
              />
            </FieldShell>

            <div className="md:col-span-2">
              <FieldShell
                label="Exit Reason"
                required={exitRequired}
                optional={!exitRequired}
              >
                <textarea
                  name="exit_reason"
                  rows={6}
                  value={exitReason}
                  onChange={(e) => setExitReason(e.target.value)}
                  className={textareaClass()}
                  placeholder="Why did you close or update this opportunity?"
                  required={exitRequired}
                />
              </FieldShell>
            </div>
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
            Fill the required status/date fields before updating.
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-200 bg-white/90 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <p className="hidden text-sm text-slate-500 md:block">
              Save this opportunity update and return to Opportunities.
            </p>

            <div className="ml-auto flex gap-2">
              <Link
                href="/app/journals"
                className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="inline-flex h-11 items-center rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
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
