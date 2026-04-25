"use client";

import { useState } from "react";
import Link from "next/link";
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

function shortText(value, max = 24) {
  const text = String(value || "—");
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
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

function JournalsTable({ journals, setSelectedJournal }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="relative w-full min-w-[1030px] table-fixed text-sm">
        <thead className="bg-background">
          <tr className="border-b">
            <th className="sticky left-0 z-30 w-[240px] bg-background px-4 py-3 text-left font-medium shadow-[2px_0_5px_rgba(0,0,0,0.08)]">
              Strategy
            </th>
            <th className="w-[120px] bg-background px-4 py-3 text-left font-medium">
              Symbol
            </th>
            <th className="w-[120px] bg-background px-4 py-3 text-left font-medium">
              Direction
            </th>
            <th className="w-[160px] bg-background px-4 py-3 text-left font-medium">
              Trading Style
            </th>
            <th className="w-[140px] bg-background px-4 py-3 text-left font-medium">
              Setup
            </th>
            <th className="w-[120px] bg-background px-4 py-3 text-left font-medium">
              Entry
            </th>
            <th className="w-[120px] bg-background px-4 py-3 text-left font-medium">
              SL
            </th>
            <th className="w-[120px] bg-background px-4 py-3 text-left font-medium">
              Risk
            </th>
            <th className="w-[100px] bg-background px-4 py-3 text-left font-medium">
              RR
            </th>
            <th className="sticky right-[104px] z-30 w-[104px] bg-background px-4 py-3 text-left font-medium shadow-[-2px_0_5px_rgba(0,0,0,0.08)]">
              Edit
            </th>
            <th className="sticky right-0 z-30 w-[104px] bg-background px-4 py-3 text-left font-medium shadow-[-2px_0_5px_rgba(0,0,0,0.08)]">
              Details
            </th>
          </tr>
        </thead>

        <tbody>
          {journals.map((j) => {
            const strategyName = j?.strategy_snapshot?.strategy_name || "—";
            const tradingStyle = j?.strategy_snapshot?.trading_style || "—";
            const setup = j?.strategy_snapshot?.setup_type || "—";
            const symbol = j?.symbols?.symbol_name || "—";
            const rr = calculatePlannedRR(j);

            return (
              <tr key={j.id} className="border-b last:border-b-0">
                <td className="sticky left-0 z-20 w-[240px] bg-background px-4 py-3 font-medium shadow-[2px_0_5px_rgba(0,0,0,0.08)]">
                  {shortText(strategyName, 26)}
                </td>

                <td className="w-[120px] px-4 py-3">{symbol}</td>
                <td className="w-[120px] px-4 py-3">{j.direction || "—"}</td>
                <td className="w-[160px] px-4 py-3">{tradingStyle}</td>
                <td className="w-[140px] px-4 py-3">{setup}</td>
                <td className="w-[120px] px-4 py-3">{j.entry_price ?? "—"}</td>
                <td className="w-[120px] px-4 py-3">{j.stop_loss ?? "—"}</td>
                <td className="w-[120px] px-4 py-3">{formatRisk(j)}</td>
                <td className="w-[100px] px-4 py-3">
                  {rr > 0 ? `1:${round2(rr)}` : "—"}
                </td>

                <td className="sticky right-[104px] z-20 w-[104px] bg-background px-4 py-3 shadow-[-2px_0_5px_rgba(0,0,0,0.08)]">
                  {canEditJournal(j) ? (
                    <Link
                      href={`/app/journals/${j.id}/edit`}
                      className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                    >
                      Edit
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>

                <td className="sticky right-0 z-20 w-[104px] bg-background px-4 py-3 shadow-[-2px_0_5px_rgba(0,0,0,0.08)]">
                  <button
                    type="button"
                    onClick={() => setSelectedJournal(j)}
                    className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    Details
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
            <h2 className="px-1 text-sm font-semibold text-muted-foreground">
              {group.purpose} ({group.data.length})
            </h2>

            <JournalsTable
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
