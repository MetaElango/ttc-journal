"use client";

import { useState } from "react";
import JournalDetailsModal from "../journals/journal-details-modal";

function norm(v) {
  return String(v || "")
    .trim()
    .toUpperCase();
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

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function formatTP(tp = [], qty = []) {
  if (!Array.isArray(tp) || tp.length === 0) return "—";

  if (Array.isArray(qty) && qty.length === tp.length) {
    return tp.map((p, i) => `${p} (${qty[i] ?? "—"})`).join(", ");
  }

  return tp.join(", ");
}

function shortText(value, max = 60) {
  const text = String(value || "—");
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

export default function SocialClient({ journals }) {
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [copyingId, setCopyingId] = useState(null);

  async function incorporateJournal(journalId) {
    setCopyingId(journalId);

    try {
      const res = await fetch("/api/journals/incorporate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ journalId }),
      });

      const json = await res.json();

      if (!json.ok) {
        alert(json.message || "Failed to incorporate journal.");
        return;
      }

      alert("Journal incorporated into your dashboard.");
    } finally {
      setCopyingId(null);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Social</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shared journals from other traders
          </p>
        </div>

        {journals.length === 0 ? (
          <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
            No shared journals yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {journals.map((journal) => {
              const strategy = journal.strategy_snapshot || {};
              const symbol = journal.symbols
                ? `${journal.symbols.symbol_name} — ${journal.symbols.category}`
                : "—";

              const author = "Trader";

              const rr = calculatePlannedRR(journal);

              return (
                <div key={journal.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div>
                        <h2 className="text-lg font-semibold">
                          {strategy.strategy_name || "Shared Journal"}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Shared by {author}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border px-2 py-1">
                          {journal.purpose || "—"}
                        </span>
                        <span className="rounded-full border px-2 py-1">
                          {journal.status || "No status"}
                        </span>
                        <span className="rounded-full border px-2 py-1">
                          {symbol}
                        </span>
                        <span className="rounded-full border px-2 py-1">
                          {journal.direction || "—"}
                        </span>
                        <span className="rounded-full border px-2 py-1">
                          RR: {rr > 0 ? `1:${round2(rr)}` : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedJournal(journal)}
                        className="rounded-md border px-3 py-2 text-sm hover:bg-accent"
                      >
                        Details
                      </button>

                      <button
                        type="button"
                        disabled={copyingId === journal.id}
                        onClick={() => incorporateJournal(journal.id)}
                        className="rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                      >
                        {copyingId === journal.id
                          ? "Copying..."
                          : "Incorporate"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">Entry</div>
                      <div className="mt-1 text-sm font-medium">
                        {journal.entry_price ?? "—"}
                      </div>
                    </div>

                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">SL</div>
                      <div className="mt-1 text-sm font-medium">
                        {journal.stop_loss ?? "—"}
                      </div>
                    </div>

                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">TP</div>
                      <div className="mt-1 text-sm font-medium">
                        {formatTP(journal.take_profit, journal.take_profit_qty)}
                      </div>
                    </div>

                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">
                        Entry Reason
                      </div>
                      <div className="mt-1 text-sm font-medium">
                        {shortText(journal.entry_reason, 80)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <JournalDetailsModal
        journal={selectedJournal}
        onClose={() => setSelectedJournal(null)}
      />
    </>
  );
}
