// app/app/metrics/page.js
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Flame,
  Gauge,
  LineChart,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  BadgeCheck,
} from "lucide-react";

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

  if (!prices.length) return 0;

  if (qtys.length === prices.length) {
    let total = 0;
    let totalQty = 0;

    for (let i = 0; i < prices.length; i++) {
      const price = Number(prices[i]);
      const qty = Number(qtys[i]);

      if (Number.isNaN(price) || Number.isNaN(qty) || qty <= 0) continue;

      total += price * qty;
      totalQty += qty;
    }

    if (totalQty > 0) return total / totalQty;
  }

  const validPrices = prices.map(Number).filter((n) => !Number.isNaN(n));
  if (!validPrices.length) return 0;

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
  const actualR = calculateRMultiple(journal);
  const plannedRR = calculatePlannedRR(journal);

  if (!(plannedRR > 0)) return 0;

  const ratio = actualR / plannedRR;

  if (ratio <= 0) return 1;

  return Math.round(Math.max(1, Math.min(10, 1 + ratio * 6)));
}

function mapDeviationToScore(percent) {
  if (percent <= 0) return 20;

  return Math.round(Math.max(1, Math.min(20, 20 - percent / 5)));
}

function calculateRDeviationScore(journal) {
  const actualR = calculateRMultiple(journal);
  const plannedRR = calculatePlannedRR(journal);

  if (!(plannedRR > 0)) return 0;

  const percent = (Math.abs(actualR - plannedRR) / plannedRR) * 100;
  return mapDeviationToScore(percent);
}

function getRiskAmountUSD(journal) {
  const riskMode = String(journal.risk_mode || "").toUpperCase();
  const riskPerTrade = Number(journal.risk_per_trade);
  const accountSize = Number(journal?.trading_accounts?.account_size);

  if (!(riskPerTrade > 0)) return 0;

  if (riskMode === "AMOUNT") return riskPerTrade;

  if (riskMode === "PERCENT") {
    if (!(accountSize > 0)) return 0;
    return (accountSize * riskPerTrade) / 100;
  }

  return 0;
}

function calculateProfitLossUSD(journal) {
  return calculateRMultiple(journal) * getRiskAmountUSD(journal);
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
  return CLOSED_STATUSES.includes(String(journal.status || "").toUpperCase());
}

function isWinningTrade(journal) {
  const status = String(journal.status || "").toUpperCase();
  return WIN_STATUSES.includes(status) && calculateRMultiple(journal) > 0;
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

  if (plannedRR >= 2 && actualR > 0 && actualR < plannedRR * 0.5) {
    return "Early exit on high RR trade";
  }

  if (plannedRR >= 2 && actualR < 0) {
    return "Psychology breakdown";
  }

  return null;
}

function getScoreTone(score, max) {
  const pct = max ? (Number(score) / max) * 100 : 0;

  if (pct >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function StatCard({ icon: Icon, label, value, sub, tone = "" }) {
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>

          <div className={`mt-3 text-3xl font-semibold tracking-tight ${tone}`}>
            {value}
          </div>

          {sub ? (
            <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
          ) : null}
        </div>

        <div className="rounded-2xl border bg-background p-2.5">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function ProgressCard({ title, value, max, description, icon: Icon }) {
  const pct = max ? Math.max(0, Math.min(100, (Number(value) / max) * 100)) : 0;

  return (
    <div className="rounded-3xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>

        <div className="rounded-2xl border bg-background p-2.5">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div className={`text-3xl font-semibold ${getScoreTone(value, max)}`}>
          {value || 0}
        </div>
        <div className="text-xs text-muted-foreground">/ {max}</div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function InsightCard({ title, items, empty = "No insights yet." }) {
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>

      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-4 rounded-2xl border bg-background p-3"
            >
              <div className="text-sm">{item.label}</div>
              <div className="text-sm font-semibold">{item.value}</div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
            {empty}
          </div>
        )}
      </div>
    </div>
  );
}

function RecentTradeRow({ journal }) {
  const r = round2(calculateRMultiple(journal));
  const plannedRR = round2(calculatePlannedRR(journal));
  const pnl = calculateProfitLossUSD(journal);
  const strategyName = journal?.strategy_snapshot?.strategy_name || "—";
  const symbol = journal?.symbols?.symbol_name || "—";

  return (
    <div className="grid gap-3 rounded-2xl border bg-background p-4 text-sm md:grid-cols-6 md:items-center">
      <div className="md:col-span-2">
        <div className="font-medium">{strategyName}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {symbol} · {journal.direction || "—"}
        </div>
      </div>

      <div>
        <div className="text-xs text-muted-foreground">Status</div>
        <div className="font-medium">{journal.status || "—"}</div>
      </div>

      <div>
        <div className="text-xs text-muted-foreground">Planned</div>
        <div className="font-medium">
          {plannedRR > 0 ? `1:${plannedRR}` : "—"}
        </div>
      </div>

      <div>
        <div className="text-xs text-muted-foreground">Actual R</div>
        <div
          className={
            r >= 0
              ? "font-semibold text-emerald-600 dark:text-emerald-400"
              : "font-semibold text-red-600 dark:text-red-400"
          }
        >
          {r > 0 ? `+${r}R` : `${r}R`}
        </div>
      </div>

      <div>
        <div className="text-xs text-muted-foreground">P/L</div>
        <div
          className={
            pnl >= 0
              ? "font-semibold text-emerald-600 dark:text-emerald-400"
              : "font-semibold text-red-600 dark:text-red-400"
          }
        >
          {formatUSD(pnl)}
        </div>
      </div>
    </div>
  );
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
      user_id,
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
      strategy_snapshot,
      symbols:symbol_id (
        id,
        symbol_name,
        category
      ),
      trading_accounts:trading_account_id (
        id,
        account_name,
        account_size
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
        {error.message}
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

  const disciplineCounts = {
    "Optimal Exit": 0,
    "Early exit / fear": 0,
    "SL respected": 0,
    "Psychology issue": 0,
    "Needs review": 0,
  };

  const warningCounts = {
    "Early exit on high RR trade": 0,
    "Psychology breakdown": 0,
  };

  closedTrades.forEach((journal) => {
    const discipline = getTradeDiscipline(journal);
    if (disciplineCounts[discipline] !== undefined) {
      disciplineCounts[discipline]++;
    }

    const warning = getTradeWarning(journal);
    if (warning && warningCounts[warning] !== undefined) {
      warningCounts[warning]++;
    }
  });

  const disciplineItems = Object.entries(disciplineCounts)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => ({ label, value: count }));

  const warningItems = Object.entries(warningCounts)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => ({ label, value: count }));

  const recentClosedTrades = closedTrades.slice(0, 5);

  const positiveTone =
    totalProfitLossUSD > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : totalProfitLossUSD < 0
        ? "text-red-600 dark:text-red-400"
        : "";

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border bg-gradient-to-br from-card via-card to-muted/40 p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              Trading Performance
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
              Metrics
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Track your closed trades, R performance, win rate, execution
              quality, and discipline patterns.
            </p>
          </div>

          <div className="rounded-2xl border bg-background p-4 text-sm shadow-sm">
            <div className="text-xs text-muted-foreground">Closed Trades</div>
            <div className="mt-1 text-2xl font-semibold">
              {totalClosedTrades}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Target}
          label="Total Journals"
          value={totalJournals}
          sub="All journal entries"
        />
        <StatCard
          icon={Activity}
          label="Closed Trades"
          value={totalClosedTrades}
          sub="Used for performance metrics"
        />
        <StatCard
          icon={TrendingUp}
          label="Total R"
          value={`${totalR > 0 ? "+" : ""}${totalR}R`}
          sub="Actual closed trade result"
          tone={
            totalR >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }
        />
        <StatCard
          icon={CircleDollarSign}
          label="P/L USD"
          value={formatUSD(totalProfitLossUSD)}
          sub="Based on account risk"
          tone={positiveTone}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CheckCircle2}
          label="Win Rate"
          value={`${winRate}%`}
          sub={`${totalWinningTrades}/${totalClosedTrades} winning trades`}
        />
        <StatCard
          icon={Gauge}
          label="Expectancy"
          value={`${expectancy > 0 ? "+" : ""}${expectancy}R`}
          sub="Average R per closed trade"
        />
        <StatCard
          icon={Flame}
          label="Profit Factor"
          value={profitFactor}
          sub={`Gross profit ${grossProfit}R / loss ${grossLoss}R`}
        />
        <StatCard
          icon={LineChart}
          label="Avg Planned RR"
          value={`1:${avgPlannedRR}`}
          sub="Average planned reward"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProgressCard
          icon={ShieldCheck}
          title="Execution Quality"
          value={avgExecutionScore}
          max={10}
          description="How closely your exits match or exceed your planned RR."
        />

        <ProgressCard
          icon={BadgeCheck}
          title="R Deviation Discipline"
          value={avgRDeviationScore}
          max={20}
          description="Higher score means actual R stayed closer to planned R."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InsightCard
          title="Trade Discipline Breakdown"
          items={disciplineItems}
          empty="Close trades to see discipline patterns."
        />

        <InsightCard
          title="Warnings"
          items={warningItems}
          empty="No major warnings found."
        />
      </div>

      <div className="rounded-3xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Recent Closed Trades</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your latest completed trades with planned RR, actual R, and P/L.
            </p>
          </div>

          <div className="rounded-2xl border bg-background p-2.5">
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {recentClosedTrades.length ? (
            recentClosedTrades.map((journal) => (
              <RecentTradeRow key={journal.id} journal={journal} />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No closed trades yet.
            </div>
          )}
        </div>
      </div>

      {totalClosedTrades === 0 ? (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-700 dark:text-amber-300">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold">Metrics need closed trades</div>
              <p className="mt-1">
                Update journals to closed statuses like TRADE CLOSE WITH PROFIT,
                TRADE EXIT IN MID, or TRADE SL HIT to unlock full performance
                tracking.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
