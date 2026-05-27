"use client";

import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Gauge,
  Info,
  Radar,
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
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar as RadarShape,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
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
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate200: "#e2e8f0",
};

function getNormalizedRisk(j) {
  const risk = Number(j.risk_per_trade || 0);
  const mode = String(j.risk_mode || "").toUpperCase();

  if (!risk) return 0;

  // already percentage
  if (mode === "PERCENT") return risk;

  // USD amount converted into account %
  if (mode === "AMOUNT") {
    const accountSize = Number(j.trading_accounts?.account_size || 0);
    if (!accountSize) return 0;

    return (risk / accountSize) * 100;
  }

  return risk;
}

function InfoTip({ title, text, best, normal, worst }) {
  return (
    <span className="group/tip relative z-[999] inline-flex shrink-0">
      <Info className="h-4 w-4 cursor-help text-slate-400" />

      <span className="pointer-events-none absolute left-1/2 top-7 z-[9999] w-80 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 text-left text-xs font-semibold leading-5 text-slate-600 opacity-0 shadow-2xl transition group-hover/tip:opacity-100">
        <span className="block text-sm font-black text-slate-950">{title}</span>
        <span className="mt-2 block">{text}</span>
        <span className="mt-3 block text-blue-600">Good: {best}</span>
        <span className="mt-1 block text-slate-600">Normal: {normal}</span>
        <span className="mt-1 block text-orange-600">Worst: {worst}</span>
      </span>
    </span>
  );
}

function getTradeDate(j) {
  return new Date(j.journal_end_at || j.created_at);
}

function getSymbol(j) {
  return j?.symbols?.symbol_name || "—";
}

function getRisk(j) {
  return getNormalizedRisk(j);
}

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function getClosedTrades(journals) {
  return [...journals]
    .filter((j) => calculateRMultiple(j) !== 0)
    .sort((a, b) => getTradeDate(a) - getTradeDate(b));
}

function getPlannedR(j) {
  const entry = Number(j.entry_price || 0);
  const stop = Number(j.stop_loss || 0);
  const tp = Array.isArray(j.take_profit)
    ? Number(j.take_profit.find((x) => Number(x) > 0) || 0)
    : 0;

  const direction = String(j.direction || "").toUpperCase();

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

function detectGrowth(journals) {
  const closed = getClosedTrades(journals);

  let cumulativeR = 0;

  const trades = closed.map((j, index) => {
    const r = round2(calculateRMultiple(j));
    const plannedR = round2(getPlannedR(j));
    const missedR = Math.max(0, plannedR - r);
    const risk = getRisk(j);

    cumulativeR = round2(cumulativeR + r);

    const decisionQuality = Math.max(
      0,
      Math.min(
        100,
        Math.round(72 + r * 8 - missedR * 12 - Math.max(0, risk - 2) * 6),
      ),
    );

    return {
      id: j.id,
      journal: j,
      index: index + 1,
      date: getTradeDate(j).toISOString().slice(5, 10),
      symbol: getSymbol(j),
      strategy: getStrategyName(j),
      setup: getSetupType(j),
      r,
      plannedR,
      missedR,
      risk,
      cumulativeR,
      decisionQuality,
      win: r > 0,
      loss: r < 0,
    };
  });

  const wins = trades.filter((t) => t.r > 0);
  const losses = trades.filter((t) => t.r < 0);

  const totalR = round2(trades.reduce((a, b) => a + b.r, 0));
  const winRate = trades.length
    ? Math.round((wins.length / trades.length) * 100)
    : 0;
  const expectancy = trades.length ? round2(totalR / trades.length) : 0;
  const avgWin = round2(avg(wins.map((t) => t.r)));
  const avgLoss = round2(Math.abs(avg(losses.map((t) => t.r))));
  const profitFactor =
    losses.length && avgLoss > 0
      ? round2(
          wins.reduce((a, b) => a + b.r, 0) /
            Math.abs(losses.reduce((a, b) => a + b.r, 0)),
        )
      : wins.length
        ? 99
        : 0;

  const avgPlannedRR = round2(
    avg(trades.map((t) => t.plannedR).filter(Boolean)),
  );
  const avgActualRR = round2(avg(trades.map((t) => t.r)));
  const earlyExitFrequency = trades.length
    ? Math.round(
        (trades.filter((t) => t.missedR > 0.5 && t.r > 0).length /
          trades.length) *
          100,
      )
    : 0;

  const riskAfterWins = [];
  const riskAfterLosses = [];

  for (let i = 1; i < trades.length; i++) {
    if (trades[i - 1].r > 0) riskAfterWins.push(trades[i].risk);
    if (trades[i - 1].r < 0) riskAfterLosses.push(trades[i].risk);
  }

  const avgRiskAfterWins = round2(avg(riskAfterWins));
  const avgRiskAfterLosses = round2(avg(riskAfterLosses));
  const riskVariance = round2(
    avg(trades.map((t) => Math.abs(t.risk - avg(trades.map((x) => x.risk))))),
  );
  const riskStability = Math.max(
    0,
    Math.min(100, Math.round(100 - riskVariance * 20)),
  );

  let peak = 0;
  let maxDrawdown = 0;
  let drawdownCycles = 0;
  let inDrawdown = false;

  const recoverySeries = trades.map((t) => {
    peak = Math.max(peak, t.cumulativeR);
    const dd = round2(t.cumulativeR - peak);

    if (dd < 0 && !inDrawdown) {
      drawdownCycles++;
      inDrawdown = true;
    }

    if (dd >= 0) inDrawdown = false;

    maxDrawdown = Math.min(maxDrawdown, dd);

    return {
      ...t,
      drawdown: dd,
    };
  });

  const recoveredR = Math.abs(maxDrawdown);
  const recoveryEfficiency = trades.length
    ? round2(recoveredR / Math.max(1, drawdownCycles))
    : 0;

  const executionIntegrity = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 - earlyExitFrequency - avg(trades.map((t) => t.missedR)) * 10,
      ),
    ),
  );
  const discipline = Math.max(
    0,
    Math.min(100, Math.round((riskStability + executionIntegrity) / 2)),
  );
  const emotionalControl = Math.max(
    0,
    Math.min(
      100,
      Math.round(100 - Math.abs(avgRiskAfterLosses - avgRiskAfterWins) * 20),
    ),
  );
  const recovery = Math.max(
    0,
    Math.min(100, Math.round(70 + recoveryEfficiency * 5 + expectancy * 10)),
  );
  const stability = Math.max(
    0,
    Math.min(100, Math.round(100 - Math.abs(maxDrawdown) * 8)),
  );

  const excellionScore = Math.round(
    avg([
      discipline,
      stability,
      recovery,
      emotionalControl,
      riskStability,
      executionIntegrity,
    ]),
  );

  const classification =
    excellionScore >= 90
      ? "Ascendant"
      : excellionScore >= 80
        ? "Elite"
        : excellionScore >= 70
          ? "Disciplined"
          : excellionScore >= 55
            ? "Structured"
            : "Initiate";

  const radarData = [
    { metric: "Discipline", score: discipline },
    { metric: "Stability", score: stability },
    { metric: "Recovery", score: recovery },
    { metric: "Emotional Control", score: emotionalControl },
    { metric: "Risk Consistency", score: riskStability },
    { metric: "Execution Integrity", score: executionIntegrity },
  ];

  const setupMap = {};
  const strategyMap = {};
  const sessionMap = {};
  const accountMap = {};

  trades.forEach((t) => {
    const setup = t.setup || "Unknown";
    const strategy = t.strategy || "Unknown";
    const hour = getTradeDate(t.journal).getHours();
    const session = hour < 8 ? "Asia" : hour < 14 ? "London" : "New York";
    const account = t.journal.trading_accounts?.account_name || "Account";

    if (!setupMap[setup])
      setupMap[setup] = { name: setup, trades: 0, wins: 0, totalR: 0 };
    if (!strategyMap[strategy])
      strategyMap[strategy] = {
        name: strategy,
        trades: 0,
        wins: 0,
        totalR: 0,
        quality: 0,
      };
    if (!sessionMap[session])
      sessionMap[session] = { name: session, trades: 0, totalR: 0, quality: 0 };
    if (!accountMap[account])
      accountMap[account] = {
        name: account,
        trades: 0,
        totalR: 0,
        drawdown: 0,
      };

    setupMap[setup].trades++;
    strategyMap[strategy].trades++;
    sessionMap[session].trades++;
    accountMap[account].trades++;

    if (t.r > 0) {
      setupMap[setup].wins++;
      strategyMap[strategy].wins++;
    }

    setupMap[setup].totalR += t.r;
    strategyMap[strategy].totalR += t.r;
    strategyMap[strategy].quality += t.decisionQuality;
    sessionMap[session].totalR += t.r;
    sessionMap[session].quality += t.decisionQuality;
    accountMap[account].totalR += t.r;
  });

  const setupStats = Object.values(setupMap).map((x) => ({
    ...x,
    winRate: x.trades ? Math.round((x.wins / x.trades) * 100) : 0,
    totalR: round2(x.totalR),
  }));

  const strategyStats = Object.values(strategyMap).map((x) => ({
    ...x,
    expectancy: round2(x.totalR / x.trades),
    winRate: x.trades ? Math.round((x.wins / x.trades) * 100) : 0,
    quality: x.trades ? Math.round(x.quality / x.trades) : 0,
    score: x.trades
      ? Math.round((x.quality / x.trades + Math.max(0, x.totalR) * 5) / 1.2)
      : 0,
    totalR: round2(x.totalR),
  }));

  const sessionStats = Object.values(sessionMap).map((x) => ({
    ...x,
    totalR: round2(x.totalR),
    quality: x.trades ? Math.round(x.quality / x.trades) : 0,
  }));

  const accountStats = Object.values(accountMap).map((x) => ({
    ...x,
    totalR: round2(x.totalR),
    expectancy: x.trades ? round2(x.totalR / x.trades) : 0,
  }));

  const errorMap = [
    {
      name: "Early Exits",
      count: trades.filter((t) => t.missedR > 0.5).length,
    },
    { name: "Overrisking", count: trades.filter((t) => t.risk > 2).length },
    {
      name: "Emotional Overrides",
      count: trades.filter((t) => t.r < -1.5).length,
    },
    {
      name: "Revenge Trades",
      count: trades.filter(
        (t, i) => i > 0 && trades[i - 1].r < 0 && t.risk > trades[i - 1].risk,
      ).length,
    },
    { name: "Hesitation", count: trades.filter((t) => t.missedR > 1).length },
  ];

  const insights = [
    `EXCELLION score is ${excellionScore}/100 with ${classification} classification.`,
    `Execution integrity is ${executionIntegrity}%. Early exit frequency is ${earlyExitFrequency}%.`,
    `Risk stability index is ${riskStability}%. Risk after losses averages ${avgRiskAfterLosses}%.`,
    `Best strategy by score: ${strategyStats.sort((a, b) => b.score - a.score)[0]?.name || "—"}.`,
    `Max drawdown is ${formatR(maxDrawdown)} and recovery efficiency is ${recoveryEfficiency}.`,
  ];

  const profile =
    excellionScore >= 85
      ? "Ascendant Trader"
      : emotionalControl < 50
        ? "Fear-Contraction Trader"
        : recoveryPowerFromTrades(trades) > 3
          ? "Aggressive Recoverer"
          : executionIntegrity >= 75
            ? "Stable Executor"
            : "Controlled Opportunist";

  const decisionQualitySeries = trades.map((t) => {
    let classification = "Balanced Decision";

    if (t.decisionQuality >= 70 && t.r < 0) {
      classification = "High Quality Loss";
    } else if (t.decisionQuality < 50 && t.r > 0) {
      classification = "Lucky / Low Quality Win";
    } else if (t.decisionQuality >= 70 && t.r > 0) {
      classification = "High Quality Win";
    } else if (t.decisionQuality < 50 && t.r < 0) {
      classification = "Poor Decision Loss";
    }

    return {
      ...t,
      actualR: t.r,
      classification,
    };
  });

  const highQualityLosses = decisionQualitySeries.filter(
    (t) => t.r < 0 && t.decisionQuality >= 70,
  ).length;

  const lowQualityWins = decisionQualitySeries.filter(
    (t) => t.r > 0 && t.decisionQuality < 50,
  ).length;

  const avgDecisionQuality = decisionQualitySeries.length
    ? Math.round(avg(decisionQualitySeries.map((t) => t.decisionQuality)))
    : 0;

  return {
    trades,
    totalR,
    winRate,
    expectancy,
    avgWin,
    avgLoss,
    profitFactor,
    avgPlannedRR,
    avgActualRR,
    earlyExitFrequency,
    riskAfterWins: avgRiskAfterWins,
    riskAfterLosses: avgRiskAfterLosses,
    riskStability,
    emotionalControl,
    recoveryEfficiency,
    drawdownCycles,
    maxDrawdown,
    excellionScore,
    classification,
    radarData,
    setupStats,
    strategyStats,
    sessionStats,
    accountStats,
    errorMap,
    recoverySeries,
    executionIntegrity,
    discipline,
    stability,
    recovery,
    insights,
    profile,
    decisionQualitySeries,
    highQualityLosses,
    lowQualityWins,
    avgDecisionQuality,
  };
}

function recoveryPowerFromTrades(trades) {
  const losses = trades.filter((t) => t.r < 0);
  const wins = trades.filter((t) => t.r > 0);
  const avgLoss = Math.abs(avg(losses.map((t) => t.r)));
  const lastWin = [...wins].pop()?.r || 0;
  return avgLoss > 0 ? lastWin / avgLoss : 0;
}

function Panel({ title, subtitle, info, children }) {
  return (
    <section className="relative z-0 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm hover:z-50">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        {info ? <InfoTip {...info} /> : null}
      </div>
      <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MiniCard({ label, value, sub, icon: Icon, danger, warning, info }) {
  return (
    <div className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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
        {Icon ? (
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function GrowthMirrorTab({ journals }) {
  const engine = useMemo(() => detectGrowth(journals), [journals]);

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-black text-blue-600">
          <Brain className="h-4 w-4" />
          TRADER MIRROR
        </div>

        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
          Ascend Intelligence
        </h1>

        <p className="mt-2 text-sm font-medium text-slate-500">
          Growth • Discipline • Execution • Recovery • Decision Quality
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Panel
          title="EXCELLION Score"
          subtitle="Main behavioral intelligence score."
          info={{
            title: "EXCELLION Score",
            text: "Composite score from discipline, stability, recovery, emotional control, risk consistency, and execution integrity.",
            best: "80+ Elite or Ascendant.",
            normal: "55 to 80 developing structure.",
            worst: "Below 55 needs process repair.",
          }}
        >
          <div className="flex flex-col items-center justify-center rounded-3xl bg-blue-50 p-6 text-center">
            <div className="text-6xl font-black text-blue-600">
              {engine.excellionScore}
            </div>
            <div className="mt-2 text-lg font-black text-slate-950">
              {engine.classification}
            </div>
            <div className="mt-2 text-xs font-bold text-slate-500">
              Initiate → Structured → Disciplined → Elite → Ascendant
            </div>
          </div>

          <div className="mt-5 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={engine.radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} />
                <RadarShape
                  dataKey="score"
                  stroke={C.blue}
                  fill={C.blue}
                  fillOpacity={0.25}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MiniCard
            label="Total R"
            value={formatR(engine.totalR)}
            sub="Collected"
            icon={TrendingUp}
          />
          <MiniCard
            label="Win Rate"
            value={`${engine.winRate}%`}
            sub="Closed trades"
            icon={Target}
          />
          <MiniCard
            label="Expectancy"
            value={formatR(engine.expectancy)}
            sub="Avg R per trade"
            icon={Gauge}
          />
          <MiniCard
            label="Execution Integrity"
            value={`${engine.executionIntegrity}%`}
            sub="Plan discipline"
            icon={ShieldCheck}
          />
          <MiniCard
            label="Risk Stability"
            value={`${engine.riskStability}%`}
            sub="Risk consistency"
            icon={CheckCircle2}
          />
          <MiniCard
            label="Emotional Control"
            value={`${engine.emotionalControl}%`}
            sub="Behavioral control"
            icon={Brain}
          />
        </div>
      </div>

      <Panel
        title="Performance Clarity"
        subtitle="R collected, setup strength, strategy expectancy, and clean performance signals."
        info={{
          title: "Performance Clarity",
          text: "Shows what is actually helping performance without noisy charts.",
          best: "Positive expectancy across strong setups.",
          normal: "Mixed setup performance.",
          worst: "Low expectancy and unstable setup behavior.",
        }}
      >
        <div className="grid gap-5 xl:grid-cols-2">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={engine.trades}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.slate200} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                stroke={C.slate500}
              />
              <YAxis tick={{ fontSize: 11 }} stroke={C.slate500} />
              <Tooltip />
              <Line
                dataKey="cumulativeR"
                name="R Collected"
                stroke={C.blue}
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="space-y-3">
            {engine.setupStats.slice(0, 5).map((s) => (
              <Row
                key={s.name}
                label={s.name}
                value={`${s.winRate}% WR`}
                sub={formatR(s.totalR)}
              />
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Execution Intelligence"
          subtitle="Planned vs actual execution behavior."
          info={{
            title: "Execution Intelligence",
            text: "Compares planned R with actual R and early exit behavior.",
            best: "Actual RR stays close to planned RR.",
            normal: "Small execution gap.",
            worst: "Large early-exit frequency and missed R.",
          }}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Stat label="Avg Planned RR" value={engine.avgPlannedRR} />
            <Stat label="Avg Actual RR" value={engine.avgActualRR} />
            <Stat
              label="Early Exit Frequency"
              value={`${engine.earlyExitFrequency}%`}
              warning
            />
          </div>
        </Panel>

        <Panel
          title="Risk & Emotional Behavior"
          subtitle="Risk after wins, losses, revenge tendency, and emotional volatility."
          info={{
            title: "Risk & Emotional Behavior",
            text: "Shows whether risk changes emotionally after wins or losses.",
            best: "Risk stays consistent.",
            normal: "Small risk variation.",
            worst: "Risk expands sharply after streaks.",
          }}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Stat label="Risk After Wins" value={`${engine.riskAfterWins}%`} />
            <Stat
              label="Risk After Losses"
              value={`${engine.riskAfterLosses}%`}
              warning
            />
            <Stat label="Risk Stability" value={`${engine.riskStability}%`} />
          </div>
        </Panel>
      </div>

      <Panel
        title="Drawdown & Recovery Engine"
        subtitle="Recovery quality, drawdown cycles, and capital efficiency."
        info={{
          title: "Drawdown & Recovery",
          text: "Shows whether recovery is smooth, delayed, aggressive, or unstable.",
          best: "Small drawdowns with smooth recovery.",
          normal: "Some cycles but controlled.",
          worst: "Deep drawdowns and unstable recovery spikes.",
        }}
      >
        <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={engine.recoverySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.slate200} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                stroke={C.slate500}
              />
              <YAxis tick={{ fontSize: 11 }} stroke={C.slate500} />
              <Tooltip />
              <Line
                dataKey="drawdown"
                name="Drawdown"
                stroke={C.orange}
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="grid gap-3">
            <Stat
              label="Max Drawdown"
              value={formatR(engine.maxDrawdown)}
              danger
            />
            <Stat
              label="Recovery Efficiency"
              value={engine.recoveryEfficiency}
            />
            <Stat label="Drawdown Cycles" value={engine.drawdownCycles} />
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Behavioral Consistency Engine"
          subtitle="Process adherence, decision consistency, and contextual discipline."
          info={{
            title: "Behavioral Consistency",
            text: "Measures process consistency using discipline, risk stability, and execution integrity.",
            best: "Consistent above 75.",
            normal: "50 to 75.",
            worst: "Below 50 unstable.",
          }}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Stat label="Discipline" value={`${engine.discipline}%`} />
            <Stat label="Stability" value={`${engine.stability}%`} />
            <Stat
              label="Execution Integrity"
              value={`${engine.executionIntegrity}%`}
            />
          </div>
        </Panel>

        <Panel
          title="Error Frequency Mapping"
          subtitle="Mistakes that repeat most often."
          info={{
            title: "Error Mapping",
            text: "Tracks repeat mistakes like early exits, over-risking, and emotional overrides.",
            best: "Low error frequency.",
            normal: "One recurring error.",
            worst: "Multiple repeated mistakes.",
          }}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={engine.errorMap}>
              <CartesianGrid vertical={false} stroke={C.slate200} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                stroke={C.slate500}
              />
              <YAxis tick={{ fontSize: 11 }} stroke={C.slate500} />
              <Tooltip />
              <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                {engine.errorMap.map((x) => (
                  <Cell key={x.name} fill={x.count > 2 ? C.orange : C.blue} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <TablePanel
          title="Session & Market Condition Analysis"
          rows={engine.sessionStats}
          columns={["name", "trades", "totalR", "quality"]}
        />

        <TablePanel
          title="Strategy DNA Engine"
          rows={engine.strategyStats}
          columns={[
            "name",
            "trades",
            "expectancy",
            "winRate",
            "quality",
            "score",
          ]}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <TablePanel
          title="Account Intelligence"
          rows={engine.accountStats}
          columns={["name", "trades", "totalR", "expectancy"]}
        />

        <Panel
          title="Decision Quality Engine"
          subtitle="Measures trade decision quality independent from profit or loss."
          info={{
            title: "Decision Quality Engine",
            text: "X-axis shows trade outcome in R. Y-axis shows decision quality. This helps separate good decisions from lucky wins or bad executions.",
            best: "High quality decisions above 70.",
            normal: "50 to 70.",
            worst: "Below 50 shows poor decision process.",
          }}
        >
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

              <XAxis
                type="number"
                dataKey="actualR"
                name="Actual R"
                tick={{ fontSize: 11 }}
                stroke="#64748b"
                label={{
                  value: "Trade Outcome (R)",
                  position: "insideBottom",
                  offset: -10,
                  fontSize: 12,
                  fill: "#64748b",
                }}
              />

              <YAxis
                type="number"
                dataKey="decisionQuality"
                name="Decision Quality"
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                stroke="#64748b"
                label={{
                  value: "Decision Quality",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 12,
                  fill: "#64748b",
                }}
              />

              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;

                  const d = payload[0].payload;

                  return (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-xl">
                      <div className="font-black text-slate-950">
                        {d.symbol}
                      </div>
                      <div className="mt-1 font-bold text-slate-500">
                        {d.strategy}
                      </div>

                      <div className="mt-3 grid gap-1 font-bold">
                        <div>Actual R: {formatR(d.actualR)}</div>
                        <div>Decision Quality: {d.decisionQuality}%</div>
                        <div>Classification: {d.classification}</div>
                      </div>
                    </div>
                  );
                }}
              />

              <ReferenceLine y={70} stroke="#2563eb" strokeDasharray="5 5" />
              <ReferenceLine y={50} stroke="#f97316" strokeDasharray="5 5" />
              <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="5 5" />

              <Scatter data={engine.decisionQualitySeries} fill="#2563eb" />
            </ScatterChart>
          </ResponsiveContainer>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Stat
              label="High Quality Losses"
              value={engine.highQualityLosses}
            />
            <Stat
              label="Lucky / Low Quality Wins"
              value={engine.lowQualityWins}
              warning
            />
            <Stat
              label="Avg Decision Quality"
              value={`${engine.avgDecisionQuality}%`}
            />
          </div>
        </Panel>
      </div>

      <Panel
        title="Performance Over Time"
        subtitle="R per trade, expectancy, profit factor, and consistency."
        info={{
          title: "Performance Over Time",
          text: "Shows trade-by-trade R behavior and performance stability.",
          best: "R trend improves with controlled pullbacks.",
          normal: "Mixed results with positive expectancy.",
          worst: "Negative expectancy and unstable R sequence.",
        }}
      >
        <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={engine.trades}>
              <CartesianGrid vertical={false} stroke={C.slate200} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                stroke={C.slate500}
              />
              <YAxis tick={{ fontSize: 11 }} stroke={C.slate500} />
              <Tooltip />
              <Bar dataKey="r" radius={[8, 8, 0, 0]}>
                {engine.trades.map((x) => (
                  <Cell key={x.id} fill={x.r >= 0 ? C.blue : C.orange} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="grid gap-3">
            <Stat label="Profit Factor" value={engine.profitFactor} />
            <Stat label="Expectancy" value={formatR(engine.expectancy)} />
            <Stat
              label="Avg Win / Avg Loss"
              value={`${engine.avgWin}R / -${engine.avgLoss}R`}
            />
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Panel
          title="AI Intelligence Terminal"
          subtitle="Scrollable intelligence feed."
          info={{
            title: "AI Terminal",
            text: "Summarizes the strongest current patterns from filtered trades.",
            best: "Insights show improvement.",
            normal: "Mixed improvement and warnings.",
            worst: "Repeated warnings across risk, execution, and recovery.",
          }}
        >
          <div className="max-h-[300px] space-y-3 overflow-y-auto rounded-3xl bg-slate-50 p-4">
            {engine.insights.map((x, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700"
              >
                {x}
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Behavioral Profile"
          subtitle="Trader personality classification."
          info={{
            title: "Behavioral Profile",
            text: "Classification based on discipline, emotional control, recovery, and execution.",
            best: "Ascendant Trader / Stable Executor.",
            normal: "Controlled Opportunist.",
            worst: "Revenge Cycler or Fear-Contraction Trader.",
          }}
        >
          <div className="rounded-3xl bg-blue-50 p-5">
            <div className="text-sm font-black text-blue-600">
              Current Profile
            </div>
            <div className="mt-2 text-3xl font-black text-slate-950">
              {engine.profile}
            </div>
            <p className="mt-2 text-sm font-bold text-slate-600">
              Focus on improving execution integrity, stable risk behavior, and
              repeatable recovery process.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value, danger, warning }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs font-black uppercase text-slate-500">{label}</div>
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

function Row({ label, value, sub }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-black text-slate-900">{label}</div>
      <div className="text-right">
        <div className="text-sm font-black text-blue-600">{value}</div>
        <div className="text-xs font-bold text-slate-500">{sub}</div>
      </div>
    </div>
  );
}

function TablePanel({ title, rows, columns }) {
  return (
    <Panel
      title={title}
      subtitle="Dynamic comparison from filtered trades."
      info={{
        title,
        text: "This table is calculated from the currently filtered journal data.",
        best: "High score and positive expectancy.",
        normal: "Mixed but usable data.",
        worst: "Negative expectancy or low quality.",
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs font-black uppercase text-slate-500">
            <tr>
              {columns.map((c) => (
                <th key={c} className="py-3 capitalize">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={`${row.name}-${i}`}
                className="border-t border-slate-100"
              >
                {columns.map((c) => (
                  <td key={c} className="py-3 font-bold text-slate-800">
                    {typeof row[c] === "number" &&
                    String(c).toLowerCase().includes("r")
                      ? formatR(row[c])
                      : row[c]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
