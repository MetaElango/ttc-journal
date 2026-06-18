"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  ShieldAlert,
  SlidersHorizontal,
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

function makeLocalDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function fmtDate(value, options = {}) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function inputDateValue(date) {
  if (!date) return "";

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function getSetupSource(journal) {
  if (journal.copied_from_journal_id) return "Incorporated";
  return "Own";
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

function MetricCard({ label, value, positive = true, helper = "" }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-3 text-2xl font-black text-slate-950">{value}</div>

      {helper ? (
        <div
          className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
            positive
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-600"
          }`}
        >
          {positive ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          {helper}
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
    <div className="flex items-center gap-5 rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur-xl">
      <div
        className="h-24 w-24 rounded-full p-4"
        style={{
          background: `conic-gradient(#10b981 0 ${winPct}%, #ef4444 ${winPct}% ${
            winPct + lossPct
          }%, #94a3b8 ${winPct + lossPct}% 100%)`,
        }}
      >
        <div className="h-16 w-16 rounded-full bg-white" />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 font-bold text-slate-700">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          Winning {winning}
        </div>

        <div className="flex items-center gap-2 font-bold text-slate-700">
          <span className="h-3 w-3 rounded-full bg-red-500" />
          Losing {losing}
        </div>

        <div className="flex items-center gap-2 font-bold text-slate-700">
          <span className="h-3 w-3 rounded-full bg-slate-400" />
          Breakeven {breakeven}
        </div>
      </div>
    </div>
  );
}

function getFlags(day) {
  if (!day || !day.trades) return [];

  const flags = [];

  if (day.totalR <= -2) {
    flags.push({
      label: "High Drawdown",
      icon: ShieldAlert,
      cls: "bg-red-100 text-red-700",
    });
  }

  if (day.trades >= 5) {
    flags.push({
      label: "High Volume",
      icon: Flame,
      cls: "bg-amber-100 text-amber-700",
    });
  }

  if (day.totalR >= 2) {
    flags.push({
      label: "Recovery",
      icon: TrendingUp,
      cls: "bg-emerald-100 text-emerald-700",
    });
  }

  return flags;
}

function DayCell({ day, data, currentMonth, bestDay, onClick }) {
  const totalR = data?.totalR || 0;
  const trades = data?.trades || 0;
  const flags = getFlags(data);
  const isBest = bestDay && dateKey(bestDay.date) === dateKey(day);

  let tone = "border-slate-100 bg-slate-50 text-slate-400";

  if (trades && totalR > 0) {
    tone =
      totalR >= 2
        ? "border-emerald-300 bg-emerald-100 text-emerald-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (trades && totalR < 0) {
    tone =
      totalR <= -2
        ? "border-red-300 bg-red-100 text-red-800"
        : "border-red-200 bg-red-50 text-red-700";
  }

  if (isBest) tone = "border-blue-300 bg-blue-50 text-blue-700";

  return (
    <button
      type="button"
      onClick={() => onClick(day)}
      className={`relative min-h-[112px] rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${tone} ${
        currentMonth ? "" : "opacity-35"
      }`}
    >
      <div className="flex justify-between">
        <span className="text-sm font-black text-slate-600">
          {day.getDate()}
        </span>

        {isBest ? (
          <Star className="h-4 w-4 fill-blue-500 text-blue-500" />
        ) : null}
      </div>

      {trades ? (
        <>
          <div className="mt-5 text-2xl font-black">
            {totalR > 0 ? "+" : ""}
            {totalR.toFixed(2)}R
          </div>

          <div className="mt-2 text-sm font-bold text-slate-500">
            {trades} {trades === 1 ? "trade" : "trades"}
          </div>

          {flags.length ? (
            <div className="mt-3 flex flex-wrap gap-1">
              {flags.slice(0, 2).map((f) => {
                const Icon = f.icon;

                return (
                  <span
                    key={f.label}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${f.cls}`}
                  >
                    <Icon className="h-3 w-3" />
                    {f.label}
                  </span>
                );
              })}
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-7 text-sm font-bold text-slate-300">Inactive</div>
      )}
    </button>
  );
}

export default function JournalIntelligencePanel({ journals = [] }) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState("Calendar");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [account, setAccount] = useState("ALL");
  const [strategy, setStrategy] = useState("ALL");
  const [asset, setAsset] = useState("ALL");
  const [setupSource, setSetupSource] = useState("ALL");

  useEffect(() => {
    setMounted(true);

    const latest =
      journals
        .map((j) => new Date(j.journal_end_at || j.created_at))
        .filter((d) => !Number.isNaN(d.getTime()))
        .sort((a, b) => b - a)[0] || new Date();

    setSelectedDate(latest);
    setSelectedDay(latest);
  }, [journals]);

  const filterOptions = useMemo(() => {
    return {
      accounts: [
        ...new Set(
          journals.map((j) => j.trading_accounts?.account_name).filter(Boolean),
        ),
      ],
      strategies: [
        ...new Set(
          journals
            .map((j) => j.strategy_snapshot?.strategy_name)
            .filter(Boolean),
        ),
      ],
      assets: [
        ...new Set(journals.map((j) => j.symbols?.symbol_name).filter(Boolean)),
      ],
      setupSources: ["Own", "Incorporated"],
    };
  }, [journals]);

  const filteredJournals = useMemo(() => {
    return journals.filter((j) => {
      const accountName = j.trading_accounts?.account_name || "";
      const strategyName = j.strategy_snapshot?.strategy_name || "";
      const assetName = j.symbols?.symbol_name || "";
      const source = getSetupSource(j);

      const rawDate = j.journal_end_at || j.created_at;
      const tradeDate = rawDate ? new Date(rawDate) : null;

      let dateOk = true;

      if (customStart && customEnd && tradeDate) {
        const start = makeLocalDate(customStart);
        const end = makeLocalDate(customEnd);
        end?.setHours(23, 59, 59, 999);

        if (start && end) dateOk = tradeDate >= start && tradeDate <= end;
      }

      return (
        dateOk &&
        (account === "ALL" || accountName === account) &&
        (strategy === "ALL" || strategyName === strategy) &&
        (asset === "ALL" || assetName === asset) &&
        (setupSource === "ALL" || source === setupSource)
      );
    });
  }, [journals, account, strategy, asset, setupSource, customStart, customEnd]);

  const analytics = useMemo(() => {
    const daily = new Map();

    filteredJournals.forEach((journal) => {
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
    const totalTrades = filteredJournals.length;
    const totalR = days.reduce((a, b) => a + b.totalR, 0);
    const wins = filteredJournals.filter(
      (j) => calculateRMultiple(j) > 0,
    ).length;
    const losses = filteredJournals.filter(
      (j) => calculateRMultiple(j) < 0,
    ).length;

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
      profitFactor:
        losses > 0 ? Math.abs(wins / losses).toFixed(2) : wins > 0 ? "∞" : "0",
      maxDrawdown: worstDay?.totalR || 0,
      winningDays,
      losingDays,
      breakevenDays,
      bestDay,
    };
  }, [filteredJournals]);

  if (!mounted || !selectedDate) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white/80 p-8 text-sm font-bold text-slate-400">
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

  function changePeriod(delta) {
    setSelectedDate((current) => {
      const next = new Date(current);

      if (mode === "Daily") next.setDate(current.getDate() + delta);
      else if (mode === "Weekly") next.setDate(current.getDate() + delta * 7);
      else next.setMonth(current.getMonth() + delta);

      setSelectedDay(next);
      return next;
    });
  }

  function focusCalendarFromDate(value) {
    const d = makeLocalDate(value);
    if (!d) return;

    setSelectedDate(d);
    setSelectedDay(d);
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex rounded-2xl border border-slate-200 bg-white p-1">
              {["Calendar", "Daily", "Weekly", "Monthly"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setMode(item);

                    if (customStart) {
                      focusCalendarFromDate(customStart);
                    }
                  }}
                  className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                    mode === item
                      ? "bg-sky-50 text-sky-700"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold text-slate-400">
                Date Range:
              </span>

              <input
                type="date"
                value={customStart}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomStart(value);
                  focusCalendarFromDate(value);
                }}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 outline-none"
              />

              <span className="text-sm font-bold text-slate-400">to</span>

              <input
                type="date"
                value={customEnd}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomEnd(value);

                  if (!customStart) {
                    focusCalendarFromDate(value);
                  }
                }}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 outline-none"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1.4fr_1fr_1.2fr_auto]">
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 outline-none"
            >
              <option value="ALL">Account: All</option>
              {filterOptions.accounts.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>

            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 outline-none"
            >
              <option value="ALL">Strategy: All</option>
              {filterOptions.strategies.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>

            <select
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 outline-none"
            >
              <option value="ALL">Asset: All</option>
              {filterOptions.assets.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>

            <select
              value={setupSource}
              onChange={(e) => setSetupSource(e.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 outline-none"
            >
              <option value="ALL">Setup Source: All</option>
              {filterOptions.setupSources.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setAccount("ALL");
                setStrategy("ALL");
                setAsset("ALL");
                setSetupSource("ALL");
                setCustomStart("");
                setCustomEnd("");
              }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
        <MetricCard
          label="Total Trades"
          value={analytics.totalTrades}
          helper="Filtered"
        />

        <MetricCard
          label="Total R"
          value={`${analytics.totalR > 0 ? "+" : ""}${analytics.totalR.toFixed(
            2,
          )}R`}
          positive={analytics.totalR >= 0}
          helper={analytics.totalR >= 0 ? "Positive" : "Negative"}
        />

        <MetricCard
          label="Win Rate"
          value={`${analytics.winRate.toFixed(1)}%`}
          helper="Accuracy"
        />

        <MetricCard
          label="Avg Win R"
          value={`+${analytics.avgWinR.toFixed(2)}R`}
          helper="Winning days"
        />

        <MetricCard
          label="Avg Loss R"
          value={`${analytics.avgLossR.toFixed(2)}R`}
          positive={false}
          helper="Losing days"
        />

        <MetricCard
          label="Profit Factor"
          value={analytics.profitFactor}
          helper="Ratio"
        />

        <MetricCard
          label="Max Drawdown"
          value={`${analytics.maxDrawdown.toFixed(2)}R`}
          positive={false}
          helper="Worst day"
        />

        <MiniDonut
          winning={analytics.winningDays}
          losing={analytics.losingDays}
          breakeven={analytics.breakevenDays}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-600">
                <CalendarDays className="h-3.5 w-3.5" />
                Behavioral Calendar Intelligence
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

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => changePeriod(-1)}
                className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => changePeriod(1)}
                className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {mode !== "Daily" ? (
            <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-black uppercase text-slate-400">
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

        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur-xl">
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
                  value={`${selectedDayData.totalR > 0 ? "+" : ""}${selectedDayData.totalR.toFixed(
                    2,
                  )}R`}
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
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${flag.cls}`}
                        >
                          <Icon className="h-4 w-4" />
                          {flag.label}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-slate-500">
                      No major warning detected.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-black uppercase text-slate-400">
                  Trades
                </div>

                <div className="mt-3 space-y-2">
                  {selectedDayData.journals.map((journal) => (
                    <div
                      key={journal.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm"
                    >
                      <div className="font-black text-slate-900">
                        {journal.symbols?.symbol_name || "—"} •{" "}
                        {journal.direction || "—"} •{" "}
                        {calculateRMultiple(journal).toFixed(2)}R
                      </div>

                      <div className="mt-1 text-xs font-bold text-slate-500">
                        {journal.strategy_snapshot?.strategy_name ||
                          "No Strategy"}
                      </div>

                      <div className="mt-1 text-xs font-bold text-slate-400">
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
