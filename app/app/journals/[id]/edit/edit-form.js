"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
      {children}
    </span>
  );
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
    <div className="rounded-xl border">
      <div className="border-b p-4">
        <div className="text-lg font-semibold">{strategyName}</div>

        <div className="mt-2 flex flex-wrap gap-2">
          <Pill>Symbol: {symbolLabel}</Pill>
          <Pill>Direction: {journal.direction || "—"}</Pill>
          <Pill>Purpose: {journal.purpose || "—"}</Pill>
          <Pill>Status: {journal.status || "—"}</Pill>
          <Pill>Entry: {journal.entry_price ?? "—"}</Pill>
          <Pill>SL: {journal.stop_loss ?? "—"}</Pill>
        </div>
      </div>

      <div className="p-4">
        <form action={action} className="space-y-6">
          {errorType ? (
            <p className="text-sm text-destructive">
              {decodeURIComponent(errorType)}
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Status <span className="text-destructive">*</span>
              </label>

              <select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Journal Start Date <span className="text-destructive">*</span>
              </label>

              <input
                name="journal_start_at"
                type="datetime-local"
                value={journalStartAt}
                onChange={(e) => setJournalStartAt(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                required
              />
            </div>

            {endDateRequired ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Journal End Date <span className="text-destructive">*</span>
                </label>

                <input
                  name="journal_end_at"
                  type="datetime-local"
                  value={journalEndAt}
                  onChange={(e) => setJournalEndAt(e.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  required
                />
              </div>
            ) : (
              <input type="hidden" name="journal_end_at" value="" />
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Exit Price{" "}
                {exitRequired ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="text-muted-foreground">(optional)</span>
                )}
              </label>

              <input
                name="exit_price"
                type="text"
                inputMode="decimal"
                value={exitPrice}
                onChange={(e) => setExitPrice(sanitize2dp(e.target.value))}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                placeholder="e.g. 245.50"
                required={exitRequired}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Exit Reason{" "}
              {exitRequired ? (
                <span className="text-destructive">*</span>
              ) : (
                <span className="text-muted-foreground">(optional)</span>
              )}
            </label>

            <textarea
              name="exit_reason"
              rows={4}
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Enter exit reason"
              required={exitRequired}
            />
          </div>

          <div className="rounded-md border p-3 text-sm whitespace-pre-wrap">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              Entry Reason
            </div>
            {journal.entry_reason || "—"}
          </div>

          {!canSubmit ? (
            <p className="text-sm text-destructive">
              Fill the required status/date fields before updating.
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Update Journal
            </button>

            <Link
              href="/app/journals"
              className="inline-flex h-10 items-center rounded-md border px-4 text-sm hover:bg-accent"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
