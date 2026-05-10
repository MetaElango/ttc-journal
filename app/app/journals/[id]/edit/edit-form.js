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

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function FieldShell({ label, required, optional, children }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label} {required ? <span className="text-destructive">*</span> : null}
        {optional ? (
          <span className="text-muted-foreground">(optional)</span>
        ) : null}
      </label>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-background shadow-sm">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
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

  const exitRequired = useMemo(() => {
    return EXIT_REQUIRED_STATUSES.includes(status);
  }, [status]);

  const endDateRequired = useMemo(() => {
    return needsEndDate(status);
  }, [status]);

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
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="overflow-hidden rounded-3xl border bg-gradient-to-br from-card via-card to-muted/40 shadow-sm">
        <div className="p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                Journal Update
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                Edit Journal
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Update status, closing details, exit price, and final journal
                notes.
              </p>
            </div>

            <Link
              href="/app/journals"
              className="inline-flex h-11 items-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
        </div>
      </div>

      <section className="rounded-3xl border bg-card p-5 shadow-sm md:p-6">
        <SectionHeader
          icon={FileText}
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
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {decodeURIComponent(errorType)}
          </div>
        ) : null}

        <section className="rounded-3xl border bg-card p-5 shadow-sm md:p-6">
          <SectionHeader
            icon={CalendarClock}
            title="Status & Time"
            description="Choose the latest status and set the correct journal timing."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <FieldShell label="Status" required>
              <select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
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

            <FieldShell label="Journal Start Date" required>
              <input
                name="journal_start_at"
                type="datetime-local"
                value={journalStartAt}
                onChange={(e) => setJournalStartAt(e.target.value)}
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                required
              />
            </FieldShell>

            {endDateRequired ? (
              <FieldShell label="Journal End Date" required>
                <input
                  name="journal_end_at"
                  type="datetime-local"
                  value={journalEndAt}
                  onChange={(e) => setJournalEndAt(e.target.value)}
                  className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                  required
                />
              </FieldShell>
            ) : (
              <input type="hidden" name="journal_end_at" value="" />
            )}
          </div>
        </section>

        <section className="rounded-3xl border bg-card p-5 shadow-sm md:p-6">
          <SectionHeader
            icon={CheckCircle2}
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
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
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
                  rows={5}
                  value={exitReason}
                  onChange={(e) => setExitReason(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                  placeholder="Why did you close or update this trade?"
                  required={exitRequired}
                />
              </FieldShell>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border bg-card p-5 shadow-sm md:p-6">
          <SectionHeader
            icon={FileText}
            title="Original Entry Reason"
            description="Readonly note from the original journal entry."
          />

          <div className="mt-5 rounded-2xl border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground whitespace-pre-wrap">
            {journal.entry_reason || "—"}
          </div>
        </section>

        {!canSubmit ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Fill the required status/date fields before updating.
          </div>
        ) : null}

        <div className="sticky bottom-4 z-10 rounded-3xl border bg-background/85 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <p className="hidden text-sm text-muted-foreground md:block">
              Save the journal update and return to Journals.
            </p>

            <div className="flex gap-2">
              <Link
                href="/app/journals"
                className="inline-flex h-11 items-center rounded-2xl border px-5 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="inline-flex h-11 items-center rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Journal"
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
