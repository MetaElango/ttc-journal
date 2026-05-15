"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Calendar,
  Eye,
  Pencil,
  Share2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import JournalDetailsModal from "./journal-details-modal";

const EDITABLE_ACTIVE_STATUSES = [
  "RUNNING TRADE",
  "ENTRY TRIGGERED",
  "ENTRY PLACED",
];

function norm(v) {
  return String(v || "")
    .trim()
    .toUpperCase();
}

function canEditJournal(journal) {
  const purpose = norm(journal.purpose);
  const status = norm(journal.status);

  if (purpose === "FOR OBSERVATION") return !status;

  if (purpose === "ENTRY PLANNED" || purpose === "FORWARD TESTING") {
    return EDITABLE_ACTIVE_STATUSES.includes(status);
  }

  return false;
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function getWeightedTakeProfit(journal) {
  const prices = Array.isArray(journal.take_profit) ? journal.take_profit : [];
  const qtys = Array.isArray(journal.take_profit_qty)
    ? journal.take_profit_qty
    : [];

  if (!prices.length) return 0;

  if (qtys.length === prices.length) {
    let total = 0;
    let totalQty = 0;

    for (let i = 0; i < prices.length; i++) {
      const price = Number(prices[i]);
      const qty = Number(qtys[i]);

      if (Number.isNaN(price) || Number.isNaN(qty) || qty <= 0) continue;

      total += price * qty;
      totalQty += qty;
    }

    if (totalQty > 0) return total / totalQty;
  }

  const validPrices = prices.map(Number).filter((n) => !Number.isNaN(n));
  if (!validPrices.length) return 0;

  return validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
}

function calculatePlannedRR(journal) {
  const direction = norm(journal.direction);
  const entry = Number(journal.entry_price);
  const stop = Number(journal.stop_loss);
  const tp = Number(getWeightedTakeProfit(journal));

  if (!(entry > 0) || !(stop > 0) || !(tp > 0)) return 0;

  if (direction === "BUY") {
    const risk = entry - stop;
    if (risk <= 0) return 0;
    return (tp - entry) / risk;
  }

  if (direction === "SELL") {
    const risk = stop - entry;
    if (risk <= 0) return 0;
    return (entry - tp) / risk;
  }

  return 0;
}

function formatRisk(journal) {
  const mode = norm(journal.risk_mode);
  const risk = journal.risk_per_trade;

  if (risk == null) return "—";
  if (mode === "PERCENT") return `${risk}%`;
  if (mode === "AMOUNT") return `$${risk}`;

  return risk;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getStatusStyle(status) {
  const s = norm(status);

  if (["ENTRY PLACED", "ENTRY TRIGGERED", "RUNNING TRADE"].includes(s)) {
    return {
      border: "border-l-emerald-500",
      badge:
        "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      label: status || "Open",
    };
  }

  if (["TRADE CLOSE WITH PROFIT"].includes(s)) {
    return {
      border: "border-l-blue-500",
      badge:
        "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300",
      label: status,
    };
  }

  if (["TRADE SL HIT"].includes(s)) {
    return {
      border: "border-l-red-500",
      badge: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
      label: status,
    };
  }

  if (["ENTRY CANCELLED", "ENTRY MISSED"].includes(s)) {
    return {
      border: "border-l-muted-foreground/40",
      badge: "border-border bg-muted text-muted-foreground",
      label: status,
    };
  }

  return {
    border: "border-l-border",
    badge: "border-border bg-background text-muted-foreground",
    label: status || "No status",
  };
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border bg-background/70 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value ?? "—"}</div>
    </div>
  );
}

function ImageStrip({ journal }) {
  const images = [
    ...(journal.setupImageUrls || []),
    ...(journal.referenceImageUrls || []),
  ].slice(0, 3);

  if (!images.length) return null;

  return (
    <div className="flex gap-2">
      {images.map((url, index) => (
        <div
          key={`${url}-${index}`}
          className="h-14 w-16 overflow-hidden rounded-xl border bg-muted"
        >
          <img
            src={url}
            alt={`Journal image ${index + 1}`}
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

function JournalCard({ journal, index, setSelectedJournal }) {
  const strategyName = journal?.strategy_snapshot?.strategy_name || "—";
  const tradingStyle = journal?.strategy_snapshot?.trading_style || "—";
  const setup = journal?.strategy_snapshot?.setup_type || "—";
  const symbol = journal?.symbols?.symbol_name || "—";
  const rr = calculatePlannedRR(journal);
  const statusStyle = getStatusStyle(journal.status);
  const isBuy = norm(journal.direction) === "BUY";

  async function shareJournal() {
    const res = await fetch("/api/journals/share", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ journalId: journal.id }),
    });

    const json = await res.json();

    if (!json.ok) {
      alert(json.message || "Failed to share journal.");
      return;
    }

    window.location.reload();
  }

  return (
    <article
      className={[
        "group overflow-hidden rounded-3xl border border-l-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        statusStyle.border,
        index % 2 === 0 ? "bg-card" : "bg-muted/20",
      ].join(" ")}
    >
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-semibold tracking-tight">
                  {strategyName}
                </h3>

                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyle.badge}`}
                >
                  {statusStyle.label}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{journal.purpose || "—"}</span>
                <span>•</span>
                <span>{tradingStyle}</span>
                <span>•</span>
                <span>{setup}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-medium">
                {isBuy ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                )}
                {journal.direction || "—"}
              </span>

              <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium">
                {symbol}
              </span>

              <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium">
                RR: {rr > 0 ? `1:${round2(rr)}` : "—"}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(journal.journal_start_at || journal.created_at)}
              </span>
            </div>
          </div>

          <ImageStrip journal={journal} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MiniStat label="Entry" value={journal.entry_price} />
          <MiniStat label="SL" value={journal.stop_loss} />
          <MiniStat
            label="TP"
            value={
              Array.isArray(journal.take_profit) && journal.take_profit.length
                ? journal.take_profit.join(", ")
                : "—"
            }
          />
          <MiniStat label="Risk" value={formatRisk(journal)} />
          <MiniStat label="Qty" value={journal.quantity} />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div className="text-xs text-muted-foreground">
            End: {formatDate(journal.journal_end_at)}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={journal.is_shared}
              onClick={shareJournal}
              className="inline-flex h-9 items-center gap-2 rounded-xl border bg-background px-3 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Share2 className="h-3.5 w-3.5" />
              {journal.is_shared ? "Shared" : "Share"}
            </button>

            {canEditJournal(journal) ? (
              <Link
                href={`/app/journals/${journal.id}/edit`}
                className="inline-flex h-9 items-center gap-2 rounded-xl border bg-background px-3 text-xs font-medium hover:bg-accent"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Link>
            ) : null}

            <button
              type="button"
              onClick={() => setSelectedJournal(journal)}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              <Eye className="h-3.5 w-3.5" />
              Details
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function JournalsGrid({ journals, setSelectedJournal }) {
  return (
    <div className="grid gap-4">
      {journals.map((journal, index) => (
        <JournalCard
          key={journal.id}
          journal={journal}
          index={index}
          setSelectedJournal={setSelectedJournal}
        />
      ))}
    </div>
  );
}

export default function JournalsClient({ journalsByPurpose }) {
  const [selectedJournal, setSelectedJournal] = useState(null);

  return (
    <>
      <div className="space-y-8">
        {journalsByPurpose.map((group) => (
          <section key={group.purpose} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {group.purpose}
              </h2>

              <span className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                {group.data.length}
              </span>
            </div>

            <JournalsGrid
              journals={group.data}
              setSelectedJournal={setSelectedJournal}
            />
          </section>
        ))}
      </div>

      <JournalDetailsModal
        journal={selectedJournal}
        onClose={() => setSelectedJournal(null)}
      />
    </>
  );
}
