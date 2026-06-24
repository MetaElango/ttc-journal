"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Filter, SlidersHorizontal, X } from "lucide-react";
import JournalsTableClient from "./journals-table-client";
import JournalIntelligencePanel from "./journal-intelligence-panel";

function getSetupSource(journal) {
  return journal.copied_from_journal_id ? "Incorporated" : "Own";
}

function makeLocalDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const controlClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

function FilterField({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function JournalsFilterShell({ journals, activeTab }) {
  const [account, setAccount] = useState("ALL");
  const [strategy, setStrategy] = useState("ALL");
  const [asset, setAsset] = useState("ALL");
  const [setupSource, setSetupSource] = useState("ALL");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

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

  const activeFilterCount = [
    account !== "ALL",
    strategy !== "ALL",
    asset !== "ALL",
    setupSource !== "ALL",
    customStart,
    customEnd,
  ].filter(Boolean).length;

  function resetFilters() {
    setAccount("ALL");
    setStrategy("ALL");
    setAsset("ALL");
    setSetupSource("ALL");
    setCustomStart("");
    setCustomEnd("");
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-white px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-sky-600">
              <Filter className="h-3.5 w-3.5" />
              Journal Filters
            </div>

            <p className="mt-2 text-sm font-medium text-slate-500">
              Showing{" "}
              <span className="font-black text-slate-900">
                {filteredJournals.length}
              </span>{" "}
              of{" "}
              <span className="font-black text-slate-900">
                {journals.length}
              </span>{" "}
              journals
            </p>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            disabled={activeFilterCount === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {activeFilterCount > 0 ? (
              <X className="h-4 w-4" />
            ) : (
              <SlidersHorizontal className="h-4 w-4" />
            )}
            Reset
          </button>
        </div>

        <div className="p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FilterField label="Account">
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className={controlClass}
              >
                <option value="ALL">All Accounts</option>
                {filterOptions.accounts.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Strategy">
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className={controlClass}
              >
                <option value="ALL">All Strategies</option>
                {filterOptions.strategies.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Asset">
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className={controlClass}
              >
                <option value="ALL">All Assets</option>
                {filterOptions.assets.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Source">
              <select
                value={setupSource}
                onChange={(e) => setSetupSource(e.target.value)}
                className={controlClass}
              >
                <option value="ALL">All Sources</option>
                {filterOptions.setupSources.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </FilterField>
          </div>

          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
              <CalendarDays className="h-4 w-4 text-sky-600" />
              Date Range
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FilterField label="From">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className={controlClass}
                />
              </FilterField>

              <FilterField label="To">
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className={controlClass}
                />
              </FilterField>
            </div>
          </div>
        </div>
      </section>
      <JournalsTableClient journals={filteredJournals} activeTab={activeTab} />
      <JournalIntelligencePanel
        journals={filteredJournals}
        rangeStart={customStart}
        rangeEnd={customEnd}
      />
    </div>
  );
}
