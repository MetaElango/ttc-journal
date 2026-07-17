"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Target } from "lucide-react";

const CLOSED_STATUSES = [
  "TRADE CLOSE WITH PROFIT",
  "TRADE EXIT IN MID",
  "TRADE SL HIT",
];

const WIN_STATUSES = ["TRADE CLOSE WITH PROFIT"];
const LOSS_STATUSES = ["TRADE SL HIT"];

function norm(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function isShortDirection(journal) {
  const direction = norm(journal?.direction);
  return (
    direction.includes("SELL") ||
    direction.includes("SHORT") ||
    direction.includes("BEAR")
  );
}

function formatDateLabel(date) {
  if (!date) return "—";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function getTradeR(journal) {
  const status = norm(journal.status);

  if (LOSS_STATUSES.includes(status)) return -1;

  const entry = Number(journal.entry_price);
  const stop = Number(journal.stop_loss);
  const exit = Number(journal.exit_price || journal.take_profit?.[0]);

  if (!entry || !stop || !exit || entry === stop) return 0;

  const risk = Math.abs(entry - stop);
  const result = isShortDirection(journal) ? entry - exit : exit - entry;

  if (WIN_STATUSES.includes(status) || status === "TRADE EXIT IN MID") {
    return Number((result / risk).toFixed(2));
  }

  return 0;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl">
      <p className="font-semibold text-slate-950">{item.date}</p>
      <p className="mt-1 text-slate-600">{item.symbol}</p>
      <p className="mt-1 text-slate-500">{item.status}</p>
      <p
        className={`mt-1 font-semibold ${
          item.tradeR >= 0 ? "text-emerald-600" : "text-red-600"
        }`}
      >
        {item.tradeR > 0 ? "+" : ""}
        {item.tradeR}R / Total {item.cumulativeR > 0 ? "+" : ""}
        {item.cumulativeR}R
      </p>
    </div>
  );
}

export default function PerformanceOverview({ journals }) {
  console.log("PerformanceOverview journals", journals);
  let runningR = 0;

  const data = journals
    .filter((journal) => CLOSED_STATUSES.includes(norm(journal.status)))
    .slice(0, 28)
    .reverse()
    .map((journal) => {
      const tradeR = getTradeR(journal);
      runningR += tradeR;

      return {
        id: journal.id,
        date: formatDateLabel(journal.created_at),
        symbol: journal.symbols?.symbol_name || "No symbol",
        status: journal.status,
        tradeR,
        cumulativeR: Number(runningR.toFixed(2)),
      };
    });

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            <h2 className="text-[17px] font-semibold text-slate-950">
              Performance Overview
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Your cumulative R performance from closed trades
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
          <p className="text-[11px] text-slate-500">Total R</p>
          <p
            className={`text-sm font-semibold ${
              runningR >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {runningR > 0 ? "+" : ""}
            {runningR.toFixed(2)}R
          </p>
        </div>
      </div>

      <div className="h-[255px] rounded-[18px] bg-gradient-to-b from-slate-50 to-white p-3">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No closed trades yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}R`} />
              <ReferenceLine y={0} stroke="#0f172a" />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="cumulativeR"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Showing your latest {data.length} closed journal outcomes
      </p>
    </div>
  );
}
