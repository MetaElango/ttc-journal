// app/app/metrics/_components/metrics-dashboard.jsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";

import {
  buildEquityCurve,
  calculateRMultiple,
  getDrawdowns,
  getSetupType,
  getStats,
  round2,
} from "../_lib/metrics";

import PerformanceTab from "./performance-tab";
import BehaviorDetectionTab from "./behavior-detection-tab";
import ExecutionIntegrityTab from "./execution-integrity-tab";

function SelectBox({ label, value, onChange, children }) {
  return (
    <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="mb-1 text-[11px] font-bold uppercase text-slate-500">
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function buildDistribution(closed) {
  const buckets = [
    { bucket: "<-4R", min: -Infinity, max: -4, tone: "bad" },
    { bucket: "-4R to -2R", min: -4, max: -2, tone: "bad" },
    { bucket: "-2R to -1R", min: -2, max: -1, tone: "bad" },
    { bucket: "-1R to 0R", min: -1, max: 0, tone: "mid" },
    { bucket: "0R to 1R", min: 0, max: 1, tone: "good" },
    { bucket: "1R to 2R", min: 1, max: 2, tone: "good" },
    { bucket: "2R to 4R", min: 2, max: 4, tone: "good" },
    { bucket: ">4R", min: 4, max: Infinity, tone: "good" },
  ];

  return buckets.map((b) => ({
    ...b,
    count: closed.filter((j) => {
      const r = calculateRMultiple(j);
      return r >= b.min && r < b.max;
    }).length,
  }));
}

function buildDrawdownSeries(curve) {
  let peak = 0;
  return curve.map((p) => {
    peak = Math.max(peak, p.cumulativeR);
    return {
      ...p,
      drawdown: round2(p.cumulativeR - peak),
    };
  });
}

function buildQualitySeries(curve) {
  return curve.map((p) => ({
    ...p,
    score: Math.max(10, Math.min(100, Math.round(65 + p.r * 12))),
  }));
}

export default function MetricsDashboard({ journals, accounts, strategies }) {
  const [accountId, setAccountId] = useState("all");
  const [strategyId, setStrategyId] = useState("all");
  const [setupType, setSetupType] = useState("all");
  const [expanded, setExpanded] = useState(true);
  const [dateRange, setDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("performance");

  const setupTypes = useMemo(() => {
    return Array.from(
      new Set(
        journals.map((j) => getSetupType(j)).filter((x) => x && x !== "—"),
      ),
    );
  }, [journals]);

  const filtered = useMemo(() => {
    const now = new Date();

    return journals.filter((j) => {
      if (accountId !== "all" && j.trading_account_id !== accountId)
        return false;
      if (strategyId !== "all" && j.strategy_id !== strategyId) return false;
      if (setupType !== "all" && getSetupType(j) !== setupType) return false;

      const tradeDate = new Date(j.journal_end_at || j.created_at);

      if (dateRange === "7d") {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        if (tradeDate < start) return false;
      }

      if (dateRange === "30d") {
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        if (tradeDate < start) return false;
      }

      if (dateRange === "90d") {
        const start = new Date(now);
        start.setDate(start.getDate() - 90);
        if (tradeDate < start) return false;
      }

      if (dateRange === "this_year") {
        const start = new Date(now.getFullYear(), 0, 1);
        if (tradeDate < start) return false;
      }
      if (dateRange === "custom") {
        if (customStartDate) {
          const start = new Date(`${customStartDate}T00:00:00`);
          if (tradeDate < start) return false;
        }

        if (customEndDate) {
          const end = new Date(`${customEndDate}T23:59:59`);
          if (tradeDate > end) return false;
        }
      }
      return true;
    });
  }, [
    journals,
    accountId,
    strategyId,
    setupType,
    dateRange,
    customStartDate,
    customEndDate,
  ]);

  const curve = useMemo(() => buildEquityCurve(filtered), [filtered]);
  const stats = useMemo(() => getStats(filtered), [filtered]);
  const drawdowns = useMemo(() => getDrawdowns(curve), [curve]);
  const distribution = useMemo(
    () => buildDistribution(stats.closed),
    [stats.closed],
  );
  const drawdownSeries = useMemo(() => buildDrawdownSeries(curve), [curve]);
  const qualitySeries = useMemo(() => buildQualitySeries(curve), [curve]);

  const topWins = [...stats.closed]
    .sort((a, b) => calculateRMultiple(b) - calculateRMultiple(a))
    .slice(0, 10);

  const topLosses = [...stats.closed]
    .sort((a, b) => calculateRMultiple(a) - calculateRMultiple(b))
    .slice(0, 10);

  const maxDrawdown = drawdowns.length ? drawdowns[0].drawdown : 0;
  const avgQuality =
    qualitySeries.length > 0
      ? Math.round(
          qualitySeries.reduce((a, b) => a + b.score, 0) / qualitySeries.length,
        )
      : 0;

  return (
    <div className="space-y-5 rounded-[2rem] bg-slate-50 p-4 text-slate-950">
      <div className="sticky top-0 z-50 -mx-4 border-b border-slate-200 bg-slate-50/90 px-4 py-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Trader's Mirror
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Reflect. Refine. Execute.
            </p>
          </div>

          <div className="grid flex-1 gap-3 md:max-w-5xl md:grid-cols-5">
            <SelectBox
              label="Account"
              value={accountId}
              onChange={setAccountId}
            >
              <option value="all">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name}
                </option>
              ))}
            </SelectBox>

            <SelectBox
              label="Strategy"
              value={strategyId}
              onChange={setStrategyId}
            >
              <option value="all">All Strategies</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.strategy_name}
                </option>
              ))}
            </SelectBox>

            <SelectBox label="Setup" value={setupType} onChange={setSetupType}>
              <option value="all">All Setups</option>
              {setupTypes.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </SelectBox>

            <SelectBox
              label="Date Range"
              value={dateRange}
              onChange={setDateRange}
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Range</option>
            </SelectBox>
            {dateRange === "custom" ? (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none"
                />

                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold shadow-sm outline-none"
                />
              </>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setAccountId("all");
                setStrategyId("all");
                setSetupType("all");
                setDateRange("all");
                setCustomStartDate("");
                setCustomEndDate("");
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold shadow-sm"
            >
              <Filter className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex flex-wrap gap-3">
            {[
              {
                id: "performance",
                label: "Performance Overview",
              },
              {
                id: "behavior",
                label: "Behavioral Intelligence",
              },
              {
                id: "execution",

                label: "Execution Integrity",
              },
              // {
              //   id: "execution",
              //   label: "Execution Analytics",
              // },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "rounded-2xl px-5 py-3 text-sm font-black transition-all",
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "performance" && (
        <PerformanceTab
          expanded={expanded}
          setExpanded={setExpanded}
          stats={stats}
          curve={curve}
          maxDrawdown={maxDrawdown}
          distribution={distribution}
          drawdownSeries={drawdownSeries}
          drawdowns={drawdowns}
          qualitySeries={qualitySeries}
          avgQuality={avgQuality}
          topWins={topWins}
          topLosses={topLosses}
        />
      )}
      {activeTab === "behavior" && <BehaviorDetectionTab journals={filtered} />}

      {activeTab === "execution" && (
        <ExecutionIntegrityTab journals={filtered} />
      )}
    </div>
  );
}
