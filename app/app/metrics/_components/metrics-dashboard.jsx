// app/app/metrics/_components/metrics-dashboard.jsx

"use client";

import { useMemo, useState } from "react";
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
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function TradeTable({ rows, type }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-slate-500">
          <tr>
            <th className="py-2">#</th>
            <th>R</th>
            <th>Symbol</th>
            <th>Setup</th>
            <th>Strategy</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((j, i) => {
            const r = round2(calculateRMultiple(j));
            return (
              <tr key={j.id} className="border-t border-slate-100">
                <td className="py-2">{i + 1}</td>
                <td
                  className={
                    type === "loss"
                      ? "font-bold text-red-600"
                      : "font-bold text-emerald-600"
                  }
                >
                  {formatR(r)}
                </td>
                <td>{j.symbols?.symbol_name || "—"}</td>
                <td>{getSetupType(j)}</td>
                <td>{getStrategyName(j)}</td>
                <td>
                  {new Date(
                    j.journal_end_at || j.created_at,
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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

  const setupTypes = useMemo(() => {
    return Array.from(
      new Set(
        journals.map((j) => getSetupType(j)).filter((x) => x && x !== "—"),
      ),
    );
  }, [journals]);

  const filtered = useMemo(() => {
    return journals.filter((j) => {
      if (accountId !== "all" && j.trading_account_id !== accountId)
        return false;
      if (strategyId !== "all" && j.strategy_id !== strategyId) return false;
      if (setupType !== "all" && getSetupType(j) !== setupType) return false;
      return true;
    });
  }, [journals, accountId, strategyId, setupType]);

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
    .slice(0, 5);

  const topLosses = [...stats.closed]
    .sort((a, b) => calculateRMultiple(a) - calculateRMultiple(b))
    .slice(0, 5);

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

        <div className="grid flex-1 gap-3 md:max-w-4xl md:grid-cols-4">
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

          <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold shadow-sm">
            <Filter className="h-4 w-4" />
            Filters
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

          <div className="grid gap-4 xl:grid-cols-3">
            <SmallPanel title="R Distribution Matrix">
              <RDistributionChart data={distribution} />
            </SmallPanel>

            <SmallPanel title="B. Top 5 R Collection (Biggest Wins)">
              <TradeTable rows={topWins} type="win" />
            </SmallPanel>

            <SmallPanel title="C. Top 5 R Losses (Biggest Losses)">
              <TradeTable rows={topLosses} type="loss" />
            </SmallPanel>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <SmallPanel title="D. Avg Win R vs Avg Loss R">
              <div className="grid grid-cols-3 items-center gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-500">
                    Avg Winning R
                  </div>
                  <div className="mt-2 text-2xl font-black text-emerald-600">
                    {formatR(stats.avgWin)}
                  </div>
                </div>

                <div className="text-center">
                  <EfficiencyDonut value={stats.rEfficiency} />
                  <div className="-mt-20 text-3xl font-black">
                    {stats.rEfficiency}
                  </div>
                  <div className="mt-16 text-xs font-bold text-slate-500">
                    R Efficiency
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-500">
                    Avg Losing R
                  </div>
                  <div className="mt-2 text-2xl font-black text-red-600">
                    -{stats.avgLoss}R
                  </div>
                </div>
              </div>
            </SmallPanel>

            <SmallPanel title="E. Drawdown Intelligence">
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div>
                  <div className="font-bold text-slate-500">Max Drawdown</div>
                  <div className="mt-1 text-lg font-black text-red-600">
                    {formatR(maxDrawdown)}
                  </div>
                </div>
                <div>
                  <div className="font-bold text-slate-500">Avg Drawdown</div>
                  <div className="mt-1 text-lg font-black text-red-600">
                    {formatR(
                      drawdownSeries.reduce((a, b) => a + b.drawdown, 0) /
                        (drawdownSeries.length || 1),
                    )}
                  </div>
                </div>
                <div>
                  <div className="font-bold text-slate-500">DD Zones</div>
                  <div className="mt-1 text-lg font-black">
                    {drawdowns.length}
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <DrawdownChart data={drawdownSeries} />
              </div>
            </SmallPanel>

            <SmallPanel title="F. Trade Quality Over Time">
              <div className="grid gap-3 md:grid-cols-[1fr_120px]">
                <QualityChart data={qualitySeries} />
                <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">
                    Avg Quality Score
                  </div>
                  <div className="mt-3 text-4xl font-black">{avgQuality}</div>
                  <div className="text-sm font-black text-emerald-600">
                    Good
                  </div>
                </div>
              </div>
            </SmallPanel>
          </div>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black">AI Behavioral Insights</h2>
              <button className="text-sm font-black text-blue-600">
                View Full AI Report →
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              <Insight
                icon={TrendingUp}
                title="Strong R Growth"
                text="Your cumulative R is trending based on closed trades."
                good
              />
              <Insight
                icon={AlertTriangle}
                title="Drawdown Detected"
                text={`${drawdowns.length} drawdown zone found in the selected period.`}
                danger
              />
              <Insight
                icon={ShieldCheck}
                title="Risk Management"
                text={`Profit factor is ${stats.profitFactor}.`}
              />
              <Insight
                icon={Trophy}
                title="Good Recovery"
                text="Recovery is measured from R curve pullbacks."
                good
              />
              <Insight
                icon={Target}
                title="Execution Opportunity"
                text={`Avg win ${formatR(stats.avgWin)}, avg loss -${stats.avgLoss}R.`}
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
