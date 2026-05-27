// app/app/metrics/_components/metrics-dashboard.jsx

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  Filter,
  Info,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Trophy,
  Target,
} from "lucide-react";

import MetricCard from "./metric-card";
import {
  DrawdownChart,
  EfficiencyDonut,
  QualityChart,
  RDistributionChart,
} from "./charts";

import {
  buildEquityCurve,
  calculateRMultiple,
  formatR,
  getDrawdowns,
  getSetupType,
  getStats,
  getStrategyName,
  round2,
} from "../_lib/metrics";

import CumulativeREChart from "./cumulative-r-echart";

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

function SmallPanel({ title, children }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
      <div className="mt-4 min-w-0">{children}</div>
    </div>
  );
}

function ClientDate({ value }) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!value) return;

    setText(
      new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(new Date(value)),
    );
  }, [value]);

  return <>{text}</>;
}

function TradeTable({ rows, type }) {
  return (
    <div className="space-y-3">
      {rows.map((j, i) => {
        const r = round2(calculateRMultiple(j));
        const isLoss = type === "loss";

        return (
          <div
            key={j.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-600">
                  {i + 1}
                </div>

                <div className="min-w-0">
                  <div className="text-base font-black text-slate-950">
                    {j.symbols?.symbol_name || "—"}
                  </div>

                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    {getSetupType(j)}
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-700">
                    {getStrategyName(j)}
                  </div>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div
                  className={
                    isLoss
                      ? "text-lg font-black text-orange-500"
                      : "text-lg font-black text-blue-600"
                  }
                >
                  {formatR(r)}
                </div>

                <div className="mt-1 text-xs font-bold text-slate-500">
                  <ClientDate value={j.journal_end_at || j.created_at} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
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
          <SelectBox label="Account" value={accountId} onChange={setAccountId}>
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

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-black text-white">
                LEVEL 1
              </span>
              <span className="text-sm font-bold text-slate-700">
                Overview {expanded ? "+ Expanded Intelligence" : ""}
              </span>
            </div>

            <button
              onClick={() => setExpanded((x) => !x)}
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-600"
            >
              <Sparkles className="h-4 w-4" />
              {expanded ? "Hide Intelligence" : "Expand Intelligence"}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <h2 className="inline-flex items-center gap-2 text-2xl font-black">
              R Curve
            </h2>

            <div className="grid w-full gap-3 md:grid-cols-4 xl:w-auto xl:grid-cols-8">
              <MetricCard
                label="Total R"
                value={formatR(stats.totalR)}
                good={stats.totalR >= 0}
                bad={stats.totalR < 0}
              />
              <MetricCard label="Total Trades" value={stats.totalTrades} />
              <MetricCard
                label="Win Rate"
                value={`${stats.winRate}%`}
                good={stats.winRate >= 50}
              />
              <MetricCard
                label="Expectancy"
                value={formatR(stats.expectancy)}
                good={stats.expectancy > 0}
                bad={stats.expectancy < 0}
              />
              <MetricCard label="Profit Factor" value={stats.profitFactor} />
              <MetricCard
                label="Max Drawdown"
                value={formatR(maxDrawdown)}
                bad={maxDrawdown < 0}
              />
              <MetricCard
                label="Avg Win R"
                value={formatR(stats.avgWin)}
                good
              />
              <MetricCard label="R Efficiency" value={stats.rEfficiency} />
            </div>
          </div>

          <div className="mt-6">
            {curve.length ? (
              <CumulativeREChart data={curve} />
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 p-16 text-center text-sm font-semibold text-slate-500">
                No closed trades yet.
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center gap-4 text-xs font-bold text-slate-500">
            <span className="h-1.5 w-10 rounded-full bg-blue-600" /> Cumulative
            R
            <span className="h-1.5 w-10 rounded-full bg-sky-400" /> Excellion
            Line
            <span className="h-1.5 w-10 rounded-full bg-slate-300" /> Zero Line
          </div>
        </div>
      </section>

      {expanded ? (
        <>
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <span className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-black text-white">
              LEVEL 2
            </span>

            <span className="text-sm font-black text-slate-700">
              Expanded Intelligence
            </span>
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-3">
            <SmallPanel>
              <div className="grid gap-6">
                <RDistributionChart data={distribution} />
                <AvgWinLossBlock stats={stats} />

                <DrawdownIntelligenceBlock
                  maxDrawdown={maxDrawdown}
                  drawdownSeries={drawdownSeries}
                  drawdowns={drawdowns}
                />

                <TradeQualityBlock
                  qualitySeries={qualitySeries}
                  avgQuality={avgQuality}
                />
              </div>
            </SmallPanel>

            <SmallPanel title="Optimal Executions: Top 10 R Wins">
              <TradeTable rows={topWins} type="win" />
            </SmallPanel>

            <SmallPanel title="Suboptimal Executions: Top 10 R Losses">
              <TradeTable rows={topLosses} type="loss" />
            </SmallPanel>
          </div>
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-950">
                AI Behavioral Insights
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              <Insight
                icon={TrendingUp}
                title="R Curve Direction"
                text={`Your selected performance is ${stats.totalR >= 0 ? "positive" : "negative"} at ${formatR(stats.totalR)}.`}
                good={stats.totalR >= 0}
                danger={stats.totalR < 0}
              />

              <Insight
                icon={AlertTriangle}
                title="Drawdown Pressure"
                text={`${drawdowns.length} drawdown zone found. Max drawdown is ${formatR(maxDrawdown)}.`}
                danger={maxDrawdown < 0}
              />

              <Insight
                icon={ShieldCheck}
                title="Risk Quality"
                text={`Profit factor is ${stats.profitFactor}. Expectancy is ${formatR(stats.expectancy)}.`}
              />

              <Insight
                icon={Trophy}
                title="Execution Edge"
                text={`Avg win is ${formatR(stats.avgWin)} and avg loss is -${stats.avgLoss}R.`}
                good
              />

              <Insight
                icon={Target}
                title="Focus Area"
                text={`Win rate is ${stats.winRate}%. Improve low-quality exits and protect high-R trades.`}
              />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Insight({ icon: Icon, title, text, good, danger }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div
        className={[
          "mb-3 flex h-10 w-10 items-center justify-center rounded-2xl",
          good ? "bg-emerald-50 text-emerald-600" : "",
          danger ? "bg-red-50 text-red-600" : "",
          !good && !danger ? "bg-blue-50 text-blue-600" : "",
        ].join(" ")}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="text-sm font-black text-slate-900">{title}</div>
      <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
        {text}
      </p>
    </div>
  );
}

function AvgWinLossBlock({ stats }) {
  return (
    <div className="min-w-0 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="text-sm font-black text-slate-900">Execution Balance</h4>

      <div className="mt-5 grid min-w-0 grid-cols-1 gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-bold text-slate-500">
              Avg Winning R
            </div>
            <div className="mt-2 text-xl font-black text-blue-600">
              {formatR(stats.avgWin)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold text-slate-500">Avg Losing R</div>
            <div className="mt-2 text-xl font-black text-orange-500">
              -{stats.avgLoss}R
            </div>
          </div>
        </div>

        <div className="relative mx-auto flex h-[180px] w-full max-w-[220px] items-center justify-center">
          <EfficiencyDonut value={stats.rEfficiency} />

          <div className="absolute inset-0 flex flex-col items-center justify-center pt-5">
            <div className="text-3xl font-black text-slate-950">
              {stats.rEfficiency}
            </div>
            <div className="mt-10 text-xs font-bold text-slate-500">
              R Efficiency
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DrawdownIntelligenceBlock({ maxDrawdown, drawdownSeries, drawdowns }) {
  const avgDrawdown =
    drawdownSeries.reduce((a, b) => a + b.drawdown, 0) /
    (drawdownSeries.length || 1);

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="text-sm font-black text-slate-900">
        Drawdown Intelligence
      </h4>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
        <div>
          <div className="font-bold text-slate-500">Max DD</div>
          <div className="mt-1 text-lg font-black text-orange-500">
            {formatR(maxDrawdown)}
          </div>
        </div>

        <div>
          <div className="font-bold text-slate-500">Avg DD</div>
          <div className="mt-1 text-lg font-black text-orange-500">
            {formatR(avgDrawdown)}
          </div>
        </div>

        <div>
          <div className="font-bold text-slate-500">DD Zones</div>
          <div className="mt-1 text-lg font-black text-slate-950">
            {drawdowns.length}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <DrawdownChart data={drawdownSeries} />
      </div>
    </div>
  );
}

function TradeQualityBlock({ qualitySeries, avgQuality }) {
  return (
    <div className="min-w-0 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="text-sm font-black text-slate-900">
        Trade Quality Over Time
      </h4>

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-3">
        <div className="min-w-0">
          <QualityChart data={qualitySeries} />
        </div>

        <div className="flex min-h-[120px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-bold text-slate-500">Avg Quality</div>
          <div className="mt-2 text-4xl font-black text-slate-950">
            {avgQuality}
          </div>
          <div className="text-sm font-black text-blue-600">Good</div>
        </div>
      </div>
    </div>
  );
}
