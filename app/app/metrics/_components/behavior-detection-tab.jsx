// app/app/metrics/_components/behavior-detection-tab.jsx

"use client";

import { useMemo } from "react";
import {
  Activity,
  Brain,
  Flame,
  Info,
  ShieldCheck,
  Target,
  TrendingDown,
  Zap,
} from "lucide-react";

import {
  calculateRMultiple,
  formatR,
  getStrategyName,
  getSetupType,
  round2,
} from "../_lib/metrics";

function InfoTip({ title, text, best, normal, worst }) {
  return (
    <span className="group/tip relative z-[999] inline-flex shrink-0 align-middle">
      <Info className="h-4 w-4 cursor-help text-slate-400" />

      <span className="pointer-events-none absolute left-1/2 top-7 z-[9999] w-80 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 text-left text-xs font-semibold leading-5 text-slate-600 opacity-0 shadow-2xl transition group-hover/tip:opacity-100">
        <span className="block text-sm font-black text-slate-950">{title}</span>
        <span className="mt-2 block">{text}</span>
        <span className="mt-3 block text-blue-600">Best: {best}</span>
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

function getRiskValue(j) {
  return Number(j?.risk_per_trade || 0);
}

function getClosedTrades(journals) {
  return [...journals]
    .filter((j) => calculateRMultiple(j) !== 0)
    .sort((a, b) => getTradeDate(a) - getTradeDate(b));
}

function getLastStreak(trades, type) {
  let count = 0;

  for (let i = trades.length - 1; i >= 0; i--) {
    const r = calculateRMultiple(trades[i]);

    if (type === "loss" && r < 0) count++;
    else if (type === "win" && r > 0) count++;
    else break;
  }

  return count;
}

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function detectBehavior(journals) {
  const closed = getClosedTrades(journals);
  const recent5 = closed.slice(-5);
  const recent10 = closed.slice(-10);

  const losses = closed.filter((j) => calculateRMultiple(j) < 0);
  const wins = closed.filter((j) => calculateRMultiple(j) > 0);

  const avgWinR = avg(wins.map((j) => calculateRMultiple(j)));
  const avgLossR = Math.abs(avg(losses.map((j) => calculateRMultiple(j))));

  const lastTrade = closed[closed.length - 1];
  const lastR = lastTrade ? calculateRMultiple(lastTrade) : 0;

  const consecutiveLosses = getLastStreak(closed, "loss");
  const consecutiveWins = getLastStreak(closed, "win");

  const baselineRisk = avg(
    closed.slice(0, -1).map(getRiskValue).filter(Boolean),
  );

  const currentRisk = lastTrade ? getRiskValue(lastTrade) : 0;
  const riskSpike = baselineRisk > 0 ? currentRisk / baselineRisk : 0;

  const previousWins = closed
    .slice(0, -1)
    .filter((j) => calculateRMultiple(j) > 0)
    .slice(-5);

  const previousLosses = closed
    .slice(0, -1)
    .filter((j) => calculateRMultiple(j) < 0)
    .slice(-5);

  const consumptionRatio =
    lastR < 0 && avgWinR > 0 ? Math.abs(lastR) / avgWinR : 0;

  const recoveryPower = lastR > 0 && avgLossR > 0 ? lastR / avgLossR : 0;

  let lossClusters = 0;
  let activeCluster = 0;

  for (const trade of closed) {
    const r = calculateRMultiple(trade);

    if (r < 0) {
      activeCluster++;
    } else {
      if (activeCluster >= 2) lossClusters++;
      activeCluster = 0;
    }
  }

  if (activeCluster >= 2) lossClusters++;

  const cooldownThresholdMinutes = 15;
  let noCooldownCount = 0;
  const cooldownDurations = [];

  for (let i = 1; i < closed.length; i++) {
    const prev = closed[i - 1];
    const curr = closed[i];

    if (calculateRMultiple(prev) < 0) {
      const diffMinutes =
        (getTradeDate(curr).getTime() - getTradeDate(prev).getTime()) /
        1000 /
        60;

      if (diffMinutes >= 0) {
        cooldownDurations.push(diffMinutes);

        if (diffMinutes <= cooldownThresholdMinutes) {
          noCooldownCount++;
        }
      }
    }
  }

  const avgCooldown = avg(cooldownDurations);

  const symbolBehavior = {};

  for (const trade of recent10) {
    const symbol = getSymbol(trade);
    const r = calculateRMultiple(trade);

    if (!symbolBehavior[symbol]) {
      symbolBehavior[symbol] = {
        symbol,
        trades: 0,
        wins: 0,
        losses: 0,
        totalR: 0,
      };
    }

    symbolBehavior[symbol].trades += 1;
    symbolBehavior[symbol].totalR += r;

    if (r > 0) symbolBehavior[symbol].wins += 1;
    if (r < 0) symbolBehavior[symbol].losses += 1;
  }

  const sameAsset = Object.values(symbolBehavior).sort(
    (a, b) => b.losses * b.trades - a.losses * a.trades,
  )[0];

  const sameAssetWinRate = sameAsset
    ? Math.round((sameAsset.wins / sameAsset.trades) * 100)
    : 0;

  const sameAssetCount = sameAsset?.trades || 0;

  const sameAssetFixation =
    sameAsset && sameAsset.trades >= 3 && sameAsset.losses >= 2;

  const overtradingScore = Math.min(
    100,
    recent10.length * 8 + noCooldownCount * 5,
  );

  const riskEscalationRows = [];

  for (let streak = 2; streak <= 5; streak++) {
    const beforeRisks = [];
    const afterRisks = [];

    for (let i = streak; i < closed.length; i++) {
      const previousTrades = closed.slice(i - streak, i);

      const allLosses = previousTrades.every((t) => calculateRMultiple(t) < 0);

      if (!allLosses) continue;

      const beforeRisk = avg(previousTrades.map(getRiskValue).filter(Boolean));
      const nextTrade = closed[i];
      const afterRisk = getRiskValue(nextTrade);

      if (beforeRisk > 0 && afterRisk > 0) {
        beforeRisks.push(beforeRisk);
        afterRisks.push(afterRisk);
      }
    }

    const avgBefore = avg(beforeRisks);
    const maxAfter = afterRisks.length ? Math.max(...afterRisks) : 0;

    riskEscalationRows.push({
      situation: `After ${streak} losses`,
      avgRiskBefore: round2(avgBefore),
      maxRiskAfter: round2(maxAfter),
      escalation: avgBefore > 0 ? round2(maxAfter / avgBefore) : 0,
    });
  }

  let revengeProbability = 0;

  revengeProbability += Math.min(25, consecutiveLosses * 8);
  revengeProbability += Math.min(20, lossClusters * 5);
  revengeProbability += Math.min(20, Math.max(0, riskSpike - 1) * 20);
  revengeProbability += Math.min(15, noCooldownCount * 5);

  if (sameAssetFixation) revengeProbability += 15;
  if (consumptionRatio >= 2) revengeProbability += 10;
  if (overtradingScore >= 80) revengeProbability += 10;

  revengeProbability = Math.min(100, Math.round(revengeProbability));

  let behavioralStability = 100;

  behavioralStability -= revengeProbability * 0.5;
  behavioralStability -= noCooldownCount * 4;
  behavioralStability -= lossClusters * 5;

  if (sameAssetFixation) behavioralStability -= 10;

  behavioralStability = Math.max(0, round2(behavioralStability));

  let recoveryQuality = "Neutral";

  if (recoveryPower >= 4) {
    recoveryQuality = "Aggressive Recovery";
  } else if (recoveryPower >= 2 && riskSpike >= 1.5) {
    recoveryQuality = "Emotional Recovery";
  } else if (recoveryPower >= 1 && riskSpike < 1.3) {
    recoveryQuality = "Stable Recovery";
  }

  const tradesAfter3Losses = recent10.filter((trade, index) => {
    if (index < 3) return false;

    const previousThree = recent10.slice(index - 3, index);

    return previousThree.every((t) => calculateRMultiple(t) < 0);
  }).length;

  const maxRiskAfterLossStreak = recent10.reduce((max, trade, index) => {
    if (index < 3) return max;

    const previousThree = recent10.slice(index - 3, index);
    const hadThreeLosses = previousThree.every(
      (t) => calculateRMultiple(t) < 0,
    );

    if (!hadThreeLosses) return max;

    return Math.max(max, getRiskValue(trade));
  }, 0);

  const avgTimeBetweenTradesAfterLoss =
    avgCooldown > 0 ? `${round2(avgCooldown)} mins` : "—";

  const cooldownTaken =
    avgCooldown === 0
      ? "No Data"
      : avgCooldown <= 15
        ? "No Cooldown"
        : avgCooldown <= 60
          ? "Short Cooldown"
          : "Healthy Cooldown";

  const recommendedAction =
    revengeProbability >= 70
      ? "Stop trading, reduce risk, take cooldown."
      : revengeProbability >= 40
        ? "Reduce size and avoid repeated symbols."
        : "Continue monitoring risk discipline.";

  const events = [];

  if (consecutiveLosses >= 3) {
    events.push({
      type: "critical",
      title: "Loss streak detected",
      text: `${consecutiveLosses} consecutive losses detected.`,
      trade: lastTrade,
    });
  }

  if (consumptionRatio > 2) {
    events.push({
      type: "critical",
      title: "Destructive trade detected",
      text: `Loss consumed ${round2(consumptionRatio)}x average winning efficiency.`,
      trade: lastTrade,
    });
  }

  if (riskSpike >= 1.5) {
    events.push({
      type: riskSpike >= 2 ? "critical" : "warning",
      title: "Risk escalation detected",
      text: `Risk increased ${round2(riskSpike)}x above baseline.`,
      trade: lastTrade,
    });
  }

  if (sameAssetFixation) {
    events.push({
      type: "warning",
      title: "Same asset fixation detected",
      text: `${sameAsset.trades} recent trades on ${sameAsset.symbol}, with ${sameAsset.losses} losses.`,
      trade: lastTrade,
    });
  }

  if (noCooldownCount > 0) {
    events.push({
      type: noCooldownCount >= 2 ? "critical" : "warning",
      title: "No-cooldown behavior detected",
      text: `${noCooldownCount} trade(s) opened within ${cooldownThresholdMinutes} minutes after a loss.`,
      trade: lastTrade,
    });
  }

  if (recoveryPower > 2) {
    events.push({
      type: recoveryPower >= 4 ? "warning" : "recovery",
      title: "Recovery trade detected",
      text: `Trade recovered ${round2(recoveryPower)}x average previous losses. Classification: ${recoveryQuality}.`,
      trade: lastTrade,
    });
  }

  if (!events.length) {
    events.push({
      type: "neutral",
      title: "No critical loop detected",
      text: "Current filtered trades show no major behavioral breakdown.",
      trade: lastTrade,
    });
  }

  return {
    closed,
    recent5,
    recent10,
    previousWins,
    previousLosses,
    lastTrade,
    lastR,
    avgWinR,
    avgLossR,
    consumptionRatio,
    recoveryPower,
    recoveryQuality,
    riskSpike,
    baselineRisk,
    currentRisk,
    consecutiveLosses,
    consecutiveWins,
    revengeProbability,
    overtradingScore,
    behavioralStability,
    sameAssetCount,
    sameAssetFixation,
    noCooldownCount,
    avgCooldown,
    events,
    lossClusters,
    sameAsset,
    sameAssetWinRate,
    riskEscalationRows,
    avgTimeBetweenTradesAfterLoss,
    tradesAfter3Losses,
    maxRiskAfterLossStreak,
    cooldownTaken,
    recommendedAction,
  };
}

function MetricCard({ icon: Icon, label, value, sub, info, danger, warning }) {
  return (
    <div className="group/card relative z-0 min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:z-50 hover:-translate-y-0.5 hover:shadow-md">
      <div className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 pr-12">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-500">
          <span>{label}</span>
          {info ? <InfoTip {...info} /> : null}
        </div>

        <div
          className={[
            "mt-5 text-3xl font-black leading-none",
            danger
              ? "text-orange-500"
              : warning
                ? "text-cyan-600"
                : "text-blue-600",
          ].join(" ")}
        >
          {value}
        </div>

        <div className="mt-3 text-xs font-bold leading-5 text-slate-500">
          {sub}
        </div>
      </div>
    </div>
  );
}

function InfoValueBox({ label, value, tone = "blue", info }) {
  const boxClass =
    tone === "orange"
      ? "bg-orange-50"
      : tone === "dark"
        ? "bg-slate-50"
        : "bg-slate-50";

  const valueClass =
    tone === "orange"
      ? "text-orange-500"
      : tone === "dark"
        ? "text-slate-950"
        : "text-blue-600";

  const labelClass = tone === "orange" ? "text-orange-600" : "text-slate-500";

  return (
    <div className={`min-w-0 rounded-3xl p-5 ${boxClass}`}>
      <div
        className={`flex items-center gap-2 text-xs font-black uppercase ${labelClass}`}
      >
        <span>{label}</span>
        {info ? <InfoTip {...info} /> : null}
      </div>

      <div className={`mt-3 break-words text-3xl font-black ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

function Badge({ type }) {
  const cls =
    type === "critical"
      ? "bg-orange-100 text-orange-700"
      : type === "warning"
        ? "bg-cyan-100 text-cyan-700"
        : type === "recovery"
          ? "bg-blue-100 text-blue-700"
          : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${cls}`}
    >
      {type}
    </span>
  );
}

function TradeMini({ trade }) {
  if (!trade) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm font-bold text-slate-500">
        No matching trade found.
      </div>
    );
  }

  const r = round2(calculateRMultiple(trade));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-slate-950">
            {getSymbol(trade)}
          </div>
          <div className="mt-1 text-xs font-bold text-slate-500">
            {getSetupType(trade)} · {getStrategyName(trade)}
          </div>
        </div>

        <div
          className={
            r < 0
              ? "shrink-0 text-lg font-black text-orange-500"
              : "shrink-0 text-lg font-black text-blue-600"
          }
        >
          {formatR(r)}
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, info, children }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        {info ? <InfoTip {...info} /> : null}
      </div>

      <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>

      <div className="mt-5">{children}</div>
    </section>
  );
}

function SummaryItem({ label, value, info }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-500">
        <span>{label}</span>
        {info ? <InfoTip {...info} /> : null}
      </div>

      <div className="mt-2 text-lg font-black text-slate-950">{value}</div>
    </div>
  );
}

export default function BehaviorDetectionTab({ journals }) {
  const engine = useMemo(() => detectBehavior(journals), [journals]);

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-black text-blue-600">
              <Brain className="h-4 w-4" />
              DETECTION ENGINE
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
              Behavioral Reflection
            </h1>

            <p className="mt-2 text-sm font-medium text-slate-500">
              Pattern Recognition + Behavioral Quantification
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <MetricCard
          icon={Brain}
          label="Revenge Probability"
          value={`${engine.revengeProbability}%`}
          sub={
            engine.revengeProbability >= 70
              ? "High Risk"
              : engine.revengeProbability >= 40
                ? "Warning"
                : "Stable"
          }
          info={{
            title: "Revenge Probability",
            text: "Based on loss streaks, risk escalation, same-asset repetition, overtrading, and destructive losses.",
            best: "Under 30%.",
            normal: "30% to 50%.",
            worst: "Above 70%.",
          }}
          danger={engine.revengeProbability >= 70}
          warning={engine.revengeProbability >= 40}
        />

        <MetricCard
          icon={TrendingDown}
          label="Consecutive Losses"
          value={engine.consecutiveLosses}
          sub="Current streak"
          info={{
            title: "Consecutive Losses",
            text: "Current continuous losing streak from the latest closed trades.",
            best: "0 to 1.",
            normal: "2 losses.",
            worst: "3+ losses.",
          }}
          danger={engine.consecutiveLosses >= 3}
          warning={engine.consecutiveLosses === 2}
        />

        <MetricCard
          icon={Flame}
          label="Loss Clusters"
          value={engine.lossClusters}
          sub="Detected"
          info={{
            title: "Loss Clusters",
            text: "Counts grouped losses in the filtered period.",
            best: "Low clustered losses.",
            normal: "Some grouped losses.",
            worst: "Multiple losses grouped closely.",
          }}
          danger={engine.lossClusters >= 5}
        />

        <MetricCard
          icon={Zap}
          label="Risk Escalation"
          value={`${round2(engine.riskSpike)}x`}
          sub="After losses"
          info={{
            title: "Risk Escalation",
            text: "Current risk compared with baseline risk.",
            best: "Around 1x.",
            normal: "Below 1.5x.",
            worst: "Above 2x.",
          }}
          danger={engine.riskSpike >= 2}
          warning={engine.riskSpike >= 1.5}
        />

        <MetricCard
          icon={Target}
          label="Same Asset Obsession"
          value={engine.sameAsset?.symbol || "—"}
          sub={`${engine.sameAsset?.trades || 0} trades`}
          info={{
            title: "Same Asset Obsession",
            text: "Detects repeated trading on one symbol during drawdown.",
            best: "Diversified focus.",
            normal: "2 trades on same symbol.",
            worst: "3+ repeated trades.",
          }}
          warning={(engine.sameAsset?.trades || 0) >= 3}
        />

        <MetricCard
          icon={Activity}
          label="Overtrading Score"
          value={`${engine.overtradingScore}/100`}
          sub={engine.overtradingScore >= 80 ? "Extreme" : "Recent pressure"}
          info={{
            title: "Overtrading Score",
            text: "Measures recent trade pressure from the latest 10 trades.",
            best: "Under 40.",
            normal: "40 to 60.",
            worst: "Above 80.",
          }}
          danger={engine.overtradingScore >= 80}
          warning={engine.overtradingScore >= 60}
        />

        <MetricCard
          icon={ShieldCheck}
          label="Behavioral Stability"
          value={`${round2(engine.behavioralStability)}%`}
          sub={engine.behavioralStability < 40 ? "Poor" : "Control score"}
          info={{
            title: "Behavioral Stability",
            text: "Overall emotional control score.",
            best: "Above 70%.",
            normal: "50% to 70%.",
            worst: "Below 40%.",
          }}
          danger={engine.behavioralStability < 40}
          warning={
            engine.behavioralStability >= 40 && engine.behavioralStability < 70
          }
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Section
            title="Trade Consumption Detection"
            subtitle="Detects when one loss destroys multiple previous wins."
            info={{
              title: "Trade Consumption Detection",
              text: "Compares the latest loss against your average winning R.",
              best: "Loss consumes less than 1 average win.",
              normal: "Loss consumes 1 to 2 average wins.",
              worst: "Loss consumes more than 2 average wins.",
            }}
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
              <div className="space-y-3">
                <div className="text-xs font-black uppercase text-slate-500">
                  Previous Winning Trades
                </div>

                {engine.previousWins.length ? (
                  engine.previousWins.map((trade) => (
                    <TradeMini key={trade.id} trade={trade} />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm font-bold text-slate-500">
                    No previous wins found.
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-black uppercase text-slate-500">
                  Current Loss Trade
                </div>

                <div className="mt-3">
                  <TradeMini
                    trade={engine.lastR < 0 ? engine.lastTrade : null}
                  />
                </div>

                <div className="mt-4 rounded-3xl bg-orange-50 p-5">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-orange-600">
                    <span>Consumption Ratio</span>
                    <InfoTip
                      title="Consumption Ratio"
                      text="abs(CurrentLossR) divided by AvgWinR."
                      best="Below 1x."
                      normal="1x to 2x."
                      worst="Above 2x destructive."
                    />
                  </div>

                  <div className="mt-2 text-4xl font-black text-orange-500">
                    {round2(engine.consumptionRatio)}x
                  </div>

                  <p className="mt-2 text-sm font-bold text-orange-700">
                    {engine.consumptionRatio > 2
                      ? "Destructive trade detected."
                      : "No destructive consumption detected."}
                  </p>
                </div>
              </div>
            </div>
          </Section>

          <Section
            title="Recovery Trade Detection"
            subtitle="Detects when one trade recovers multiple losses."
            info={{
              title: "Recovery Trade Detection",
              text: "Compares latest winning trade against average previous loss.",
              best: "Controlled recovery around 1x to 2.5x.",
              normal: "Strong but acceptable recovery up to 4x.",
              worst: "4x+ can indicate aggressive emotional recovery.",
            }}
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
              <div className="space-y-3">
                <div className="text-xs font-black uppercase text-slate-500">
                  Previous Losses
                </div>

                {engine.previousLosses.length ? (
                  engine.previousLosses.map((trade) => (
                    <TradeMini key={trade.id} trade={trade} />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm font-bold text-slate-500">
                    No previous losses found.
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-black uppercase text-slate-500">
                  Recovery Trade
                </div>

                <div className="mt-3">
                  <TradeMini
                    trade={engine.lastR > 0 ? engine.lastTrade : null}
                  />
                </div>

                <div className="mt-4 rounded-3xl bg-blue-50 p-5">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600">
                    <span>Recovery Power</span>
                    <InfoTip
                      title="Recovery Power"
                      text="CurrentWinR divided by abs(AvgPreviousLossR)."
                      best="1x to 2.5x controlled recovery."
                      normal="2.5x to 4x strong recovery."
                      worst="4x+ aggressive or emotional recovery."
                    />
                  </div>

                  <div className="mt-2 text-4xl font-black text-blue-600">
                    {round2(engine.recoveryPower)}x
                  </div>

                  <p className="mt-2 text-sm font-bold text-blue-700">
                    {engine.recoveryPower > 4
                      ? "Aggressive recovery attempt."
                      : engine.recoveryPower > 2
                        ? "Strong recovery trade."
                        : "No major recovery event."}
                  </p>
                </div>
              </div>
            </div>
          </Section>

          <Section
            title="Post-Streak Risk Behavior"
            subtitle="Detects overconfidence, aggressive recovery, and fear contraction."
            info={{
              title: "Post-Streak Risk Behavior",
              text: "Compares current risk against your previous average risk.",
              best: "Risk remains close to baseline.",
              normal: "Small increase or decrease after streaks.",
              worst: "Large spike after losses or wins.",
            }}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <InfoValueBox
                label="Baseline Risk"
                value={`${round2(engine.baselineRisk)}%`}
                tone="dark"
                info={{
                  title: "Baseline Risk",
                  text: "Average risk from previous filtered trades, excluding the latest trade.",
                  best: "Consistent and close to planned risk.",
                  normal: "Small variation around usual risk.",
                  worst: "Very high or unstable baseline risk.",
                }}
              />

              <InfoValueBox
                label="Current Risk"
                value={`${round2(engine.currentRisk)}%`}
                tone="blue"
                info={{
                  title: "Current Risk",
                  text: "Risk used on the latest closed trade.",
                  best: "Equal to or below planned risk.",
                  normal: "Slightly above baseline.",
                  worst: "Much higher than baseline after a loss or streak.",
                }}
              />

              <InfoValueBox
                label="Risk Spike"
                value={`${round2(engine.riskSpike)}x`}
                tone="orange"
                info={{
                  title: "Risk Spike",
                  text: "Current risk divided by baseline risk.",
                  best: "Below 1.2x.",
                  normal: "1.2x to 1.5x.",
                  worst: "2x or higher.",
                }}
              />
            </div>
          </Section>

          <Section
            title="Revenge Probability Breakdown"
            subtitle="Dynamic behavioral probability based on recent trades."
            info={{
              title: "Revenge Probability Breakdown",
              text: "Shows the factors currently contributing to revenge-trading probability.",
              best: "Most factors clear.",
              normal: "One or two warning factors active.",
              worst: "Multiple active factors at the same time.",
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["Consecutive Losses", engine.consecutiveLosses >= 2],
                ["Risk Escalation", engine.riskSpike >= 1.5],
                ["Same Asset Obsession", engine.sameAssetCount >= 3],
                ["Overtrading", engine.overtradingScore >= 60],
                ["Destructive Trade", engine.consumptionRatio >= 2],
                ["Recovery Instability", engine.recoveryPower >= 4],
              ].map(([label, active]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <span className="text-sm font-black text-slate-800">
                    {label}
                  </span>

                  <span
                    className={
                      active
                        ? "rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700"
                        : "rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-600"
                    }
                  >
                    {active ? "Detected" : "Clear"}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-950">
              Detected Events
            </h2>
            <InfoTip
              title="Detected Events"
              text="Recent behavioral alerts generated from filtered trades."
              best="Only neutral or recovery events."
              normal="One warning event."
              worst="Multiple critical events."
            />
          </div>

          <p className="mt-1 text-sm font-medium text-slate-500">
            Recent behavioral timeline
          </p>

          <div className="mt-5 max-h-[720px] space-y-3 overflow-y-auto pr-1">
            {engine.events.map((event, index) => (
              <div
                key={`${event.title}-${index}`}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-950">
                      {event.title}
                    </div>

                    <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                      {event.text}
                    </p>
                  </div>

                  <Badge type={event.type} />
                </div>

                {event.trade ? (
                  <div className="mt-3 text-xs font-bold text-slate-500">
                    {getSymbol(event.trade)} ·{" "}
                    {formatR(calculateRMultiple(event.trade))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </aside>
      </div>
      <Section
        title="Behavioral Intelligence Summary"
        subtitle="Institutional summary of current filtered trading behavior."
        info={{
          title: "Behavioral Intelligence Summary",
          text: "Summarizes the current psychological and execution state from filtered trades.",
          best: "Controlled, stable, low revenge probability.",
          normal: "Some warning signals but no critical loop.",
          worst: "Reactive behavior, high risk expansion, destructive losses.",
        }}
      >
        <div className="grid gap-4 md:grid-cols-5">
          <SummaryItem
            label="Pattern Detected"
            value={
              engine.revengeProbability >= 60 ? "High Risk Loop" : "Controlled"
            }
            info={{
              title: "Pattern Detected",
              text: "Overall behavioral pattern from all active detection rules.",
              best: "Controlled.",
              normal: "Watchlist.",
              worst: "High Risk Loop.",
            }}
          />

          <SummaryItem
            label="Risk Behavior"
            value={engine.riskSpike >= 1.5 ? "Expanded" : "Stable"}
            info={{
              title: "Risk Behavior",
              text: "Checks whether current risk is expanding above baseline.",
              best: "Stable.",
              normal: "Slightly expanded.",
              worst: "Aggressively expanded.",
            }}
          />

          <SummaryItem
            label="Execution Quality"
            value={engine.behavioralStability >= 60 ? "Acceptable" : "Unstable"}
            info={{
              title: "Execution Quality",
              text: "Uses behavioral stability score to estimate execution control.",
              best: "Stable.",
              normal: "Acceptable.",
              worst: "Unstable.",
            }}
          />

          <SummaryItem
            label="Recovery Quality"
            value={
              engine.recoveryPower >= 4
                ? "Aggressive"
                : engine.recoveryPower >= 2
                  ? "Strong"
                  : "Neutral"
            }
            info={{
              title: "Recovery Quality",
              text: "Checks if recovery is controlled or emotionally aggressive.",
              best: "Stable.",
              normal: "Strong.",
              worst: "Aggressive.",
            }}
          />

          <SummaryItem
            label="Emotional State"
            value={engine.consecutiveLosses >= 3 ? "Reactive" : "Balanced"}
            info={{
              title: "Emotional State",
              text: "Estimated from loss streak, risk spike, and revenge probability.",
              best: "Balanced.",
              normal: "Alert.",
              worst: "Reactive.",
            }}
          />
        </div>

        <div className="mt-5 rounded-3xl bg-slate-950 p-5 text-white">
          <div className="flex items-center gap-2 text-sm font-black">
            <span>AI Warning</span>
            <InfoTip
              title="AI Warning"
              text="Final behavior recommendation generated from current detection signals."
              best="Continue current process."
              normal="Monitor risk and cooldown."
              worst="Reduce risk and stop trading temporarily."
            />
          </div>

          <p className="mt-2 text-sm font-medium text-slate-300">
            {engine.revengeProbability >= 60
              ? "Focus on cooldown periods and reduce position risk after losses. Current behavior shows elevated emotional trading probability."
              : "Current filtered trades show controlled behavior. Continue monitoring risk spikes after streaks."}
          </p>
        </div>
      </Section>
      <RevengeDetectionEngine engine={engine} />
    </div>
  );
}

function RevengeDetectionEngine({ engine }) {
  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-black text-blue-600">
          <Brain className="h-4 w-4" />
          REVENGE ENGINE
        </div>

        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
          Revenge Detection Engine
        </h1>

        <p className="mt-2 text-sm font-medium text-slate-500">
          Pattern Recognition + Behavioral Quantification
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <Section
          title="Risk Escalation After Losses"
          subtitle="Detects risk expansion after losing streaks."
          info={{
            title: "Risk Escalation After Losses",
            text: "Measures how aggressively risk increases after consecutive losing streaks.",
            best: "Risk remains near baseline after losses.",
            normal: "Small increase in risk after drawdown.",
            worst: "Large risk expansion after losses.",
          }}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-3 px-2 text-[11px] font-black uppercase tracking-wide text-slate-400">
              <div>Situation</div>
              <div>Avg Before</div>
              <div>Max After</div>
              <div>Escalation</div>
            </div>

            {engine.riskEscalationRows.map((row) => (
              <div
                key={row.situation}
                className="grid grid-cols-4 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-bold"
              >
                <div className="text-slate-700">{row.situation}</div>

                <div className="text-slate-950">{row.avgRiskBefore}%</div>

                <div className="text-blue-600">{row.maxRiskAfter}%</div>

                <div
                  className={
                    row.escalation >= 2
                      ? "text-orange-500"
                      : row.escalation >= 1.5
                        ? "text-cyan-600"
                        : "text-blue-600"
                  }
                >
                  {row.escalation}x
                </div>
              </div>
            ))}

            <div className="rounded-3xl bg-slate-950 p-4 text-white">
              <div className="flex items-center gap-2 text-sm font-black">
                <span>AI Insight</span>

                <InfoTip
                  title="Risk Escalation AI Insight"
                  text="Behavioral interpretation of post-loss risk expansion."
                  best="Risk remains controlled after losses."
                  normal="Moderate emotional expansion."
                  worst="Aggressive revenge-risk escalation."
                />
              </div>

              <p className="mt-2 text-sm font-medium text-slate-300">
                {engine.riskSpike >= 2
                  ? "High escalation detected after losses. Maintain stable position sizing to avoid revenge behavior."
                  : engine.riskSpike >= 1.5
                    ? "Moderate risk escalation detected. Monitor emotional expansion after drawdowns."
                    : "Risk behavior currently appears controlled after losses."}
              </p>
            </div>
          </div>
        </Section>

        <Section
          title="Same Asset Obsession"
          subtitle="Detects repeated trading on the same symbol during drawdown."
          info={{
            title: "Same Asset Obsession",
            text: "Detects emotional fixation on a single asset during losing periods.",
            best: "Diversified trading behavior.",
            normal: "Occasional repeated symbol focus.",
            worst: "Repeated forced trades on same symbol during drawdown.",
          }}
        >
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-5 gap-3 text-xs font-black uppercase text-slate-500">
              <div>Symbol</div>
              <div>Trades</div>
              <div>Win Rate</div>
              <div>Total R</div>
              <div>Behavior</div>
            </div>

            <div className="mt-4 grid grid-cols-5 gap-3 text-sm font-black text-slate-900">
              <div>{engine.sameAsset?.symbol || "—"}</div>

              <div>{engine.sameAsset?.trades || 0}</div>

              <div>{engine.sameAssetWinRate}%</div>

              <div
                className={
                  (engine.sameAsset?.totalR || 0) < 0
                    ? "text-orange-500"
                    : "text-blue-600"
                }
              >
                {formatR(engine.sameAsset?.totalR || 0)}
              </div>

              <div
                className={
                  engine.sameAssetFixation ? "text-orange-500" : "text-blue-600"
                }
              >
                {engine.sameAssetFixation ? "Fixation" : "Normal"}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-3xl bg-slate-950 p-4 text-white">
            <div className="flex items-center gap-2 text-sm font-black">
              <span>AI Insight</span>

              <InfoTip
                title="Same Asset Obsession Insight"
                text="Behavioral interpretation of repeated symbol focus."
                best="Flexible symbol selection."
                normal="Minor emotional attachment."
                worst="Revenge fixation on same asset."
              />
            </div>

            <p className="mt-2 text-sm font-medium text-slate-300">
              {engine.sameAssetFixation
                ? `You repeatedly traded ${engine.sameAsset?.symbol} during drawdown. Consider cooldown or switching focus.`
                : "No major same-asset fixation behavior detected."}
            </p>
          </div>
        </Section>

        <Section
          title="Bottom Quick Behavioral Metrics"
          subtitle="Fast revenge-behavior summary."
          info={{
            title: "Quick Behavioral Metrics",
            text: "Fast behavioral summary of cooldown, revenge pressure, and post-loss reactions.",
            best: "Healthy cooldown and stable discipline.",
            normal: "Minor emotional pressure detected.",
            worst: "No cooldown with aggressive revenge behavior.",
          }}
        >
          <div className="grid gap-3">
            <SummaryItem
              label="Avg Time After Loss"
              value={engine.avgTimeBetweenTradesAfterLoss}
              info={{
                title: "Avg Time After Loss",
                text: "Average cooldown duration after a losing trade.",
                best: "30+ minute cooldown.",
                normal: "15–30 minutes.",
                worst: "Immediate re-entry after losses.",
              }}
            />

            <SummaryItem
              label="Trades After 3+ Losses"
              value={engine.tradesAfter3Losses}
              info={{
                title: "Trades After 3+ Losses",
                text: "Number of trades taken after a heavy losing streak.",
                best: "Low or zero.",
                normal: "Controlled continuation.",
                worst: "Aggressive revenge continuation.",
              }}
            />

            <SummaryItem
              label="Max Risk After Streak"
              value={`${round2(engine.maxRiskAfterLossStreak)}%`}
              info={{
                title: "Max Risk After Loss Streak",
                text: "Highest risk used after multiple consecutive losses.",
                best: "Risk unchanged.",
                normal: "Slight increase.",
                worst: "Large emotional risk expansion.",
              }}
            />

            <SummaryItem
              label="Cooldown Taken"
              value={engine.cooldownTaken}
              info={{
                title: "Cooldown Taken",
                text: "Behavioral cooldown quality after losses.",
                best: "Healthy cooldown.",
                normal: "Short cooldown.",
                worst: "No cooldown behavior.",
              }}
            />

            <SummaryItem
              label="Recommended Action"
              value={engine.recommendedAction}
              info={{
                title: "Recommended Action",
                text: "Behavioral recommendation based on revenge detection signals.",
                best: "Continue disciplined execution.",
                normal: "Reduce emotional exposure.",
                worst: "Pause trading and reset emotionally.",
              }}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
