"use client";

import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Info,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  calculateRMultiple,
  formatR,
  getSetupType,
  getStrategyName,
  round2,
} from "../_lib/metrics";

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

function num(v) {
  return Number(v || 0);
}

function getOriginalStop(j) {
  return num(j.stop_loss);
}

function getActualStop(j) {
  return num(j.modified_sl_price || j.stop_loss);
}

function getExitPrice(j) {
  return num(j.exit_price);
}

function getEntry(j) {
  return num(j.entry_price);
}

function getPlannedTP(j) {
  const tps = Array.isArray(j.take_profit) ? j.take_profit.map(Number) : [];
  return tps.find((x) => x > 0) || 0;
}

function getPlannedR(j) {
  const entry = getEntry(j);
  const stop = getOriginalStop(j);
  const tp = getPlannedTP(j);
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

function detectExecution(journals) {
  const closed = [...journals]
    .filter((j) => calculateRMultiple(j) !== 0)
    .sort((a, b) => getTradeDate(a) - getTradeDate(b));

  let plannedCum = 0;
  let actualCum = 0;

  const rows = closed.map((j, index) => {
    const actualR = round2(calculateRMultiple(j));
    const plannedR = round2(getPlannedR(j));
    const rMissed = round2(Math.max(0, plannedR - actualR));

    const entry = getEntry(j);
    const originalSL = getOriginalStop(j);
    const actualSL = getActualStop(j);
    const plannedTP = getPlannedTP(j);
    const exit = getExitPrice(j);
    const direction = String(j.direction || "").toUpperCase();

    const slModified = actualSL !== originalSL;

    const beMove =
      actualSL === entry ||
      (entry > 0 && Math.abs(actualSL - entry) <= Math.abs(entry * 0.001));

    const earlyExit = plannedR > actualR && actualR > 0;

    const slWidened =
      direction === "BUY" ? actualSL < originalSL : actualSL > originalSL;

    let classification = "Plan Respected";
    let beType = "—";
    let slLeakage = 0;
    let tpLeakage = 0;
    let beLeakage = 0;

    if (beMove) {
      beType = actualR >= 1 ? "Healthy BE" : "Fear BE";
      if (actualR < plannedR) beLeakage = rMissed;
      classification = beType;
    }

    if (slModified && slWidened) {
      classification = "SL Widened";
      slLeakage = Math.abs(actualR) > 1 ? round2(Math.abs(actualR) - 1) : 0;
    }

    if (earlyExit) {
      classification = "Early TP Exit";
      tpLeakage = rMissed;
    }

    if (actualR < -1) {
      classification = "Overheld Loss";
      slLeakage = round2(Math.abs(actualR) - 1);
    }

    plannedCum = round2(plannedCum + plannedR);
    actualCum = round2(actualCum + actualR);

    return {
      id: j.id,
      index,
      journal: j,
      date: getTradeDate(j).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      symbol: getSymbol(j),
      strategy: getStrategyName(j),
      setup: getSetupType(j),
      plannedR,
      actualR,
      rMissed,
      slLeakage,
      tpLeakage,
      beLeakage,
      originalSL,
      actualSL,
      plannedTP,
      exit,
      beMove: beMove ? "Yes" : "No",
      beType,
      classification,
      plannedCum,
      actualCum,
      leakage: round2(plannedCum - actualCum),
    };
  });

  const totalTrades = rows.length;
  const totalSLLeakage = round2(rows.reduce((a, b) => a + b.slLeakage, 0));
  const totalTPMissed = round2(rows.reduce((a, b) => a + b.tpLeakage, 0));
  const totalBELeakage = round2(rows.reduce((a, b) => a + b.beLeakage, 0));
  const totalLeakage = round2(totalSLLeakage + totalTPMissed + totalBELeakage);

  const slModifiedCount = rows.filter(
    (r) =>
      r.classification === "SL Widened" || r.classification === "Overheld Loss",
  ).length;

  const earlyExitCount = rows.filter(
    (r) => r.classification === "Early TP Exit",
  ).length;

  const beTrades = rows.filter((r) => r.beMove === "Yes");
  const healthyBE = beTrades.filter((r) => r.beType === "Healthy BE").length;
  const fearBE = beTrades.filter((r) => r.beType === "Fear BE").length;

  const slRespectScore = totalTrades
    ? round2(100 - (slModifiedCount / totalTrades) * 100)
    : 0;

  const tpEfficiencyScore = totalTrades
    ? round2(100 - (earlyExitCount / totalTrades) * 100)
    : 0;

  const executionAlignmentScore = round2(
    (slRespectScore + tpEfficiencyScore) / 2,
  );

  const strategyMap = {};

  rows.forEach((r) => {
    if (!strategyMap[r.strategy]) {
      strategyMap[r.strategy] = {
        strategy: r.strategy,
        trades: 0,
        slLeakage: 0,
        tpLeakage: 0,
        totalLeakage: 0,
      };
    }

    strategyMap[r.strategy].trades += 1;
    strategyMap[r.strategy].slLeakage += r.slLeakage;
    strategyMap[r.strategy].tpLeakage += r.tpLeakage;
    strategyMap[r.strategy].totalLeakage +=
      r.slLeakage + r.tpLeakage + r.beLeakage;
  });

  const leakageByStrategy = Object.values(strategyMap).map((x) => ({
    ...x,
    slLeakage: round2(x.slLeakage),
    tpLeakage: round2(x.tpLeakage),
    totalLeakage: round2(x.totalLeakage),
  }));

  const qualitySeries = rows.map((r) => ({
    date: r.date,
    score: Math.max(0, Math.min(100, 100 - r.rMissed * 15 - r.slLeakage * 20)),
  }));

  return {
    rows,
    curve: rows,
    totalTrades,
    totalLeakage,
    totalTPMissed,
    totalSLLeakage,
    totalBELeakage,
    slRespectScore,
    tpEfficiencyScore,
    executionAlignmentScore,
    slModifiedCount,
    earlyExitCount,
    healthyBE,
    fearBE,
    beTrades: beTrades.length,
    leakageByStrategy,
    qualitySeries,
  };
}

function KpiCard({ icon: Icon, label, value, sub, info, danger, warning }) {
  return (
    <div className="group/card relative z-0 min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:z-50 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
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

        <div className="shrink-0 rounded-2xl bg-slate-100 p-3 text-slate-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
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

export default function ExecutionIntegrityTab({ journals }) {
  const engine = useMemo(() => detectExecution(journals), [journals]);

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-black text-blue-600">
          <ShieldCheck className="h-4 w-4" />
          EXECUTION INTEGRITY
        </div>

        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
          Execution Integrity Intelligence
        </h1>

        <p className="mt-2 text-sm font-medium text-slate-500">
          Execution Discipline • Opportunity Leakage • Behavioral Reaction
          Analysis
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
            text: "Number of closed trades used in this execution analysis.",
            best: "Enough trades to see reliable behavior.",
            normal: "Small sample but usable.",
            worst: "Too few trades to trust the pattern.",
          }}
        />

        <KpiCard
          icon={AlertTriangle}
          label="Execution Leakage"
          value={formatR(-engine.totalLeakage)}
          sub="Total R lost"
          danger={engine.totalLeakage > 0}
          info={{
            title: "Execution Leakage",
            text: "Total R lost due to SL deviation, TP deviation, and BE leakage.",
            best: "0R leakage.",
            normal: "Small leakage under 1R to 3R.",
            worst: "Large repeated leakage above 5R.",
          }}
        />

        <KpiCard
          icon={Target}
          label="TP Deviation"
          value={formatR(-engine.totalTPMissed)}
          sub="R missed"
          warning={engine.totalTPMissed > 0}
          info={{
            title: "TP Deviation",
            text: "R missed when actual exit was below the planned TP outcome.",
            best: "0R missed.",
            normal: "Small missed R.",
            worst: "Frequent early exits reducing expectancy.",
          }}
        />

        <KpiCard
          icon={TrendingDown}
          label="SL Deviation"
          value={formatR(-engine.totalSLLeakage)}
          sub="R lost"
          danger={engine.totalSLLeakage > 0}
          info={{
            title: "SL Deviation",
            text: "R lost from widening SL or holding losses beyond planned risk.",
            best: "0R lost from SL changes.",
            normal: "Rare SL deviation.",
            worst: "Repeated SL widening or overheld losses.",
          }}
        />

        <KpiCard
          icon={Gauge}
          label="BE Leakage"
          value={formatR(-engine.totalBELeakage)}
          sub={`${engine.beTrades} BE events`}
          warning={engine.totalBELeakage > 0}
          info={{
            title: "BE Leakage",
            text: "R missed when BE movement protected too early and reduced planned opportunity.",
            best: "Healthy BE with low leakage.",
            normal: "Some BE protection with minor missed R.",
            worst: "Fear BE repeatedly kills good trades.",
          }}
        />

        <KpiCard
          icon={ShieldCheck}
          label="SL Respect Score"
          value={`${engine.slRespectScore}%`}
          sub="Stop discipline"
          danger={engine.slRespectScore < 50}
          warning={engine.slRespectScore < 75}
          info={{
            title: "SL Respect Score",
            text: "How often original stop logic was respected.",
            best: "80%+ strong discipline.",
            normal: "60% to 80%.",
            worst: "Below 50% reactive stop behavior.",
          }}
        />

        <KpiCard
          icon={TrendingUp}
          label="TP Efficiency Score"
          value={`${engine.tpEfficiencyScore}%`}
          sub="Exit discipline"
          danger={engine.tpEfficiencyScore < 50}
          warning={engine.tpEfficiencyScore < 75}
          info={{
            title: "TP Efficiency Score",
            text: "How often trades avoided early TP deviation.",
            best: "80%+ strong TP discipline.",
            normal: "60% to 80%.",
            worst: "Below 50% frequent fear exits.",
          }}
        />

        <KpiCard
          icon={CheckCircle2}
          label="Alignment Score"
          value={`${engine.executionAlignmentScore}%`}
          sub="Plan vs actual"
          danger={engine.executionAlignmentScore < 50}
          warning={engine.executionAlignmentScore < 75}
          info={{
            title: "Execution Alignment Score",
            text: "Combined score of SL respect and TP efficiency.",
            best: "80%+ structured executor.",
            normal: "60% to 80%.",
            worst: "Below 50% high execution leakage.",
          }}
        />
      </div>

      <Panel
        title="Planned vs Actual Execution Curve"
        subtitle="Dual cumulative curve showing execution leakage between planned R and actual R."
        info={{
          title: "How to Read This",
          text: "Blue line shows planned R. Cyan line shows actual R. Orange area shows leakage.",
          best: "Actual curve stays close to planned curve.",
          normal: "Small gaps appear but recover.",
          worst: "Actual curve keeps separating below planned curve.",
        }}
      >
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={engine.curve}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
            <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="leakage"
              name="Execution Leakage"
              stroke="#f97316"
              fill="#ffedd5"
            />
            <Line
              type="monotone"
              dataKey="plannedCum"
              name="Planned R"
              stroke="#2563eb"
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="actualCum"
              name="Actual R"
              stroke="#06b6d4"
              strokeWidth={3}
              strokeDasharray="6 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel
          title="Stop Loss Integrity"
          subtitle="Measures SL widening, BE movement, and emotional stop behavior."
          info={{
            title: "Stop Loss Integrity",
            text: "Checks whether original SL logic was respected or emotionally modified.",
            best: "High SL respect, no SL widening.",
            normal: "Rare stop adjustments.",
            worst: "Frequent SL widening or overheld losses.",
          }}
        >
          <Stat label="SL modified trades" value={engine.slModifiedCount} />
          <Stat
            label="R lost from SL behavior"
            value={formatR(-engine.totalSLLeakage)}
            danger
          />
          <Stat label="SL respect score" value={`${engine.slRespectScore}%`} />
        </Panel>

        <Panel
          title="Take Profit Efficiency"
          subtitle="Measures early exits and missed planned R opportunity."
          info={{
            title: "Take Profit Efficiency",
            text: "Checks whether the trader closes before planned TP too often.",
            best: "Most winners reach planned TP.",
            normal: "Some early exits.",
            worst: "Frequent early TP exits reduce expectancy.",
          }}
        >
          <Stat label="Early TP exits" value={engine.earlyExitCount} warning />
          <Stat
            label="R missed from TP deviation"
            value={formatR(-engine.totalTPMissed)}
            warning
          />
          <Stat
            label="TP efficiency score"
            value={`${engine.tpEfficiencyScore}%`}
          />
        </Panel>

        <Panel
          title="Break-Even Behavior Intelligence"
          subtitle="Checks whether BE protected capital or leaked opportunity."
          info={{
            title: "Break-Even Behavior",
            text: "Healthy BE protects after structure. Fear BE moves too early and kills opportunity.",
            best: "Healthy BE ratio is high.",
            normal: "Some BE moves with minor leakage.",
            worst: "Fear BE repeatedly causes missed R.",
          }}
        >
          <Stat label="Healthy BE trades" value={engine.healthyBE} />
          <Stat label="Fear BE trades" value={engine.fearBE} danger />
          <Stat
            label="BE leakage"
            value={formatR(-engine.totalBELeakage)}
            warning
          />
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Behavioral Execution Patterns"
          subtitle="Repeated execution flaws detected from filtered trades."
          info={{
            title: "Execution Patterns",
            text: "Finds repeated flaws like SL widening, early exits, and fear BE.",
            best: "No repeated execution flaw.",
            normal: "One recurring issue.",
            worst: "Multiple repeated flaws across trades.",
          }}
        >
          <div className="space-y-3">
            <Pattern
              label="SL widening / overheld losses"
              value={engine.slModifiedCount}
              danger={engine.slModifiedCount > 0}
            />
            <Pattern
              label="Closed winners before TP"
              value={engine.earlyExitCount}
              warning={engine.earlyExitCount > 0}
            />
            <Pattern
              label="Fear-based BE moves"
              value={engine.fearBE}
              danger={engine.fearBE > 0}
            />
          </div>
        </Panel>

        <Panel
          title="Execution Stability Curve"
          subtitle="Shows whether execution quality is improving or worsening."
          info={{
            title: "Execution Stability",
            text: "Score drops when trades miss R or create SL leakage.",
            best: "Score stays above 80.",
            normal: "Score moves between 60 and 80.",
            worst: "Score remains below 50.",
          }}
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={engine.qualitySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="score"
                name="Execution Quality"
                stroke="#2563eb"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel
        title="Leakage by Strategy"
        subtitle="Compares which strategies create most execution leakage."
        info={{
          title: "Leakage by Strategy",
          text: "Shows which strategy is losing most R from execution mistakes.",
          best: "Low leakage across all strategies.",
          normal: "One strategy needs review.",
          worst: "Large leakage concentrated in one strategy.",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="py-3">Strategy</th>
                <th>Trades</th>
                <th>SL Leakage</th>
                <th>TP Missed</th>
                <th>Total Leakage</th>
              </tr>
            </thead>
            <tbody>
              {engine.leakageByStrategy.map((s) => (
                <tr key={s.strategy} className="border-t border-slate-100">
                  <td className="py-3 font-bold">{s.strategy}</td>
                  <td>{s.trades}</td>
                  <td className="text-orange-500">{formatR(-s.slLeakage)}</td>
                  <td className="text-orange-500">{formatR(-s.tpLeakage)}</td>
                  <td className="font-black text-orange-500">
                    {formatR(-s.totalLeakage)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Execution Trade Explorer"
        subtitle="Plan vs actual execution detail for each closed trade."
        info={{
          title: "Execution Trade Explorer",
          text: "Shows trade-level execution differences between plan and actual result.",
          best: "Classification mostly Plan Respected.",
          normal: "Some BE or early exit classifications.",
          worst: "Many SL Widened, Overheld Loss, or Early TP Exit trades.",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="font-black uppercase text-slate-500">
              <tr>
                <th className="py-3">Date</th>
                <th>Symbol</th>
                <th>Strategy</th>
                <th>Setup</th>
                <th>Planned SL</th>
                <th>Actual SL</th>
                <th>BE Move</th>
                <th>BE Type</th>
                <th>Planned TP</th>
                <th>Actual Exit</th>
                <th>R Missed</th>
                <th>Classification</th>
              </tr>
            </thead>
            <tbody>
              {engine.rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="py-3 font-bold">{r.date}</td>
                  <td>{r.symbol}</td>
                  <td>{r.strategy}</td>
                  <td>{r.setup}</td>
                  <td>{r.originalSL || "—"}</td>
                  <td>{r.actualSL || "—"}</td>
                  <td>{r.beMove}</td>
                  <td>{r.beType}</td>
                  <td>{r.plannedTP || "—"}</td>
                  <td>{r.exit || "—"}</td>
                  <td className="font-black text-orange-500">
                    {formatR(-r.rMissed)}
                  </td>
                  <td className="font-black text-blue-600">
                    {r.classification}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Execution Integrity Summary"
        subtitle="Final classification based on execution discipline."
        info={{
          title: "Execution Integrity Summary",
          text: "Final behavior classification based on leakage, SL respect, and TP efficiency.",
          best: "Structured Executor.",
          normal: "Stable but with one execution weakness.",
          worst: "High Leakage Trader or Reactive Risk Manager.",
        }}
      >
        <div className="rounded-3xl bg-blue-50 p-5">
          <div className="text-sm font-black text-blue-600">
            Final Classification
          </div>

          <div className="mt-2 text-3xl font-black text-slate-950">
            {engine.executionAlignmentScore >= 80
              ? "Structured Executor"
              : engine.totalTPMissed > engine.totalSLLeakage
                ? "Emotional Profit Taker"
                : engine.totalSLLeakage > 0
                  ? "Reactive Risk Manager"
                  : "High Leakage Trader"}
          </div>

          <p className="mt-2 text-sm font-bold text-slate-600">
            Focus on reducing early exits, respecting original stop logic, and
            tracking BE movement quality.
          </p>
        </div>
      </Panel>
    </div>
  );
}

function Stat({ label, value, danger, warning }) {
  return (
    <div className="mb-3 rounded-2xl bg-slate-50 p-4">
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

function Pattern({ label, value, danger, warning }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span className="text-sm font-black text-slate-800">{label}</span>
      <span
        className={
          danger
            ? "font-black text-orange-500"
            : warning
              ? "font-black text-cyan-600"
              : "font-black text-blue-600"
        }
      >
        {value}
      </span>
    </div>
  );
}
