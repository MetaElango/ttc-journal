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
import { calculateRMultiple } from "../insights/_lib/metrics";

function norm(v) {
  return String(v || "")
    .trim()
    .toUpperCase();
}

function fmtDate(value, options = {}) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function dateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function buildMonthDays(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function buildWeekDays(date) {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
function makeLocalDate(value, endOfDay = false) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  if (endOfDay) date.setHours(23, 59, 59, 999);

  return date;
}

function formatR(value) {
  const n = Number(value) || 0;
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}R`;
}

function getFlags(day) {
  if (!day || !day.trades) return [];

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
          <div className="truncate">Winning: {winning}</div>
          <div className="truncate">Losing: {losing}</div>
          <div className="truncate">Breakeven: {breakeven}</div>
        </div>
      </div>
    </div>
  );
}

function DayCell({ day, data, currentMonth, bestDay, onClick }) {
  const totalR = data?.totalR || 0;
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

          <div className="mt-2 truncate text-xs font-bold text-slate-500">
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

  function isBeforeRange(date) {
    if (!rangeStartDate) return false;
    return date < rangeStartDate;
  }

  function isAfterRange(date) {
    if (!rangeEndDate) return false;
    return date > rangeEndDate;
  }

  function clampToRange(date) {
    if (rangeStartDate && date < rangeStartDate) return rangeStartDate;
    if (rangeEndDate && date > rangeEndDate) return rangeEndDate;
    return date;
  }

  useEffect(() => {
    setMounted(true);

    const latest =
      journals
        .map((j) => new Date(j.journal_end_at || j.created_at))
        .filter((d) => !Number.isNaN(d.getTime()))
        .sort((a, b) => b - a)[0] || new Date();

    const safeDate = clampToRange(latest);

    setSelectedDate(safeDate);
    setSelectedDay(safeDate);
  }, [journals, rangeStartDate, rangeEndDate]);

  const analytics = useMemo(() => {
    const daily = new Map();

    journals.forEach((journal) => {
      const rawDate = journal.journal_end_at || journal.created_at;
      if (!rawDate) return;

      const d = new Date(rawDate);
      if (Number.isNaN(d.getTime())) return;

      const key = dateKey(d);
      const r = calculateRMultiple(journal);

      const prev = daily.get(key) || {
        date: d,
        trades: 0,
        wins: 0,
        losses: 0,
        breakeven: 0,
        totalR: 0,
        journals: [],
      };

      prev.trades += 1;
      prev.totalR += r;
      prev.journals.push(journal);

      if (r > 0) prev.wins += 1;
      else if (r < 0) prev.losses += 1;
      else prev.breakeven += 1;

      daily.set(key, prev);
    });

    const days = Array.from(daily.values());
    const totalTrades = journals.length;
    const totalR = days.reduce((a, b) => a + b.totalR, 0);

    const rValues = journals.map((j) => calculateRMultiple(j));

    const wins = rValues.filter((r) => r > 0).length;
    const losses = rValues.filter((r) => r < 0).length;

    const grossProfit = rValues
      .filter((r) => r > 0)
      .reduce((sum, r) => sum + r, 0);

    const grossLoss = Math.abs(
      rValues.filter((r) => r < 0).reduce((sum, r) => sum + r, 0),
    );

    const profitFactor =
      grossLoss > 0
        ? (grossProfit / grossLoss).toFixed(2)
        : grossProfit > 0
          ? "∞"
          : "0";

    const winningDays = days.filter((d) => d.totalR > 0).length;
    const losingDays = days.filter((d) => d.totalR < 0).length;
    const breakevenDays = days.filter((d) => d.totalR === 0).length;

    const avgWinR =
      winningDays > 0
        ? days.filter((d) => d.totalR > 0).reduce((a, b) => a + b.totalR, 0) /
          winningDays
        : 0;

    const avgLossR =
      losingDays > 0
        ? days.filter((d) => d.totalR < 0).reduce((a, b) => a + b.totalR, 0) /
          losingDays
        : 0;

    const bestDay = [...days].sort((a, b) => b.totalR - a.totalR)[0] || null;
    const worstDay = [...days].sort((a, b) => a.totalR - b.totalR)[0] || null;

    return {
      daily,
      totalTrades,
      totalR,
      winRate: totalTrades ? (wins / totalTrades) * 100 : 0,
      avgWinR,
      avgLossR,
      profitFactor,
      maxDrawdown: worstDay?.totalR || 0,
      winningDays,
      losingDays,
      breakevenDays,
      bestDay,
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

    if (mode === "Daily") next.setDate(selectedDate.getDate() + delta);
    else if (mode === "Weekly")
      next.setDate(selectedDate.getDate() + delta * 7);
    else next.setMonth(selectedDate.getMonth() + delta);

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

    if (rangeStartDate && end < rangeStartDate) return false;
    if (rangeEndDate && start > rangeEndDate) return false;

    return true;
  }

  const previousDate = selectedDate ? getPeriodDate(-1) : null;
  const nextDate = selectedDate ? getPeriodDate(1) : null;

  const canGoPrevious = previousDate
    ? periodOverlapsRange(previousDate)
    : false;
  const canGoNext = nextDate ? periodOverlapsRange(nextDate) : false;

  function changePeriod(delta) {
    const next = getPeriodDate(delta);

    if (!periodOverlapsRange(next)) return;

    setSelectedDate(next);
    setSelectedDay(next);
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Trades"
          value={analytics.totalTrades}
          helper="Filtered"
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
          helper="Accuracy"
        />

        <MetricCard
          label="Avg Win"
          value={formatR(analytics.avgWinR)}
          helper="Winning days"
        />

        <MetricCard
          label="Avg Loss"
          value={formatR(analytics.avgLossR)}
          positive={false}
          helper="Losing days"
        />

        <MetricCard label="PF" value={analytics.profitFactor} helper="Ratio" />

        <MetricCard
          label="Drawdown"
          value={formatR(analytics.maxDrawdown)}
          positive={false}
          helper="Worst day"
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

            <div className="flex items-center gap-2">
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
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d}>{d}</div>
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
                  {selectedDayData.journals.map((journal) => (
                    <div
                      key={journal.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm"
                    >
                      <div className="truncate font-black text-slate-900">
                        {journal.symbols?.symbol_name || "—"} •{" "}
                        {journal.direction || "—"} •{" "}
                        {formatR(calculateRMultiple(journal))}
                      </div>

                      <div className="mt-1 truncate text-xs font-bold text-slate-500">
                        {journal.strategy_snapshot?.strategy_name ||
                          "No Strategy"}
                      </div>

                      <div className="mt-1 truncate text-xs font-bold text-slate-400">
                        {journal.status || "—"}
                      </div>
                    </div>
                  ))}
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
