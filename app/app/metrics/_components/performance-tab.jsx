"use client";

import {
  Sparkles,
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
import CumulativeREChart from "./cumulative-r-echart";

import {
  calculateRMultiple,
  formatR,
  getSetupType,
  getStrategyName,
  round2,
} from "../_lib/metrics";

function SmallPanel({ title, children }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      {title ? (
        <h3 className="text-sm font-black text-slate-900">{title}</h3>
      ) : null}
      <div className={title ? "mt-4 min-w-0" : "min-w-0"}>{children}</div>
    </div>
  );
}

function ClientDate({ value }) {
  const [text, setText] = React.useState("");

  React.useEffect(() => {
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

import React from "react";

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

export default function PerformanceTab({
  expanded,
  setExpanded,
  stats,
  curve,
  maxDrawdown,
  distribution,
  drawdownSeries,
  drawdowns,
  qualitySeries,
  avgQuality,
  topWins,
  topLosses,
}) {
  return (
    <>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
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
          <h2 className="text-2xl font-black">R Curve</h2>

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
            <MetricCard label="Avg Win R" value={formatR(stats.avgWin)} good />
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
            <h2 className="mb-4 text-lg font-black text-slate-950">
              AI Behavioral Insights
            </h2>

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
    </>
  );
}

function AvgWinLossBlock({ stats }) {
  return (
    <div className="min-w-0 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="text-sm font-black text-slate-900">Execution Balance</h4>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs font-bold text-slate-500">Avg Winning R</div>
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
        <QualityChart data={qualitySeries} />
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

function Insight({ icon: Icon, title, text, good, danger }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div
        className={[
          "mb-3 flex h-10 w-10 items-center justify-center rounded-2xl",
          good ? "bg-blue-50 text-blue-600" : "",
          danger ? "bg-orange-50 text-orange-500" : "",
          !good && !danger ? "bg-slate-100 text-slate-600" : "",
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
