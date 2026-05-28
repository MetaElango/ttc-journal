// app/app/insights/_components/duration-exposure-tab.jsx

"use client";

import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Clock,
  Gauge,
  Info,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";

import {
  calculateRMultiple,
  formatR,
  getSetupType,
  getStrategyName,
  round2,
} from "../_lib/metrics";

const C = {
  blue: "#2563eb",
  cyan: "#06b6d4",
  orange: "#f97316",
  green: "#059669",
  slate200: "#e2e8f0",
  slate500: "#64748b",
};

function InfoTip({ title, text, good, normal, danger }) {
  return (
    <span className="group/tip relative inline-flex shrink-0">
      <Info className="h-4 w-4 cursor-help text-slate-400" />

      <span className="pointer-events-none absolute left-1/2 top-8 z-[99999] w-80 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 text-left text-xs font-semibold leading-5 text-slate-600 opacity-0 shadow-2xl transition-all duration-150 group-hover/tip:opacity-100">
        <span className="block text-sm font-black text-slate-950">{title}</span>
        <span className="mt-2 block">{text}</span>
        <span className="mt-3 block text-blue-600">Good: {good}</span>
        <span className="mt-1 block text-slate-600">Normal: {normal}</span>
        <span className="mt-1 block text-orange-600">Danger: {danger}</span>
      </span>
    </span>
  );
}

function getTradeDate(j) {
  return new Date(j.journal_end_at || j.created_at);
}

function getStartDate(j) {
  return new Date(j.journal_start_at || j.created_at);
}

function getSymbol(j) {
  return j?.symbols?.symbol_name || "—";
}

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function getDurationHours(j) {
  const start = getStartDate(j);
  const end = getTradeDate(j);
  const diff = (end.getTime() - start.getTime()) / 1000 / 60 / 60;
  return Math.max(0, diff);
}

function formatDuration(hours) {
  if (!hours) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${round2(hours)}h`;
  return `${round2(hours / 24)}d`;
}

function getNormalizedRisk(j) {
  const risk = Number(j.risk_per_trade || 0);
  const mode = String(j.risk_mode || "").toUpperCase();

  if (!risk) return 0;

  if (mode === "PERCENT") return risk;

  if (mode === "AMOUNT") {
    const accountSize = Number(j.trading_accounts?.account_size || 0);
    if (!accountSize) return 0;
    return (risk / accountSize) * 100;
  }

  return risk;
}

function getRiskUsd(j) {
  const risk = Number(j.risk_per_trade || 0);
  const mode = String(j.risk_mode || "").toUpperCase();
  const accountSize = Number(j.trading_accounts?.account_size || 0);

  if (!risk) return 0;
  if (mode === "AMOUNT") return risk;
  if (mode === "PERCENT" && accountSize > 0) return (risk / 100) * accountSize;

  return 0;
}

function getAssetClass(j) {
  const category = String(j.symbols?.category || "").toLowerCase();
  const symbol = getSymbol(j).toUpperCase();

  if (category.includes("crypto")) return "Crypto";
  if (category.includes("index")) return "Indices";
  if (category.includes("commodity")) return "Commodities";
  if (symbol.includes("XAU") || symbol.includes("GOLD")) return "Gold";
  if (symbol.includes("BTC") || symbol.includes("ETH")) return "Crypto";
  if (symbol.includes("US") || symbol.includes("USD")) return "USD / Forex";
  if (symbol.length <= 7) return "Forex";

  return "Others";
}

function getDurationBucket(hours) {
  if (hours <= 0.25) return "0–15m";
  if (hours <= 0.5) return "15–30m";
  if (hours <= 1) return "30–60m";
  if (hours <= 2) return "1–2h";
  if (hours <= 4) return "2–4h";
  if (hours <= 8) return "4–8h";
  if (hours <= 16) return "8–16h";
  if (hours <= 24) return "16h–1D";
  if (hours <= 72) return "1D–3D";
  if (hours <= 168) return "3D–1W";
  return "1W+";
}

const BUCKET_ORDER = [
  "0–15m",
  "15–30m",
  "30–60m",
  "1–2h",
  "2–4h",
  "4–8h",
  "8–16h",
  "16h–1D",
  "1D–3D",
  "3D–1W",
  "1W+",
];

function getClosedTrades(journals) {
  return [...journals]
    .filter((j) => calculateRMultiple(j) !== 0)
    .sort((a, b) => getTradeDate(a) - getTradeDate(b));
}

function isActiveTrade(j) {
  const status = String(j.status || "").toUpperCase();

  return [
    "ENTRY PLANNED",
    "ENTRY PLACED",
    "ENTRY TRIGGERED",
    "RUNNING TRADE",
  ].includes(status);
}

function detectDurationExposure(journals) {
  const closedRaw = getClosedTrades(journals);

  let cumulativeR = 0;

  const closed = closedRaw.map((j) => {
    const r = round2(calculateRMultiple(j));
    const durationHours = getDurationHours(j);

    cumulativeR = round2(cumulativeR + r);

    return {
      id: j.id,
      journal: j,
      date: getTradeDate(j).toISOString().slice(5, 10),
      symbol: getSymbol(j),
      direction: String(j.direction || "—").toUpperCase(),
      status: j.status,
      strategy: getStrategyName(j),
      setup: getSetupType(j),
      r,
      durationHours,
      duration: formatDuration(durationHours),
      bucket: getDurationBucket(durationHours),
      riskPercent: round2(getNormalizedRisk(j)),
      riskUsd: round2(getRiskUsd(j)),
      cumulativeR,
      assetClass: getAssetClass(j),
    };
  });

  const wins = closed.filter((t) => t.r > 0);
  const losses = closed.filter((t) => t.r < 0);

  const totalTrades = closed.length;
  const totalR = round2(closed.reduce((a, b) => a + b.r, 0));
  const winRate = totalTrades
    ? Math.round((wins.length / totalTrades) * 100)
    : 0;
  const avgWinR = round2(avg(wins.map((t) => t.r)));
  const avgLossR = round2(Math.abs(avg(losses.map((t) => t.r))));

  const grossWinR = wins.reduce((a, b) => a + b.r, 0);
  const grossLossR = Math.abs(losses.reduce((a, b) => a + b.r, 0));
  const profitFactor =
    grossLossR > 0 ? round2(grossWinR / grossLossR) : wins.length ? 99 : 0;

  const totalHoursHeld = round2(
    closed.reduce((a, b) => a + b.durationHours, 0),
  );
  const durationEfficiency =
    totalHoursHeld > 0 ? round2(totalR / totalHoursHeld) : 0;

  const avgWinnerHours = round2(avg(wins.map((t) => t.durationHours)));
  const avgLoserHours = round2(avg(losses.map((t) => t.durationHours)));
  const emotionalHoldingRatio =
    avgWinnerHours > 0 ? round2(avgLoserHours / avgWinnerHours) : 0;

  const bucketStats = BUCKET_ORDER.map((bucket) => {
    const rows = closed.filter((t) => t.bucket === bucket);
    const bucketWins = rows.filter((t) => t.r > 0);
    const bucketLosses = rows.filter((t) => t.r < 0);
    const bucketTotalR = round2(rows.reduce((a, b) => a + b.r, 0));
    const bucketGrossWin = bucketWins.reduce((a, b) => a + b.r, 0);
    const bucketGrossLoss = Math.abs(bucketLosses.reduce((a, b) => a + b.r, 0));

    return {
      bucket,
      trades: rows.length,
      winRate: rows.length
        ? Math.round((bucketWins.length / rows.length) * 100)
        : 0,
      avgR: rows.length ? round2(bucketTotalR / rows.length) : 0,
      totalR: bucketTotalR,
      expectancy: rows.length ? round2(bucketTotalR / rows.length) : 0,
      profitFactor:
        bucketGrossLoss > 0
          ? round2(bucketGrossWin / bucketGrossLoss)
          : bucketWins.length
            ? 99
            : 0,
    };
  });

  const bestAvgRBucket = [...bucketStats]
    .filter((b) => b.trades > 0)
    .sort((a, b) => b.avgR - a.avgR)[0];

  const bestWinRateBucket = [...bucketStats]
    .filter((b) => b.trades > 0)
    .sort((a, b) => b.winRate - a.winRate)[0];

  const durationCurve = bucketStats.map((b) => ({
    ...b,
    avgR: round2(b.avgR),
  }));

  let bucketCum = 0;
  const rCollectionCurve = bucketStats.map((b) => {
    bucketCum = round2(bucketCum + b.totalR);
    return {
      bucket: b.bucket,
      cumulativeR: bucketCum,
      totalR: b.totalR,
    };
  });

  const earlyExitRisk = Math.round(
    Math.min(
      100,
      closed.filter((t) => t.r > 0 && t.durationHours < avgWinnerHours * 0.5)
        .length * 12,
    ),
  );

  const overholdingRisk = Math.round(
    Math.min(
      100,
      losses.filter((t) => t.durationHours > avgWinnerHours * 1.5).length * 12,
    ),
  );

  const active = journals.filter(isActiveTrade).map((j) => ({
    id: j.id,
    symbol: getSymbol(j),
    direction: String(j.direction || "—").toUpperCase(),
    type: String(j.purpose || "—"),
    strategy: getStrategyName(j),
    status: j.status,
    entry: Number(j.entry_price || 0),
    sl: Number(j.modified_sl_price || j.stop_loss || 0),
    riskPercent: round2(getNormalizedRisk(j)),
    riskUsd: round2(getRiskUsd(j)),
    assetClass: getAssetClass(j),
  }));

  const totalActiveExposure = round2(
    active.reduce((a, b) => a + b.riskPercent, 0),
  );
  const projectedExposure = round2(totalActiveExposure);
  const maxExposureLimit = 6;
  const exposureUsedPercent = Math.min(
    100,
    round2((totalActiveExposure / maxExposureLimit) * 100),
  );
  const availableRiskRoom = round2(
    Math.max(0, maxExposureLimit - totalActiveExposure),
  );

  const accountBalance = round2(
    avg(
      journals
        .map((j) => Number(j.trading_accounts?.account_size || 0))
        .filter(Boolean),
    ),
  );

  const maxDrawdownLimit = 10;
  const dailyDrawdownLimit = 5;
  const currentDDUsed = round2(
    Math.min(maxDrawdownLimit, Math.abs(Math.min(0, totalR))),
  );

  const exposureTrend = closed.slice(-14).map((t, index) => ({
    date: t.date,
    actualExposure: round2(t.riskPercent),
    projectedExposure: round2(t.riskPercent + totalActiveExposure),
    ideal: 40,
    warning: 70,
    max: 100,
    index,
  }));

  const assetExposureMap = {};

  active.forEach((a) => {
    if (!assetExposureMap[a.assetClass]) {
      assetExposureMap[a.assetClass] = {
        assetClass: a.assetClass,
        exposure: 0,
        trades: 0,
      };
    }

    assetExposureMap[a.assetClass].exposure += a.riskPercent;
    assetExposureMap[a.assetClass].trades += 1;
  });

  const correlationBars = Object.values(assetExposureMap).map((x) => ({
    ...x,
    exposure: round2(x.exposure),
  }));

  const highestCorrelation = [...correlationBars].sort(
    (a, b) => b.exposure - a.exposure,
  )[0];

  const exposureStatus =
    exposureUsedPercent >= 70
      ? "High Risk"
      : exposureUsedPercent >= 40
        ? "Moderate"
        : "Safe";

  const opportunityDecision =
    exposureUsedPercent >= 70
      ? "Trade exceeds safe exposure."
      : exposureUsedPercent >= 40
        ? "Trade can be taken only with reduced risk."
        : "Trade can be safely taken.";

  const recommendedAction =
    exposureUsedPercent >= 70
      ? "Reduce exposure before adding new trades."
      : highestCorrelation?.exposure >= 4
        ? `Avoid stacking more ${highestCorrelation.assetClass} exposure.`
        : "Exposure is within safe range.";

  return {
    closed,
    active,
    totalTrades,
    totalR,
    winRate,
    avgWinR,
    avgLossR,
    profitFactor,
    durationEfficiency,
    avgWinnerHours,
    avgLoserHours,
    emotionalHoldingRatio,
    bucketStats,
    durationCurve,
    rCollectionCurve,
    bestAvgRBucket,
    bestWinRateBucket,
    earlyExitRisk,
    overholdingRisk,
    accountBalance,
    maxDrawdownLimit,
    dailyDrawdownLimit,
    currentDDUsed,
    totalActiveExposure,
    projectedExposure,
    exposureUsedPercent,
    availableRiskRoom,
    exposureTrend,
    correlationBars,
    highestCorrelation,
    exposureStatus,
    opportunityDecision,
    recommendedAction,
  };
}

function KpiCard({ icon: Icon, label, value, sub, info, danger, warning }) {
  return (
    <div className="relative z-0 overflow-visible rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:z-50 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-500">
            <span>{label}</span>
            {info ? <InfoTip {...info} /> : null}
          </div>

          <div
            className={[
              "mt-3 text-2xl font-black",
              danger
                ? "text-orange-500"
                : warning
                  ? "text-cyan-600"
                  : "text-blue-600",
            ].join(" ")}
          >
            {value}
          </div>

          <div className="mt-1 text-xs font-bold text-slate-500">{sub}</div>
        </div>

        <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, info, children }) {
  return (
    <section className="relative z-0 overflow-visible rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm hover:z-50">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        {info ? <InfoTip {...info} /> : null}
      </div>

      <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Stat({ label, value, info, danger, warning }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-500">
        <span>{label}</span>
        {info ? <InfoTip {...info} /> : null}
      </div>

      <div
        className={[
          "mt-2 text-2xl font-black",
          danger
            ? "text-orange-500"
            : warning
              ? "text-cyan-600"
              : "text-blue-600",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

export default function DurationExposureTab({ journals }) {
  const engine = useMemo(() => detectDurationExposure(journals), [journals]);

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-black text-blue-600">
          <Clock className="h-4 w-4" />
          DURATION & EXPOSURE
        </div>

        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
          Duration & Exposure Intelligence
        </h1>

        <p className="mt-2 text-sm font-medium text-slate-500">
          Analyze holding behavior, position efficiency, and account exposure
          stability.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Activity}
          label="Total Trades"
          value={engine.totalTrades}
          sub="Closed trades"
          info={{
            title: "Total Trades",
            text: "Total closed trades from the selected filters.",
            good: "20+ trades gives better reliability.",
            normal: "10 to 20 trades is usable.",
            danger: "Below 10 trades can be misleading.",
          }}
        />

        <KpiCard
          icon={TrendingUp}
          label="Total R"
          value={formatR(engine.totalR)}
          sub="Collected R"
          info={{
            title: "Total R",
            text: "Net R collected from all closed trades.",
            good: "Positive and steadily growing.",
            normal: "Near breakeven or mixed.",
            danger: "Negative R means performance damage.",
          }}
          danger={engine.totalR < 0}
        />

        <KpiCard
          icon={Target}
          label="Win Rate"
          value={`${engine.winRate}%`}
          sub="Closed trades"
          info={{
            title: "Win Rate",
            text: "Percentage of closed trades that ended positive.",
            good: "50%+ with positive expectancy.",
            normal: "40% to 50%.",
            danger: "Below 40% needs review.",
          }}
          warning={engine.winRate < 50}
          danger={engine.winRate < 40}
        />

        <KpiCard
          icon={TrendingUp}
          label="Avg Win R"
          value={formatR(engine.avgWinR)}
          sub="Winner average"
          info={{
            title: "Avg Win R",
            text: "Average R collected from winning trades.",
            good: "Above 1.5R.",
            normal: "1R to 1.5R.",
            danger: "Below 1R means winners may be too small.",
          }}
        />

        <KpiCard
          icon={TrendingDown}
          label="Avg Loss R"
          value={`-${engine.avgLossR}R`}
          sub="Loser average"
          info={{
            title: "Avg Loss R",
            text: "Average R lost from losing trades.",
            good: "Below -1R or controlled around -1R.",
            normal: "Around -1R.",
            danger: "Worse than -1.5R means losses are overheld.",
          }}
          danger={engine.avgLossR > 1.5}
          warning={engine.avgLossR > engine.avgWinR}
        />

        <KpiCard
          icon={Gauge}
          label="Profit Factor"
          value={engine.profitFactor}
          sub="Gross win / gross loss"
          info={{
            title: "Profit Factor",
            text: "Gross winning R divided by gross losing R.",
            good: "Above 1.5.",
            normal: "1.0 to 1.5.",
            danger: "Below 1.0 means losses exceed wins.",
          }}
          danger={engine.profitFactor < 1}
          warning={engine.profitFactor >= 1 && engine.profitFactor < 1.5}
        />

        <KpiCard
          icon={Zap}
          label="Exposure Used"
          value={`${engine.exposureUsedPercent}%`}
          sub={engine.exposureStatus}
          info={{
            title: "Exposure Used",
            text: "How much of your max exposure limit is currently used.",
            good: "0% to 40%.",
            normal: "40% to 70%.",
            danger: "70%+ is high risk.",
          }}
          danger={engine.exposureUsedPercent >= 70}
          warning={engine.exposureUsedPercent >= 40}
        />

        <KpiCard
          icon={ShieldCheck}
          label="Available Risk Room"
          value={`${engine.availableRiskRoom}%`}
          sub="Before max risk limit"
          info={{
            title: "Available Risk Room",
            text: "Remaining risk capacity before reaching max exposure limit.",
            good: "More than 3%.",
            normal: "1% to 3%.",
            danger: "Below 1% means limited room.",
          }}
          warning={engine.availableRiskRoom <= 3}
          danger={engine.availableRiskRoom <= 1}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Panel
          title="Duration Intelligence"
          subtitle="Measures how holding duration impacts win rate, expectancy, and R collection."
          info={{
            title: "Duration Intelligence",
            text: "Shows which holding windows produce the best average R.",
            good: "Best bucket has positive average R and enough trades.",
            normal: "Mixed buckets with no clear edge.",
            danger: "Long holds or very short holds consistently lose R.",
          }}
        >
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={engine.durationCurve}>
              <CartesianGrid vertical={false} stroke={C.slate200} />
              <XAxis
                dataKey="bucket"
                tick={{ fontSize: 10 }}
                stroke={C.slate500}
              />
              <YAxis tick={{ fontSize: 11 }} stroke={C.slate500} />
              <Tooltip />
              <ReferenceLine y={0} stroke={C.slate500} />
              <Bar dataKey="avgR" name="Avg R" radius={[10, 10, 0, 0]}>
                {engine.durationCurve.map((x) => (
                  <Cell key={x.bucket} fill={x.avgR >= 0 ? C.blue : C.orange} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title="Duration Intelligence Cards"
          subtitle="Best hold window, emotional holding, and duration efficiency."
          info={{
            title: "Duration Intelligence Cards",
            text: "Quick read of best duration zone and holding behavior.",
            good: "Winners and losers have balanced hold time.",
            normal: "Some hold-time imbalance.",
            danger: "Losers held much longer than winners.",
          }}
        >
          <div className="grid gap-3">
            <Stat
              label="Optimal Hold Duration"
              value={engine.bestAvgRBucket?.bucket || "—"}
              info={{
                title: "Optimal Hold Duration",
                text: "Duration bucket with the highest average R.",
                good: "Positive average R.",
                normal: "Small positive or breakeven R.",
                danger: "No profitable duration bucket.",
              }}
            />

            <Stat
              label="Best Avg R Range"
              value={
                engine.bestAvgRBucket
                  ? formatR(engine.bestAvgRBucket.avgR)
                  : "—"
              }
              info={{
                title: "Best Avg R Range",
                text: "Best average R from duration buckets.",
                good: "Above 1R.",
                normal: "0R to 1R.",
                danger: "Below 0R.",
              }}
            />

            <Stat
              label="Best Win Rate Range"
              value={
                engine.bestWinRateBucket
                  ? `${engine.bestWinRateBucket.bucket} / ${engine.bestWinRateBucket.winRate}%`
                  : "—"
              }
              info={{
                title: "Best Win Rate Range",
                text: "Duration bucket with the highest win rate.",
                good: "60%+.",
                normal: "45% to 60%.",
                danger: "Below 45%.",
              }}
            />

            <Stat
              label="Avg Winner Hold"
              value={formatDuration(engine.avgWinnerHours)}
              info={{
                title: "Avg Winner Hold",
                text: "Average holding time for winning trades.",
                good: "Aligned with your best duration bucket.",
                normal: "Slightly outside best bucket.",
                danger: "Much shorter than optimal, possible early exits.",
              }}
            />

            <Stat
              label="Avg Loser Hold"
              value={formatDuration(engine.avgLoserHours)}
              danger={engine.emotionalHoldingRatio > 2}
              info={{
                title: "Avg Loser Hold",
                text: "Average holding time for losing trades.",
                good: "Similar to or shorter than winners.",
                normal: "Slightly longer than winners.",
                danger: "2x+ longer than winners means hope holding.",
              }}
            />

            <Stat
              label="Emotional Holding Ratio"
              value={`${engine.emotionalHoldingRatio}x`}
              danger={engine.emotionalHoldingRatio > 2}
              info={{
                title: "Emotional Holding Ratio",
                text: "Avg loser hold time divided by avg winner hold time.",
                good: "Below 1.5x.",
                normal: "1.5x to 2x.",
                danger: "Above 2x.",
              }}
            />

            <Stat
              label="Duration Efficiency"
              value={`${engine.durationEfficiency}R/hr`}
              info={{
                title: "Duration Efficiency",
                text: "Total R divided by total hours held.",
                good: "Positive R/hr.",
                normal: "Near 0R/hr.",
                danger: "Negative R/hr.",
              }}
              danger={engine.durationEfficiency < 0}
            />

            <Stat
              label="Overholding Risk"
              value={`${engine.overholdingRisk}%`}
              danger={engine.overholdingRisk >= 60}
              warning={engine.overholdingRisk >= 40}
              info={{
                title: "Overholding Risk",
                text: "Detects losing trades held much longer than winners.",
                good: "Below 30%.",
                normal: "30% to 60%.",
                danger: "60%+.",
              }}
            />

            <Stat
              label="Early Exit Risk"
              value={`${engine.earlyExitRisk}%`}
              warning={engine.earlyExitRisk >= 50}
              danger={engine.earlyExitRisk >= 70}
              info={{
                title: "Early Exit Risk",
                text: "Detects winners closed much faster than average winning duration.",
                good: "Below 30%.",
                normal: "30% to 50%.",
                danger: "70%+.",
              }}
            />
          </div>
        </Panel>
      </div>

      <Panel
        title="Performance Heatmap by Duration"
        subtitle="Duration bucket performance with win rate, average R, total R, expectancy, and profit factor."
        info={{
          title: "Performance Heatmap by Duration",
          text: "Shows how each holding-duration bucket performs.",
          good: "Positive expectancy and positive total R.",
          normal: "Mixed R and moderate win rate.",
          danger: "Negative expectancy or repeated losses.",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="py-3">Duration Bucket</th>
                <th>Trades</th>
                <th>Win Rate</th>
                <th>Avg R</th>
                <th>Total R</th>
                <th>Expectancy</th>
                <th>Profit Factor</th>
              </tr>
            </thead>

            <tbody>
              {engine.bucketStats.map((b) => (
                <tr key={b.bucket} className="border-t border-slate-100">
                  <td className="py-3 font-black">{b.bucket}</td>
                  <td>{b.trades}</td>
                  <td>{b.winRate}%</td>
                  <td
                    className={
                      b.avgR >= 0
                        ? "font-black text-blue-600"
                        : "font-black text-orange-500"
                    }
                  >
                    {formatR(b.avgR)}
                  </td>
                  <td
                    className={
                      b.totalR >= 0
                        ? "font-black text-blue-600"
                        : "font-black text-orange-500"
                    }
                  >
                    {formatR(b.totalR)}
                  </td>
                  <td>{formatR(b.expectancy)}</td>
                  <td>{b.profitFactor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="R Collection vs Duration"
          subtitle="Shows where cumulative R peaks across duration windows."
          info={{
            title: "R Collection vs Duration",
            text: "Shows which duration zones contribute most to cumulative R.",
            good: "Cumulative R rises through optimal buckets.",
            normal: "Flat or mixed curve.",
            danger: "Curve falls in long-duration buckets.",
          }}
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={engine.rCollectionCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.slate200} />
              <XAxis
                dataKey="bucket"
                tick={{ fontSize: 10 }}
                stroke={C.slate500}
              />
              <YAxis tick={{ fontSize: 11 }} stroke={C.slate500} />
              <Tooltip />
              <ReferenceLine y={0} stroke={C.slate500} />
              <Line
                dataKey="cumulativeR"
                name="Cumulative R"
                stroke={C.blue}
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title="Win/Loss Duration Behavior"
          subtitle="Compares average winner duration and average loser duration."
          info={{
            title: "Win/Loss Duration Behavior",
            text: "Shows whether you hold losers longer than winners.",
            good: "Losers are not held much longer than winners.",
            normal: "Losers slightly longer.",
            danger: "Losers 2x+ longer than winners.",
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Stat
              label="Avg Winner Hold Time"
              value={formatDuration(engine.avgWinnerHours)}
            />
            <Stat
              label="Avg Loser Hold Time"
              value={formatDuration(engine.avgLoserHours)}
              danger={engine.emotionalHoldingRatio > 2}
            />
            <Stat
              label="Emotional Holding Ratio"
              value={`${engine.emotionalHoldingRatio}x`}
              danger={engine.emotionalHoldingRatio > 2}
            />
            <Stat
              label="Insight"
              value={
                engine.emotionalHoldingRatio > 2
                  ? "Losers held too long"
                  : "Holding balanced"
              }
            />
          </div>
        </Panel>
      </div>

      <Panel
        title="Exposure Intelligence"
        subtitle="Monitors active and projected exposure across accounts."
        info={{
          title: "Exposure Intelligence",
          text: "Shows current active risk and remaining risk room.",
          good: "Exposure used below 40%.",
          normal: "40% to 70%.",
          danger: "70%+ exposure used.",
        }}
      >
        <div className="grid gap-4 md:grid-cols-4">
          <Stat
            label="Account Balance"
            value={engine.accountBalance ? `$${engine.accountBalance}` : "—"}
          />
          <Stat label="Max DD Limit" value={`${engine.maxDrawdownLimit}%`} />
          <Stat
            label="Daily DD Limit"
            value={`${engine.dailyDrawdownLimit}%`}
          />
          <Stat
            label="Current DD Used"
            value={`${engine.currentDDUsed}%`}
            warning={engine.currentDDUsed > 3}
          />
          <Stat
            label="Total Active Exposure"
            value={`${engine.totalActiveExposure}%`}
            danger={engine.exposureUsedPercent >= 70}
          />
          <Stat
            label="Projected Exposure"
            value={`${engine.projectedExposure}%`}
            warning={engine.exposureUsedPercent >= 40}
          />
          <Stat
            label="Available Risk Room"
            value={`${engine.availableRiskRoom}%`}
          />
          <Stat
            label="Exposure Status"
            value={engine.exposureStatus}
            danger={engine.exposureStatus === "High Risk"}
          />
        </div>

        <div className="mt-6 rounded-3xl bg-blue-50 p-6">
          <div className="flex items-center gap-2 text-sm font-black text-blue-600">
            Current Exposure
            <InfoTip
              title="Current Exposure"
              text="Current exposure used compared with your max exposure limit."
              good="0% to 40%. "
              normal="40% to 70%."
              danger="70%+ high risk."
            />
          </div>

          <div className="mt-2 text-6xl font-black text-slate-950">
            {engine.exposureUsedPercent}%
          </div>

          <div className="mt-2 text-sm font-bold text-slate-600">
            Safe 0–40% • Moderate 40–70% • High Risk 70%+
          </div>
        </div>
      </Panel>

      <Panel
        title="Exposure Trend"
        subtitle="Actual and projected exposure trend from recent trades."
        info={{
          title: "Exposure Trend",
          text: "Shows risk exposure trend across recent trades.",
          good: "Exposure stays below 40%.",
          normal: "Touches 40% to 70%.",
          danger: "Repeatedly above 70%.",
        }}
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={engine.exposureTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.slate200} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={C.slate500} />
            <YAxis tick={{ fontSize: 11 }} stroke={C.slate500} />
            <Tooltip />
            <ReferenceLine y={40} stroke={C.green} strokeDasharray="5 5" />
            <ReferenceLine y={70} stroke={C.orange} strokeDasharray="5 5" />
            <Line
              dataKey="actualExposure"
              name="Actual Exposure"
              stroke={C.blue}
              strokeWidth={3}
              dot={false}
            />
            <Line
              dataKey="projectedExposure"
              name="Projected Exposure"
              stroke={C.cyan}
              strokeWidth={3}
              strokeDasharray="6 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Live Opportunity Checker"
          subtitle="Checks whether the account can safely take another trade."
          info={{
            title: "Live Opportunity Checker",
            text: "Uses current exposure and risk room to judge if another trade is safe.",
            good: "Safe exposure with enough risk room.",
            normal: "Trade possible with reduced risk.",
            danger: "New trade exceeds safe exposure.",
          }}
        >
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-sm font-black text-slate-950">
              {engine.opportunityDecision}
            </div>
            <p className="mt-2 text-sm font-bold text-slate-500">
              Current exposure is {engine.totalActiveExposure}%. Available risk
              room is {engine.availableRiskRoom}%.
            </p>
          </div>
        </Panel>

        <Panel
          title="Exposure Correlation Intelligence"
          subtitle="Detects correlated exposure stacking by asset class."
          info={{
            title: "Exposure Correlation Intelligence",
            text: "Groups active risk by asset class to detect stacking.",
            good: "No asset class dominates exposure.",
            normal: "One asset class is moderately concentrated.",
            danger: "One asset class dominates risk.",
          }}
        >
          <div className="space-y-3">
            {engine.correlationBars.length ? (
              engine.correlationBars.map((x) => (
                <div
                  key={x.assetClass}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between text-sm font-black">
                    <span>{x.assetClass}</span>
                    <span>{x.exposure}%</span>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{
                        width: `${Math.min(100, (x.exposure / 6) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm font-bold text-slate-500">
                No active exposure found.
              </div>
            )}
          </div>
        </Panel>
      </div>

      <Panel
        title="Active & Pending Exposure Breakdown"
        subtitle="Active risk and pending exposure by symbol."
        info={{
          title: "Active & Pending Exposure Breakdown",
          text: "Detailed active trade risk by symbol, direction, strategy, and exposure impact.",
          good: "Small individual risk and diversified symbols.",
          normal: "Moderate risk concentration.",
          danger: "Large risk concentrated in one symbol or asset class.",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="font-black uppercase text-slate-500">
              <tr>
                <th className="py-3">Symbol</th>
                <th>Direction</th>
                <th>Type</th>
                <th>Strategy</th>
                <th>Status</th>
                <th>Entry</th>
                <th>SL</th>
                <th>Risk %</th>
                <th>Risk USD</th>
                <th>Correlation Risk</th>
                <th>Exposure Impact</th>
              </tr>
            </thead>

            <tbody>
              {engine.active.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="py-3 font-black">{r.symbol}</td>
                  <td>{r.direction}</td>
                  <td>{r.type}</td>
                  <td>{r.strategy}</td>
                  <td>{r.status}</td>
                  <td>{r.entry || "—"}</td>
                  <td>{r.sl || "—"}</td>
                  <td>{r.riskPercent}%</td>
                  <td>{r.riskUsd ? `$${r.riskUsd}` : "—"}</td>
                  <td>{r.assetClass}</td>
                  <td className="font-black text-orange-500">
                    {r.riskPercent}%
                  </td>
                </tr>
              ))}

              {!engine.active.length ? (
                <tr>
                  <td
                    colSpan={11}
                    className="py-8 text-center text-sm font-bold text-slate-500"
                  >
                    No active or pending trades found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Bottom Intelligence Strip"
        subtitle="Final exposure and duration recommendation."
        info={{
          title: "Bottom Intelligence Strip",
          text: "Final summary of active risk, projected exposure, drawdown room, and recommended action.",
          good: "Risk room available and exposure safe.",
          normal: "Some caution needed.",
          danger: "Reduce exposure before adding trades.",
        }}
      >
        <div className="grid gap-4 md:grid-cols-5">
          <Stat
            label="Total Active Risk"
            value={`${engine.totalActiveExposure}%`}
          />
          <Stat label="Total Pending Risk" value="0%" />
          <Stat
            label="Projected Exposure"
            value={`${engine.projectedExposure}%`}
          />
          <Stat
            label="Daily DD Remaining"
            value={`${Math.max(0, engine.dailyDrawdownLimit - engine.currentDDUsed)}%`}
          />
          <Stat label="Recommended Action" value={engine.recommendedAction} />
        </div>
      </Panel>
    </div>
  );
}
