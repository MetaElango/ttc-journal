"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  ShieldAlert,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

const PROFIT_STATUSES = ["TRADE CLOSE WITH PROFIT"];
const LOSS_STATUSES = ["TRADE SL HIT"];

const PERFORMANCE_STATUSES = [
  "TRADE CLOSE WITH PROFIT",
  "TRADE SL HIT",
  "TRADE EXIT IN MID",
  "ENTRY CLOSED",
];

function norm(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function toNumber(value, fallback = null) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function numberArray(value) {
  return parseArray(value)
    .map((item) => toNumber(item))
    .filter((item) => item !== null);
}

function roundNumber(value, decimalPlaces = 2) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const multiplier = 10 ** decimalPlaces;

  return Math.round((parsed + Number.EPSILON) * multiplier) / multiplier;
}

function fmtDate(value, options = {}) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function dateKey(date) {
  const value = new Date(date);

  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

function monthKey(date) {
  const value = new Date(date);

  return `${value.getFullYear()}-${value.getMonth()}`;
}

function buildMonthDays(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = new Date(first);

  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const value = new Date(start);

    value.setDate(start.getDate() + index);

    return value;
  });
}

function buildWeekDays(date) {
  const start = new Date(date);

  start.setDate(date.getDate() - date.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(start);

    value.setDate(start.getDate() + index);

    return value;
  });
}

function makeLocalDate(value, endOfDay = false) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

function formatR(value) {
  const parsed = toNumber(value, 0);

  return `${parsed > 0 ? "+" : ""}${parsed.toFixed(2)}R`;
}

function formatUsd(value) {
  const parsed = toNumber(value);

  if (parsed === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);
}

function getLotSize(journal) {
  return toNumber(journal.lot_size) ?? toNumber(journal.quantity);
}

function getEffectiveContractSize(journal) {
  return (
    toNumber(journal.effective_contract_size) ??
    toNumber(journal.effective_symbol?.contract_size) ??
    toNumber(journal.symbol_override?.contract_size) ??
    toNumber(journal.symbols?.contract_size)
  );
}

function getOriginalStopLoss(journal) {
  return toNumber(journal.stop_loss);
}

function getModifiedStopLoss(journal) {
  return toNumber(journal.modified_sl_price);
}

function getEffectiveStopLoss(journal) {
  return getModifiedStopLoss(journal) ?? getOriginalStopLoss(journal);
}

function buildTargetLegs(pricesValue, quantitiesValue, totalQuantity) {
  const prices = numberArray(pricesValue);
  const quantities = numberArray(quantitiesValue);
  const totalLots = toNumber(totalQuantity);

  if (!prices.length) {
    return [];
  }

  if (
    quantities.length === prices.length &&
    quantities.every((quantity) => quantity > 0)
  ) {
    return prices.map((price, index) => ({
      price,
      quantity: quantities[index],
    }));
  }

  if (totalLots !== null && totalLots > 0) {
    const equalQuantity = totalLots / prices.length;

    return prices.map((price, index) => {
      if (index === prices.length - 1) {
        const previousAllocation = equalQuantity * (prices.length - 1);

        return {
          price,
          quantity: totalLots - previousAllocation,
        };
      }

      return {
        price,
        quantity: equalQuantity,
      };
    });
  }

  return [];
}

function getOriginalTargetLegs(journal) {
  return buildTargetLegs(
    journal.take_profit,
    journal.take_profit_qty,
    getLotSize(journal),
  );
}

function getModifiedTargetLegs(journal) {
  return buildTargetLegs(
    journal.modified_tp_price,
    journal.modified_tp_qty,
    getLotSize(journal),
  );
}

function getEffectiveTargetLegs(journal) {
  const modifiedLegs = getModifiedTargetLegs(journal);

  if (modifiedLegs.length) {
    return modifiedLegs;
  }

  return getOriginalTargetLegs(journal);
}

function calculateDollarAmount({
  direction,
  entryPrice,
  targetPrice,
  lotSize,
  contractSize,
}) {
  const entry = toNumber(entryPrice);
  const target = toNumber(targetPrice);
  const lots = toNumber(lotSize);
  const contract = toNumber(contractSize);
  const normalizedDirection = norm(direction);

  if (
    entry === null ||
    target === null ||
    lots === null ||
    contract === null ||
    lots <= 0 ||
    contract <= 0 ||
    !["BUY", "SELL"].includes(normalizedDirection)
  ) {
    return null;
  }

  const movement =
    normalizedDirection === "BUY" ? target - entry : entry - target;

  return movement * contract * lots;
}

function calculateTargetLegsDollarAmount(journal, legs) {
  if (!Array.isArray(legs) || !legs.length) {
    return null;
  }

  const entryPrice = toNumber(journal.entry_price);
  const contractSize = getEffectiveContractSize(journal);

  if (entryPrice === null || contractSize === null) {
    return null;
  }

  let total = 0;
  let validLegs = 0;

  for (const leg of legs) {
    const amount = calculateDollarAmount({
      direction: journal.direction,
      entryPrice,
      targetPrice: leg.price,
      lotSize: leg.quantity,
      contractSize,
    });

    if (amount === null) {
      continue;
    }

    total += amount;
    validLegs += 1;
  }

  return validLegs ? total : null;
}

function getOriginalRiskUsd(journal) {
  const amount = calculateDollarAmount({
    direction: journal.direction,
    entryPrice: journal.entry_price,
    targetPrice: getOriginalStopLoss(journal),
    lotSize: getLotSize(journal),
    contractSize: getEffectiveContractSize(journal),
  });

  return amount === null ? null : Math.abs(amount);
}

function getPlannedRewardUsd(journal) {
  const amount = calculateTargetLegsDollarAmount(
    journal,
    getOriginalTargetLegs(journal),
  );

  return amount === null ? null : Math.abs(amount);
}

function getExitPriceFromCheckpoint(journal) {
  const status = norm(journal.status);
  const checkpoint = norm(journal.exit_checkpoint);
  const entryPrice = toNumber(journal.entry_price);

  if (LOSS_STATUSES.includes(status)) {
    if (checkpoint === "ACTUAL_SL") {
      return getOriginalStopLoss(journal);
    }

    if (checkpoint === "MODIFIED_SL") {
      return getModifiedStopLoss(journal) ?? getOriginalStopLoss(journal);
    }

    if (checkpoint === "SL_BREAKEVEN") {
      return entryPrice;
    }
  }

  if (PROFIT_STATUSES.includes(status)) {
    if (checkpoint === "TP_BREAKEVEN") {
      return entryPrice;
    }
  }

  return null;
}

function getActualExitLegs(journal) {
  const status = norm(journal.status);
  const checkpoint = norm(journal.exit_checkpoint);
  const lotSize = getLotSize(journal);
  const savedExitPrice = toNumber(journal.exit_price);

  /*
   * exit_price is the strongest source because it represents
   * the actual stored closing price.
   */
  if (savedExitPrice !== null && lotSize !== null && lotSize > 0) {
    return [
      {
        price: savedExitPrice,
        quantity: lotSize,
      },
    ];
  }

  if (status === "TRADE CLOSE WITH PROFIT" && checkpoint === "MODIFIED_TP") {
    return getModifiedTargetLegs(journal);
  }

  if (status === "TRADE CLOSE WITH PROFIT" && checkpoint === "ACTUAL_TP") {
    return getOriginalTargetLegs(journal);
  }

  const checkpointExitPrice = getExitPriceFromCheckpoint(journal);

  if (checkpointExitPrice !== null && lotSize !== null && lotSize > 0) {
    return [
      {
        price: checkpointExitPrice,
        quantity: lotSize,
      },
    ];
  }

  /*
   * Compatibility for older journals without exit_checkpoint.
   */
  if (status === "TRADE SL HIT") {
    const stopPrice = getEffectiveStopLoss(journal);

    if (stopPrice !== null && lotSize !== null && lotSize > 0) {
      return [
        {
          price: stopPrice,
          quantity: lotSize,
        },
      ];
    }
  }

  if (status === "TRADE CLOSE WITH PROFIT") {
    return getEffectiveTargetLegs(journal);
  }

  return [];
}

function calculateProfitLossUsd(journal) {
  const serverValue =
    toNumber(journal.profit_loss_usd) ??
    toNumber(journal.calculation?.profit_loss_usd);

  if (serverValue !== null) {
    return serverValue;
  }

  const calculated = calculateTargetLegsDollarAmount(
    journal,
    getActualExitLegs(journal),
  );

  return calculated === null ? 0 : roundNumber(calculated, 2);
}

function calculatePlannedRMultiple(journal) {
  const serverValue = toNumber(journal.calculated_planned_rr);

  if (serverValue !== null) {
    return serverValue;
  }

  const riskUsd = getOriginalRiskUsd(journal);
  const rewardUsd = getPlannedRewardUsd(journal);

  if (riskUsd === null || rewardUsd === null || riskUsd <= 0) {
    return 0;
  }

  return rewardUsd / riskUsd;
}

function calculateRMultiple(journal) {
  const serverValue = toNumber(journal.calculated_r_multiple);

  if (serverValue !== null) {
    return serverValue;
  }

  const riskUsd = getOriginalRiskUsd(journal);
  const profitLossUsd = calculateProfitLossUsd(journal);

  if (riskUsd === null || profitLossUsd === null || riskUsd <= 0) {
    return 0;
  }

  return profitLossUsd / riskUsd;
}

function getFlags(day) {
  if (!day || !day.trades) {
    return [];
  }

  const flags = [];

  if (day.totalR <= -2) {
    flags.push({
      label: "High Drawdown",
      icon: ShieldAlert,
      cls: "bg-red-50 text-red-700 border-red-100",
    });
  }

  if (day.trades >= 5) {
    flags.push({
      label: "High Volume",
      icon: Flame,
      cls: "bg-amber-50 text-amber-700 border-amber-100",
    });
  }

  if (day.totalR >= 2) {
    flags.push({
      label: "Strong Recovery",
      icon: TrendingUp,
      cls: "bg-emerald-50 text-emerald-700 border-emerald-100",
    });
  }

  return flags;
}

function MetricCard({ label, value, positive = true, helper = "" }) {
  return (
    <div className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-2 truncate text-[22px] font-black leading-tight text-slate-950">
        {value}
      </div>

      {helper ? (
        <div
          className={`mt-3 inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${
            positive
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-600"
          }`}
        >
          {positive ? (
            <TrendingUp className="h-3 w-3 shrink-0" />
          ) : (
            <TrendingDown className="h-3 w-3 shrink-0" />
          )}

          <span className="truncate">{helper}</span>
        </div>
      ) : null}
    </div>
  );
}

function MiniDonut({ winning, losing, breakeven }) {
  const total = winning + losing + breakeven || 1;
  const winPct = (winning / total) * 100;
  const lossPct = (losing / total) * 100;

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className="h-20 w-20 shrink-0 rounded-full p-3"
          style={{
            background: `conic-gradient(#10b981 0 ${winPct}%, #ef4444 ${winPct}% ${
              winPct + lossPct
            }%, #94a3b8 ${winPct + lossPct}% 100%)`,
          }}
        >
          <div className="h-14 w-14 rounded-full bg-white" />
        </div>

        <div className="min-w-0 space-y-1 text-xs font-bold text-slate-600">
          <div className="truncate">Winning days: {winning}</div>
          <div className="truncate">Losing days: {losing}</div>
          <div className="truncate">Breakeven days: {breakeven}</div>
        </div>
      </div>
    </div>
  );
}

function DayCell({ day, data, currentMonth, bestDay, onClick }) {
  const totalR = data?.totalR || 0;
  const totalProfitLossUsd = data?.totalProfitLossUsd || 0;
  const trades = data?.trades || 0;

  const isBest = bestDay && dateKey(bestDay.date) === dateKey(day);

  let tone = "border-slate-100 bg-slate-50 text-slate-400";

  if (trades && totalR > 0) {
    tone = "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (trades && totalR < 0) {
    tone = "border-red-200 bg-red-50 text-red-700";
  }

  if (isBest) {
    tone = "border-blue-300 bg-blue-50 text-blue-700";
  }

  return (
    <button
      type="button"
      onClick={() => onClick(day)}
      className={`min-w-0 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${tone} ${
        currentMonth ? "" : "opacity-35"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-black text-slate-600">
          {day.getDate()}
        </span>

        {isBest ? (
          <Star className="h-3.5 w-3.5 shrink-0 fill-blue-500 text-blue-500" />
        ) : null}
      </div>

      {trades ? (
        <div className="mt-4 min-w-0">
          <div className="truncate text-lg font-black leading-none">
            {formatR(totalR)}
          </div>

          <div
            className={`mt-2 truncate text-xs font-black ${
              totalProfitLossUsd > 0
                ? "text-emerald-700"
                : totalProfitLossUsd < 0
                  ? "text-red-700"
                  : "text-slate-500"
            }`}
          >
            {totalProfitLossUsd > 0 ? "+" : ""}
            {formatUsd(totalProfitLossUsd)}
          </div>

          <div className="mt-1 truncate text-xs font-bold text-slate-500">
            {trades} {trades === 1 ? "trade" : "trades"}
          </div>
        </div>
      ) : (
        <div className="mt-5 truncate text-xs font-bold text-slate-300">
          Inactive
        </div>
      )}
    </button>
  );
}

export default function JournalIntelligencePanel({
  journals = [],
  rangeStart = "",
  rangeEnd = "",
}) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState("Calendar");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const rangeStartDate = useMemo(() => makeLocalDate(rangeStart), [rangeStart]);

  const rangeEndDate = useMemo(() => makeLocalDate(rangeEnd, true), [rangeEnd]);

  function clampToRange(date) {
    if (rangeStartDate && date < rangeStartDate) {
      return new Date(rangeStartDate);
    }

    if (rangeEndDate && date > rangeEndDate) {
      return new Date(rangeEndDate);
    }

    return date;
  }

  useEffect(() => {
    setMounted(true);

    const latest =
      journals
        .map((journal) => {
          return new Date(
            journal.journal_end_at || journal.updated_at || journal.created_at,
          );
        })
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((first, second) => second - first)[0] || new Date();

    const safeDate = clampToRange(latest);

    setSelectedDate(safeDate);
    setSelectedDay(safeDate);
  }, [journals, rangeStartDate, rangeEndDate]);

  const analytics = useMemo(() => {
    const daily = new Map();

    const performanceJournals = journals.filter((journal) => {
      return PERFORMANCE_STATUSES.includes(norm(journal.status));
    });

    performanceJournals.forEach((journal) => {
      const rawDate =
        journal.journal_end_at || journal.updated_at || journal.created_at;

      if (!rawDate) return;

      const date = new Date(rawDate);

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const key = dateKey(date);
      const r = calculateRMultiple(journal);
      const profitLossUsd = calculateProfitLossUsd(journal);

      const previous = daily.get(key) || {
        date,
        trades: 0,
        wins: 0,
        losses: 0,
        breakeven: 0,
        totalR: 0,
        totalProfitLossUsd: 0,
        journals: [],
      };

      previous.trades += 1;
      previous.totalR += r;
      previous.totalProfitLossUsd += profitLossUsd;
      previous.journals.push(journal);

      if (r > 0) {
        previous.wins += 1;
      } else if (r < 0) {
        previous.losses += 1;
      } else {
        previous.breakeven += 1;
      }

      daily.set(key, previous);
    });

    const days = Array.from(daily.values());

    const calculatedTrades = performanceJournals.map((journal) => ({
      journal,
      r: calculateRMultiple(journal),
      plannedR: calculatePlannedRMultiple(journal),
      profitLossUsd: calculateProfitLossUsd(journal),
    }));

    const totalTrades = calculatedTrades.length;

    const totalR = calculatedTrades.reduce((sum, trade) => sum + trade.r, 0);

    const totalProfitLossUsd = calculatedTrades.reduce(
      (sum, trade) => sum + trade.profitLossUsd,
      0,
    );

    const winningTrades = calculatedTrades.filter((trade) => trade.r > 0);

    const losingTrades = calculatedTrades.filter((trade) => trade.r < 0);

    const breakevenTrades = calculatedTrades.filter((trade) => trade.r === 0);

    const wins = winningTrades.length;
    const losses = losingTrades.length;

    const winRate = totalTrades ? (wins / totalTrades) * 100 : 0;

    const grossProfitR = winningTrades.reduce((sum, trade) => sum + trade.r, 0);

    const grossLossR = Math.abs(
      losingTrades.reduce((sum, trade) => sum + trade.r, 0),
    );

    const grossProfitUsd = winningTrades.reduce(
      (sum, trade) => sum + trade.profitLossUsd,
      0,
    );

    const grossLossUsd = Math.abs(
      losingTrades.reduce((sum, trade) => sum + trade.profitLossUsd, 0),
    );

    const profitFactor =
      grossLossUsd > 0
        ? (grossProfitUsd / grossLossUsd).toFixed(2)
        : grossProfitUsd > 0
          ? "∞"
          : "0.00";

    const avgWinR = winningTrades.length
      ? grossProfitR / winningTrades.length
      : 0;

    const avgLossR = losingTrades.length
      ? -grossLossR / losingTrades.length
      : 0;

    const expectancyR =
      totalTrades > 0
        ? (wins / totalTrades) * avgWinR + (losses / totalTrades) * avgLossR
        : 0;

    const plannedRValues = calculatedTrades
      .map((trade) => trade.plannedR)
      .filter((value) => Number.isFinite(value) && value > 0);

    const averagePlannedR = plannedRValues.length
      ? plannedRValues.reduce((sum, value) => sum + value, 0) /
        plannedRValues.length
      : 0;

    const winningDays = days.filter((day) => day.totalR > 0).length;

    const losingDays = days.filter((day) => day.totalR < 0).length;

    const breakevenDays = days.filter((day) => day.totalR === 0).length;

    const bestDay =
      [...days].sort((first, second) => second.totalR - first.totalR)[0] ||
      null;

    const orderedTrades = calculatedTrades
      .map((trade) => ({
        ...trade,
        date: new Date(
          trade.journal.journal_end_at ||
            trade.journal.updated_at ||
            trade.journal.created_at,
        ),
      }))
      .filter((trade) => !Number.isNaN(trade.date.getTime()))
      .sort((first, second) => first.date - second.date);

    let equityR = 0;
    let peakR = 0;
    let maxDrawdownR = 0;

    let equityUsd = 0;
    let peakUsd = 0;
    let maxDrawdownUsd = 0;

    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let longestWinStreak = 0;
    let longestLossStreak = 0;

    orderedTrades.forEach((trade) => {
      equityR += trade.r;

      if (equityR > peakR) {
        peakR = equityR;
      }

      const drawdownR = equityR - peakR;

      if (drawdownR < maxDrawdownR) {
        maxDrawdownR = drawdownR;
      }

      equityUsd += trade.profitLossUsd;

      if (equityUsd > peakUsd) {
        peakUsd = equityUsd;
      }

      const drawdownUsd = equityUsd - peakUsd;

      if (drawdownUsd < maxDrawdownUsd) {
        maxDrawdownUsd = drawdownUsd;
      }

      if (trade.r > 0) {
        currentWinStreak += 1;
        currentLossStreak = 0;

        longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
      } else if (trade.r < 0) {
        currentLossStreak += 1;
        currentWinStreak = 0;

        longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
      } else {
        currentWinStreak = 0;
        currentLossStreak = 0;
      }
    });

    return {
      daily,
      totalTrades,
      totalR,
      totalProfitLossUsd,
      winRate,
      avgWinR,
      avgLossR,
      expectancyR,
      averagePlannedR,
      profitFactor,
      maxDrawdownR,
      maxDrawdownUsd,
      winningTrades: wins,
      losingTrades: losses,
      breakevenTrades: breakevenTrades.length,
      winningDays,
      losingDays,
      breakevenDays,
      bestDay,
      longestWinStreak,
      longestLossStreak,
    };
  }, [journals]);

  if (!mounted || !selectedDate) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm font-bold text-slate-400">
        Loading calendar intelligence...
      </section>
    );
  }

  const visibleDays =
    mode === "Daily"
      ? [selectedDate]
      : mode === "Weekly"
        ? buildWeekDays(selectedDate)
        : buildMonthDays(selectedDate);

  const selectedDayData = selectedDay
    ? analytics.daily.get(dateKey(selectedDay))
    : null;

  function getPeriodDate(delta) {
    const next = new Date(selectedDate);

    if (mode === "Daily") {
      next.setDate(selectedDate.getDate() + delta);
    } else if (mode === "Weekly") {
      next.setDate(selectedDate.getDate() + delta * 7);
    } else {
      next.setMonth(selectedDate.getMonth() + delta);
    }

    return next;
  }

  function getPeriodBounds(date) {
    const start = new Date(date);
    const end = new Date(date);

    if (mode === "Weekly") {
      start.setDate(date.getDate() - date.getDay());
      start.setHours(0, 0, 0, 0);

      end.setTime(start.getTime());
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (mode === "Monthly" || mode === "Calendar") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      end.setMonth(start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }

  function periodOverlapsRange(date) {
    const { start, end } = getPeriodBounds(date);

    if (rangeStartDate && end < rangeStartDate) {
      return false;
    }

    if (rangeEndDate && start > rangeEndDate) {
      return false;
    }

    return true;
  }

  const previousDate = getPeriodDate(-1);
  const nextDate = getPeriodDate(1);

  const canGoPrevious = periodOverlapsRange(previousDate);
  const canGoNext = periodOverlapsRange(nextDate);

  function changePeriod(delta) {
    const next = getPeriodDate(delta);

    if (!periodOverlapsRange(next)) {
      return;
    }

    setSelectedDate(next);
    setSelectedDay(next);
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Closed Trades"
          value={analytics.totalTrades}
          helper="Filtered"
        />

        <MetricCard
          label="Net P&L"
          value={formatUsd(analytics.totalProfitLossUsd)}
          positive={analytics.totalProfitLossUsd >= 0}
          helper={analytics.totalProfitLossUsd >= 0 ? "Net profit" : "Net loss"}
        />

        <MetricCard
          label="Total R"
          value={formatR(analytics.totalR)}
          positive={analytics.totalR >= 0}
          helper={analytics.totalR >= 0 ? "Positive" : "Negative"}
        />

        <MetricCard
          label="Win Rate"
          value={`${analytics.winRate.toFixed(1)}%`}
          positive={analytics.winRate >= 50}
          helper={`${analytics.winningTrades} wins`}
        />

        <MetricCard
          label="Avg Win"
          value={formatR(analytics.avgWinR)}
          helper="Winning trades"
        />

        <MetricCard
          label="Avg Loss"
          value={formatR(analytics.avgLossR)}
          positive={false}
          helper="Losing trades"
        />

        <MetricCard
          label="Expectancy"
          value={formatR(analytics.expectancyR)}
          positive={analytics.expectancyR >= 0}
          helper="Per closed trade"
        />

        <MetricCard
          label="Profit Factor"
          value={analytics.profitFactor}
          positive={
            analytics.profitFactor === "∞" ||
            Number(analytics.profitFactor) >= 1
          }
          helper="USD profit / loss"
        />

        <MetricCard
          label="Max Drawdown"
          value={formatR(analytics.maxDrawdownR)}
          positive={false}
          helper={formatUsd(analytics.maxDrawdownUsd)}
        />

        <MetricCard
          label="Avg Planned RR"
          value={formatR(analytics.averagePlannedR)}
          helper="Original targets"
        />

        <MetricCard
          label="Best Win Streak"
          value={analytics.longestWinStreak}
          helper="Consecutive wins"
        />

        <MiniDonut
          winning={analytics.winningDays}
          losing={analytics.losingDays}
          breakeven={analytics.breakevenDays}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-600">
                <CalendarDays className="h-3.5 w-3.5" />
                Behavioral Calendar
              </div>

              <h2 className="mt-3 text-2xl font-black text-slate-950">
                {mode === "Daily"
                  ? fmtDate(selectedDate, {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : mode === "Weekly"
                    ? `Week of ${fmtDate(buildWeekDays(selectedDate)[0], {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}`
                    : fmtDate(selectedDate, {
                        month: "long",
                        year: "numeric",
                      })}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {["Calendar", "Daily", "Weekly", "Monthly"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                    mode === item
                      ? "bg-sky-600 text-white"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {item}
                </button>
              ))}

              <button
                type="button"
                disabled={!canGoPrevious}
                onClick={() => changePeriod(-1)}
                className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                disabled={!canGoNext}
                onClick={() => changePeriod(1)}
                className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {mode !== "Daily" ? (
            <div className="mt-6 grid grid-cols-7 gap-2 text-center text-[11px] font-black uppercase text-slate-400">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>
          ) : null}

          <div
            className={`mt-2 grid gap-2 ${
              mode === "Daily" ? "grid-cols-1" : "grid-cols-7"
            }`}
          >
            {visibleDays.map((day) => (
              <DayCell
                key={day.toISOString()}
                day={day}
                currentMonth={
                  mode === "Monthly" || mode === "Calendar"
                    ? monthKey(day) === monthKey(selectedDate)
                    : true
                }
                data={analytics.daily.get(dateKey(day))}
                bestDay={analytics.bestDay}
                onClick={setSelectedDay}
              />
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-black text-slate-950">
            Day Intelligence
          </h3>

          {selectedDayData ? (
            <div className="mt-5 space-y-4">
              <div className="text-sm font-bold text-slate-500">
                {fmtDate(selectedDayData.date, {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Trades" value={selectedDayData.trades} />

                <MetricCard
                  label="Total R"
                  value={formatR(selectedDayData.totalR)}
                  positive={selectedDayData.totalR >= 0}
                />

                <MetricCard
                  label="P&L"
                  value={formatUsd(selectedDayData.totalProfitLossUsd)}
                  positive={selectedDayData.totalProfitLossUsd >= 0}
                />

                <MetricCard
                  label="Win Rate"
                  value={`${(
                    (selectedDayData.wins / selectedDayData.trades) *
                    100
                  ).toFixed(1)}%`}
                  positive={selectedDayData.wins >= selectedDayData.losses}
                />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-black uppercase text-slate-400">
                  Important Detections
                </div>

                <div className="mt-3 space-y-2 text-sm font-bold">
                  {getFlags(selectedDayData).length ? (
                    getFlags(selectedDayData).map((flag) => {
                      const Icon = flag.icon;

                      return (
                        <div
                          key={flag.label}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${flag.cls}`}
                        >
                          <Icon className="h-4 w-4" />
                          {flag.label}
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-center gap-2 text-slate-500">
                      <AlertTriangle className="h-4 w-4 text-slate-400" />
                      No major warning detected.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-black uppercase text-slate-400">
                  Trades
                </div>

                <div className="mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-1">
                  {selectedDayData.journals.map((journal) => {
                    const tradeR = calculateRMultiple(journal);
                    const profitLossUsd = calculateProfitLossUsd(journal);

                    return (
                      <div
                        key={journal.id}
                        className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-black text-slate-900">
                              {journal.symbols?.symbol_name ||
                                journal.effective_symbol?.symbol_name ||
                                "—"}{" "}
                              • {journal.direction || "—"}
                            </div>

                            <div className="mt-1 text-xs font-black text-slate-600">
                              {formatR(tradeR)}
                            </div>
                          </div>

                          <div
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${
                              profitLossUsd > 0
                                ? "bg-emerald-50 text-emerald-700"
                                : profitLossUsd < 0
                                  ? "bg-red-50 text-red-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {profitLossUsd > 0 ? "+" : ""}
                            {formatUsd(profitLossUsd)}
                          </div>
                        </div>

                        <div className="mt-2 truncate text-xs font-bold text-slate-500">
                          {journal.strategy_snapshot?.strategy_name ||
                            "No Strategy"}
                        </div>

                        <div className="mt-1 truncate text-xs font-bold text-slate-400">
                          Lot: {getLotSize(journal) ?? "—"} •{" "}
                          {journal.status || "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500">
              Click any calendar day to view intelligence.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
