import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const CLOSED_STATUSES = [
  "TRADE CLOSE WITH PROFIT",
  "TRADE EXIT IN MID",
  "TRADE SL HIT",
];

const WIN_STATUSES = ["TRADE CLOSE WITH PROFIT", "TRADE EXIT IN MID"];

function getWeightedTakeProfit(journal) {
  const prices = Array.isArray(journal.take_profit) ? journal.take_profit : [];
  const qtys = Array.isArray(journal.take_profit_qty)
    ? journal.take_profit_qty
    : [];

  if (prices.length === 0) return 0;

  if (qtys.length === prices.length) {
    let weightedSum = 0;
    let totalQty = 0;

    for (let i = 0; i < prices.length; i++) {
      const price = Number(prices[i]);
      const qty = Number(qtys[i]);

      if (Number.isNaN(price) || Number.isNaN(qty) || qty <= 0) continue;

      weightedSum += price * qty;
      totalQty += qty;
    }

    if (totalQty > 0) return weightedSum / totalQty;
  }

  const validPrices = prices.map(Number).filter((n) => !Number.isNaN(n));
  if (validPrices.length === 0) return 0;

  return validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
}

function calculatePlannedRR(journal) {
  const direction = String(journal.direction || "").toUpperCase();
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

function calculateRMultiple(journal) {
  const status = String(journal.status || "").toUpperCase();
  const direction = String(journal.direction || "").toUpperCase();

  const entry = Number(journal.entry_price);
  const stop = Number(journal.stop_loss);
  const exit = Number(journal.exit_price);

  if (!CLOSED_STATUSES.includes(status)) return 0;
  if (!(entry > 0) || !(stop > 0)) return 0;

  if (status === "TRADE SL HIT") return -1;

  if (!(exit > 0)) return 0;

  if (direction === "BUY") {
    const risk = entry - stop;
    if (risk <= 0) return 0;
    return (exit - entry) / risk;
  }

  if (direction === "SELL") {
    const risk = stop - entry;
    if (risk <= 0) return 0;
    return (entry - exit) / risk;
  }

  return 0;
}

function calculateExecutionScore(journal) {
  const status = String(journal.status || "").toUpperCase();

  if (!CLOSED_STATUSES.includes(status)) return 0;

  const actualR = calculateRMultiple(journal);
  const plannedRR = calculatePlannedRR(journal);

  if (!(plannedRR > 0)) return 0;

  const ratio = actualR / plannedRR;

  if (ratio <= 0) return 1;

  let score = 1 + ratio * 6;
  score = Math.max(1, Math.min(10, score));

  return Math.round(score);
}

function mapDeviationToScore(percent) {
  if (percent <= 0) return 20;

  let score = 20 - percent / 5;
  score = Math.max(1, Math.min(20, score));

  return Math.round(score);
}

function calculateRDeviationScore(journal) {
  const actualR = calculateRMultiple(journal);
  const plannedRR = calculatePlannedRR(journal);

  if (!(plannedRR > 0)) return 0;

  const percent = (Math.abs(actualR - plannedRR) / plannedRR) * 100;
  return mapDeviationToScore(percent);
}

function getDeviationQualityTagFromScore(score) {
  if (score >= 17) return "🟢 High Discipline";
  if (score >= 12) return "🟡 Moderate Discipline";
  if (score >= 6) return "🟠 Poor Discipline";
  return "🔴 Severe Discipline Breakdown";
}

function calculatePositiveDeviationScore(journal) {
  const actualR = calculateRMultiple(journal);
  const plannedRR = calculatePlannedRR(journal);

  if (!(plannedRR > 0)) return 0;
  if (actualR <= plannedRR) return 0;

  const percent = ((actualR - plannedRR) / plannedRR) * 100;
  return mapDeviationToScore(percent);
}

function calculateNegativeDeviationScore(journal) {
  const actualR = calculateRMultiple(journal);
  const plannedRR = calculatePlannedRR(journal);

  if (!(plannedRR > 0)) return 0;
  if (actualR >= plannedRR) return 0;

  const percent = ((plannedRR - actualR) / plannedRR) * 100;
  return mapDeviationToScore(percent);
}

function getRiskAmountUSD(journal) {
  const riskMode = String(journal.risk_mode || "").toUpperCase();
  const riskPerTrade = Number(journal.risk_per_trade);
  const accountSize = Number(journal?.trading_accounts?.account_size);

  if (!(riskPerTrade > 0)) return 0;

  if (riskMode === "AMOUNT") {
    return riskPerTrade;
  }

  if (riskMode === "PERCENT") {
    if (!(accountSize > 0)) return 0;
    return (accountSize * riskPerTrade) / 100;
  }

  return 0;
}

function calculateProfitLossUSD(journal) {
  const rMultiple = calculateRMultiple(journal);
  const riskAmount = getRiskAmountUSD(journal);
  return rMultiple * riskAmount;
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function formatUSD(n) {
  const value = round2(n);
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function isClosedTrade(journal) {
  const status = String(journal.status || "").toUpperCase();
  return CLOSED_STATUSES.includes(status);
}

function isWinningTrade(journal) {
  const status = String(journal.status || "").toUpperCase();
  const r = calculateRMultiple(journal);

  if (!WIN_STATUSES.includes(status)) return false;
  return r > 0;
}

function MetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-4">
      <div className="text-sm font-medium">{label}</div>
      <div className="text-sm text-muted-foreground">{value}</div>
    </div>
  );
}

function getTradeDiscipline(journal) {
  const actualR = calculateRMultiple(journal);
  const plannedRR = calculatePlannedRR(journal);

  if (!(plannedRR > 0)) return "Needs review";

  if (actualR >= plannedRR) return "Optimal Exit";

  if (actualR > 0 && actualR < plannedRR) return "Early exit / fear";

  if (actualR === -1) return "SL respected";

  if (plannedRR >= 2 && actualR < 0) return "Psychology issue";

  return "Needs review";
}

function getTradeWarning(journal) {
  const actualR = calculateRMultiple(journal);
  const plannedRR = calculatePlannedRR(journal);

  if (!(plannedRR > 0)) return null;

  // ⚠️ Early exit on high RR trades
  if (plannedRR >= 2 && actualR > 0 && actualR < plannedRR * 0.5) {
    return "⚠️ Early exit on high RR trade";
  }

  // 🚨 Psychology breakdown
  if (plannedRR >= 2 && actualR < 0) {
    return "🚨 Psychology breakdown";
  }

  return null;
}

export default async function MetricsPage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) redirect("/login");

  const { data: journals, error } = await supabase
    .from("journals")
    .select(
      `
      id,
      purpose,
      status,
      direction,
      entry_price,
      stop_loss,
      exit_price,
      take_profit,
      take_profit_qty,
      quantity,
      risk_mode,
      risk_per_trade,
      created_at,
      trading_accounts:trading_account_id (
        id,
        account_name,
        account_size
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Metrics</h1>
        <p className="mt-3 text-sm text-destructive">{error.message}</p>
      </div>
    );
  }

  const allJournals = journals || [];
  const closedTrades = allJournals.filter(isClosedTrade);

  const totalJournals = allJournals.length;
  const totalClosedTrades = closedTrades.length;

  const totalR = round2(
    closedTrades.reduce((sum, journal) => sum + calculateRMultiple(journal), 0),
  );

  const totalProfitLossUSD = round2(
    closedTrades.reduce(
      (sum, journal) => sum + calculateProfitLossUSD(journal),
      0,
    ),
  );

  const plannedRRValues = allJournals
    .map((journal) => calculatePlannedRR(journal))
    .filter((n) => n > 0);

  const avgPlannedRR = plannedRRValues.length
    ? round2(
        plannedRRValues.reduce((sum, value) => sum + value, 0) /
          plannedRRValues.length,
      )
    : 0;

  const executionScores = closedTrades
    .map((journal) => calculateExecutionScore(journal))
    .filter((n) => n > 0);

  const avgExecutionScore = executionScores.length
    ? Math.round(
        executionScores.reduce((sum, value) => sum + value, 0) /
          executionScores.length,
      )
    : 0;

  const winningTrades = closedTrades.filter(isWinningTrade);
  const totalWinningTrades = winningTrades.length;

  const winRate = totalClosedTrades
    ? round2((totalWinningTrades / totalClosedTrades) * 100)
    : 0;

  const expectancy = totalClosedTrades ? round2(totalR / totalClosedTrades) : 0;

  const grossProfit = round2(
    closedTrades.reduce((sum, journal) => {
      const r = calculateRMultiple(journal);
      return r > 0 ? sum + r : sum;
    }, 0),
  );

  const grossLoss = round2(
    Math.abs(
      closedTrades.reduce((sum, journal) => {
        const r = calculateRMultiple(journal);
        return r < 0 ? sum + r : sum;
      }, 0),
    ),
  );

  const profitFactor =
    grossLoss > 0 ? round2(grossProfit / grossLoss) : grossProfit > 0 ? "∞" : 0;

  const rDeviationValues = closedTrades
    .map((journal) => calculateRDeviationScore(journal))
    .filter((n) => n > 0);

  const avgRDeviationScore = rDeviationValues.length
    ? Math.round(
        rDeviationValues.reduce((sum, value) => sum + value, 0) /
          rDeviationValues.length,
      )
    : 0;

  const deviationQualityTag =
    avgRDeviationScore > 0
      ? getDeviationQualityTagFromScore(avgRDeviationScore)
      : "—";

  const positiveDeviationValues = closedTrades
    .map((journal) => calculatePositiveDeviationScore(journal))
    .filter((n) => n > 0);

  const avgPositiveDeviationScore = positiveDeviationValues.length
    ? Math.round(
        positiveDeviationValues.reduce((sum, value) => sum + value, 0) /
          positiveDeviationValues.length,
      )
    : 0;

  const negativeDeviationValues = closedTrades
    .map((journal) => calculateNegativeDeviationScore(journal))
    .filter((n) => n > 0);

  const avgNegativeDeviationScore = negativeDeviationValues.length
    ? Math.round(
        negativeDeviationValues.reduce((sum, value) => sum + value, 0) /
          negativeDeviationValues.length,
      )
    : 0;

  const disciplineCounts = {
    "Optimal Exit": 0,
    "Early exit / fear": 0,
    "SL respected": 0,
    "Psychology issue": 0,
    "Needs review": 0,
  };

  closedTrades.forEach((journal) => {
    const tag = getTradeDiscipline(journal);
    if (disciplineCounts[tag] !== undefined) {
      disciplineCounts[tag]++;
    }
  });

  // find most frequent discipline
  let dominantDiscipline = "—";
  let maxCount = 0;

  for (const key in disciplineCounts) {
    if (disciplineCounts[key] > maxCount) {
      maxCount = disciplineCounts[key];
      dominantDiscipline = key;
    }
  }

  const tradeDisciplineDisplay = Object.entries(disciplineCounts)
    .filter(([_, count]) => count > 0)
    .map(([label, count]) => `• ${label} (${count})`)
    .join("\n");

  const warningCounts = {
    "⚠️ Early exit on high RR trade": 0,
    "🚨 Psychology breakdown": 0,
  };

  closedTrades.forEach((journal) => {
    const warning = getTradeWarning(journal);
    if (warning && warningCounts[warning] !== undefined) {
      warningCounts[warning]++;
    }
  });

  const warningsDisplay = Object.entries(warningCounts)
    .filter(([_, count]) => count > 0)
    .map(([label, count]) => `${label} (${count})`)
    .join("\n");

  const metrics = [
    {
      label: "Total Journals",
      value: totalJournals,
    },
    {
      label: "Closed Trades",
      value: totalClosedTrades,
    },
    {
      label: "Actual Profit / Loss (R)",
      value: totalR,
    },
    {
      label: "Actual Profit / Loss (USD)",
      value: formatUSD(totalProfitLossUSD),
    },
    {
      label: "Average Planned RR",
      value: avgPlannedRR,
    },
    {
      label: "Execution Quality (1–10)",
      value: avgExecutionScore,
    },
    {
      label: "Expectancy",
      value: expectancy,
    },
    {
      label: "Win Rate",
      value: `${winRate}%`,
    },
    {
      label: "Profit Factor",
      value: profitFactor,
    },
    {
      label: "R Deviation Score (1–20)",
      value: avgRDeviationScore,
    },
    {
      label: "Deviation Quality Tag",
      value: deviationQualityTag,
    },
    {
      label: "Positive Deviation Score (1–20)",
      value: avgPositiveDeviationScore,
    },
    {
      label: "Negative Deviation Score (1–20)",
      value: avgNegativeDeviationScore,
    },
    {
      label: "Trade Discipline",
      value: tradeDisciplineDisplay || "—",
    },
    {
      label: "Warnings",
      value: warningsDisplay || "—",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Metrics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Metrics overview</p>
      </div>

      <div className="space-y-3">
        {metrics.map((metric) => (
          <MetricRow
            key={metric.label}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </div>
    </div>
  );
}
