"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const EXIT_REQUIRED_STATUSES = ["TRADE CLOSE WITH PROFIT", "TRADE EXIT IN MID"];

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
  const [exitPrice, setExitPrice] = useState(
    journal.exit_price != null ? String(journal.exit_price) : "",
  );
  const [exitReason, setExitReason] = useState(journal.exit_reason || "");

  const exitRequired = useMemo(() => {
    return EXIT_REQUIRED_STATUSES.includes(status);
  }, [status]);

  const canSubmit = useMemo(() => {
    if (!status) return false;
    if (!exitRequired) return true;
    return exitReason.trim() !== "" && exitPrice.trim() !== "";
  }, [status, exitRequired, exitReason, exitPrice]);

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
          {errorType === "status" ? (
            <p className="text-sm text-destructive">
              Please select a valid status.
            </p>
          ) : null}

          {errorType ? (
            <p className="text-sm text-destructive">
              {decodeURIComponent(errorType)}
            </p>
          ) : null}

          {errorType === "exit_price" || errorType === "exit_price_required" ? (
            <p className="text-sm text-destructive">
              Exit price is required and must be a valid number for the selected
              status.
            </p>
          ) : null}

          {errorType === "save" ? (
            <p className="text-sm text-destructive">
              Failed to save journal. Please try again.
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
              {exitRequired
                ? "Exit reason and exit price are required for the selected status."
                : "Please select a status."}
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
