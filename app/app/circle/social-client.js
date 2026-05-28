"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Layers,
  PlusCircle,
  RefreshCcw,
  Share2,
  Sparkles,
  Target,
  ThumbsDown,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  X,
} from "lucide-react";

import JournalDetailsModal from "../radars/journal-details-modal";
import CommentsSection from "./comments-section";

function norm(v) {
  return String(v || "")
    .trim()
    .toUpperCase();
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function shortText(value, max = 120) {
  const text = String(value || "—");
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function getStrategy(journal) {
  return journal.strategy_snapshot || {};
}

function getAuthorName(journal) {
  return (
    journal.authorName ||
    journal.author_name ||
    journal.profiles?.full_name ||
    journal.profiles?.username ||
    "Trader"
  );
}

function getSharedTime(value) {
  if (!value) return "Shared recently";

  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));

  if (mins < 1) return "Shared just now";
  if (mins < 60) return `Shared ${mins} min${mins === 1 ? "" : "s"} ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Shared ${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `Shared ${days} day${days === 1 ? "" : "s"} ago`;

  return `Shared ${new Date(value).toLocaleDateString()}`;
}

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
  const direction = norm(journal.direction);
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

function formatTP(tp = [], qty = []) {
  if (!Array.isArray(tp) || tp.length === 0) return "—";

  if (Array.isArray(qty) && qty.length === tp.length) {
    return tp
      .map((p, i) => `TP ${i + 1}: ${p} · ${qty[i] ?? "—"} lots`)
      .join("\n");
  }

  return tp.map((p, i) => `TP ${i + 1}: ${p}`).join("\n");
}

function getStatusTone(status) {
  const s = norm(status);

  if (["ENTRY PLACED", "ENTRY TRIGGERED", "RUNNING TRADE"].includes(s)) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (s === "TRADE CLOSE WITH PROFIT") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (s === "TRADE SL HIT") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
}

function needsStatusConfirm(status) {
  return [
    "ENTRY TRIGGERED",
    "TRADE SL HIT",
    "TRADE CLOSE WITH PROFIT",
    "TRADE EXIT IN MID",
  ].includes(norm(status));
}

function Pill({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div className="mt-3 text-3xl font-black text-sky-600">{value}</div>
          {sub ? (
            <div className="mt-1 text-xs font-bold text-slate-500">{sub}</div>
          ) : null}
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition group-hover:bg-sky-50 group-hover:text-sky-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function NotePreview({ title, value }) {
  if (!value) return null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="mb-2 text-sm font-black text-slate-950">{title}</div>
      <div
        className="note-content prose prose-sm max-w-none text-sm text-slate-500"
        dangerouslySetInnerHTML={{ __html: value }}
      />
    </div>
  );
}

function JournalCardTabs({ journal }) {
  const [activeTab, setActiveTab] = useState("notes");
  const [parentCommentCount, setParentCommentCount] = useState(0);

  const hasNotes = Boolean(journal.owner_note || journal.admin_note);

  const tabs = [
    { key: "notes", label: "Notes", hasDot: hasNotes },
    { key: "comments", label: `Comments (${parentCommentCount})` },
  ];

  return (
    <div className="space-y-4 lg:col-span-3">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition ${
                active
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-white hover:text-slate-950"
              }`}
            >
              {tab.label}
              {tab.hasDot ? (
                <span
                  className={`h-2 w-2 rounded-full ${
                    active ? "bg-white" : "bg-emerald-500"
                  }`}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {activeTab === "notes" ? (
        journal.owner_note || journal.admin_note ? (
          <div className="grid gap-4 md:grid-cols-2">
            <NotePreview title="Trader Note" value={journal.owner_note} />
            <NotePreview title="Admin Note" value={journal.admin_note} />
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-sm font-semibold text-slate-500">
            No notes added yet.
          </div>
        )
      ) : null}

      {activeTab === "comments" ? (
        <CommentsSection
          journalId={journal.id}
          onParentCountChange={setParentCommentCount}
        />
      ) : (
        <CommentsSection
          journalId={journal.id}
          onParentCountChange={setParentCommentCount}
          hidden
        />
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
    >
      {children}
    </select>
  );
}

function ReactionButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-sm font-bold transition",
        active
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function formatChangeValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function ConfirmIncorporateModal({ journal, onClose }) {
  if (!journal) return null;

  const alreadyCopied = journal.copyStatus?.incorporated;
  const statusWarning = needsStatusConfirm(journal.status);
  const updatedFields = journal.copyStatus?.updatedFields || [];
  const href = `/app/radars/new?sharedJournalId=${journal.id}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase text-orange-700">
              <AlertTriangle className="h-4 w-4" />
              Confirm Incorporation
            </div>

            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
              Continue with this opportunity?
            </h2>

            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              {alreadyCopied
                ? "You already incorporated this journal before. Review the author’s latest changes before creating another copy."
                : "This will create a new opportunity from this shared journal."}
            </p>

            {statusWarning ? (
              <p className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">
                Current status: {journal.status}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {updatedFields.length > 0 ? (
          <div className="max-h-[52vh] overflow-y-auto p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Author updated these values
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Old value is what you copied. New value is the latest shared
                  version.
                </p>
              </div>

              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase text-orange-700">
                {updatedFields.length} changes
              </span>
            </div>

            <div className="grid gap-3">
              {updatedFields.map((change) => (
                <div
                  key={change.key}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-3 text-sm font-black uppercase tracking-wide text-slate-600">
                    {change.label}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-red-200 bg-white p-4">
                      <div className="mb-2 text-xs font-black uppercase text-red-600">
                        Old
                      </div>
                      <div className="whitespace-pre-wrap break-words text-sm font-bold leading-6 text-slate-800">
                        {formatChangeValue(change.oldValue)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-white p-4">
                      <div className="mb-2 text-xs font-black uppercase text-emerald-600">
                        New
                      </div>
                      <div className="whitespace-pre-wrap break-words text-sm font-bold leading-6 text-slate-800">
                        {formatChangeValue(change.newValue)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 text-sm font-semibold text-slate-500">
            No updated values found.
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 bg-slate-50 p-5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <a
            href={href}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-sky-600 px-5 text-sm font-bold text-white hover:bg-sky-700"
          >
            <PlusCircle className="h-4 w-4" />
            Continue
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SocialClient({ journals }) {
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [confirmJournal, setConfirmJournal] = useState(null);

  const [purposeFilter, setPurposeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [directionFilter, setDirectionFilter] = useState("ALL");
  const [symbolFilter, setSymbolFilter] = useState("ALL");
  const [copyFilter, setCopyFilter] = useState("ALL");
  const [htfFilter, setHtfFilter] = useState("ALL");
  const [entryTfFilter, setEntryTfFilter] = useState("ALL");
  const [tradingStyleFilter, setTradingStyleFilter] = useState("ALL");
  const [setupTypeFilter, setSetupTypeFilter] = useState("ALL");
  const [approachFilter, setApproachFilter] = useState("ALL");
  const [userFilter, setUserFilter] = useState("ALL");

  const [localReactions, setLocalReactions] = useState({});

  const stats = useMemo(() => {
    const total = journals.length;
    const incorporated = journals.filter(
      (j) => j.copyStatus?.incorporated,
    ).length;

    const buy = journals.filter((j) => norm(j.direction) === "BUY").length;
    const sell = journals.filter((j) => norm(j.direction) === "SELL").length;

    const totalIncorporations = journals.reduce(
      (acc, j) => acc + Number(j.incorporatedCount || j.copyCount || 0),
      0,
    );

    return { total, incorporated, buy, sell, totalIncorporations };
  }, [journals]);

  const filterOptions = useMemo(() => {
    const purposes = Array.from(
      new Set(journals.map((j) => j.purpose).filter(Boolean)),
    );

    const statuses = Array.from(
      new Set(journals.map((j) => j.status || "No status")),
    );

    const directions = Array.from(
      new Set(journals.map((j) => j.direction).filter(Boolean)),
    );

    const symbols = Array.from(
      new Set(
        journals
          .map((j) =>
            j.symbols
              ? `${j.symbols.symbol_name} — ${j.symbols.category}`
              : null,
          )
          .filter(Boolean),
      ),
    );

    const htf = Array.from(
      new Set(journals.flatMap((j) => asArray(j.htf || getStrategy(j).htf))),
    ).filter(Boolean);

    const entryTf = Array.from(
      new Set(
        journals.flatMap((j) => asArray(j.entry_tf || getStrategy(j).entry_tf)),
      ),
    ).filter(Boolean);

    const tradingStyles = Array.from(
      new Set(
        journals.map((j) => getStrategy(j).trading_style).filter(Boolean),
      ),
    );

    const setupTypes = Array.from(
      new Set(journals.map((j) => getStrategy(j).setup_type).filter(Boolean)),
    );

    const approaches = Array.from(
      new Set(
        journals.map((j) => getStrategy(j).strategy_type).filter(Boolean),
      ),
    );

    const users = Array.from(new Set(journals.map(getAuthorName))).filter(
      Boolean,
    );

    return {
      purposes,
      statuses,
      directions,
      symbols,
      htf,
      entryTf,
      tradingStyles,
      setupTypes,
      approaches,
      users,
    };
  }, [journals]);

  const filteredJournals = useMemo(() => {
    return journals.filter((journal) => {
      const strategy = getStrategy(journal);

      const purposeMatch =
        purposeFilter === "ALL" || journal.purpose === purposeFilter;

      const statusValue = journal.status || "No status";
      const statusMatch =
        statusFilter === "ALL" || statusValue === statusFilter;

      const directionMatch =
        directionFilter === "ALL" || journal.direction === directionFilter;

      const symbolValue = journal.symbols
        ? `${journal.symbols.symbol_name} — ${journal.symbols.category}`
        : "";

      const symbolMatch =
        symbolFilter === "ALL" || symbolValue === symbolFilter;

      const copyMatch =
        copyFilter === "ALL" ||
        (copyFilter === "INCORPORATED" && journal.copyStatus?.incorporated) ||
        (copyFilter === "NOT_INCORPORATED" &&
          !journal.copyStatus?.incorporated) ||
        (copyFilter === "AUTHOR_UPDATED" &&
          journal.copyStatus?.incorporated &&
          journal.copyStatus?.authorUpdatedAfterCopy);

      const htfMatch =
        htfFilter === "ALL" ||
        asArray(journal.htf || strategy.htf).includes(htfFilter);

      const entryTfMatch =
        entryTfFilter === "ALL" ||
        asArray(journal.entry_tf || strategy.entry_tf).includes(entryTfFilter);

      const tradingStyleMatch =
        tradingStyleFilter === "ALL" ||
        strategy.trading_style === tradingStyleFilter;

      const setupTypeMatch =
        setupTypeFilter === "ALL" || strategy.setup_type === setupTypeFilter;

      const approachMatch =
        approachFilter === "ALL" || strategy.strategy_type === approachFilter;

      const userMatch =
        userFilter === "ALL" || getAuthorName(journal) === userFilter;

      return (
        purposeMatch &&
        statusMatch &&
        directionMatch &&
        symbolMatch &&
        copyMatch &&
        htfMatch &&
        entryTfMatch &&
        tradingStyleMatch &&
        setupTypeMatch &&
        approachMatch &&
        userMatch
      );
    });
  }, [
    journals,
    purposeFilter,
    statusFilter,
    directionFilter,
    symbolFilter,
    copyFilter,
    htfFilter,
    entryTfFilter,
    tradingStyleFilter,
    setupTypeFilter,
    approachFilter,
    userFilter,
  ]);

  function resetFilters() {
    setPurposeFilter("ALL");
    setStatusFilter("ALL");
    setDirectionFilter("ALL");
    setSymbolFilter("ALL");
    setCopyFilter("ALL");
    setHtfFilter("ALL");
    setEntryTfFilter("ALL");
    setTradingStyleFilter("ALL");
    setSetupTypeFilter("ALL");
    setApproachFilter("ALL");
    setUserFilter("ALL");
  }

  async function handleReaction(journalId, reaction) {
    const current = localReactions[journalId] || null;
    const nextReaction = current === reaction ? null : reaction;

    setLocalReactions((prev) => ({
      ...prev,
      [journalId]: nextReaction,
    }));

    const res = await fetch("/api/journal-reactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        journal_id: journalId,
        reaction: nextReaction,
      }),
    });

    if (!res.ok) {
      setLocalReactions((prev) => ({
        ...prev,
        [journalId]: current,
      }));

      console.log("Reaction save failed");
    }
  }

  function handleIncorporateClick(journal) {
    if (
      journal.copyStatus?.incorporated ||
      needsStatusConfirm(journal.status)
    ) {
      setConfirmJournal(journal);
      return;
    }

    window.location.href = `/app/radars/new?sharedJournalId=${journal.id}`;
  }

  console.log("FILTERED JOURNALS:", filteredJournals);

  return (
    <>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-sky-100/70 blur-3xl" />

          <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-black uppercase tracking-wide text-sky-600">
                <Sparkles className="h-4 w-4" />
                Collective Edge
              </div>

              <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">
                Community Picks
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-500">
                Explore shared trade ideas, review other traders’ setups, and
                incorporate useful opportunities into your own journal.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-950">
                    {stats.total}
                  </div>
                  <div className="text-xs font-bold uppercase text-slate-500">
                    Shared Opportunities
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            icon={Share2}
            label="Shared"
            value={stats.total}
            sub="Community ideas"
          />
          <StatCard
            icon={CheckCircle2}
            label="Incorporated"
            value={stats.incorporated}
            sub="Copied by you"
          />
          <StatCard
            icon={BookOpen}
            label="Total Copies"
            value={stats.totalIncorporations}
            sub="All users"
          />
          <StatCard
            icon={TrendingUp}
            label="Buy Ideas"
            value={stats.buy}
            sub="Long setups"
          />
          <StatCard
            icon={TrendingDown}
            label="Sell Ideas"
            value={stats.sell}
            sub="Short setups"
          />
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-black text-slate-950">
              <Filter className="h-4 w-4 text-sky-600" />
              Filters
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            <FilterSelect
              value={copyFilter}
              onChange={(e) => setCopyFilter(e.target.value)}
            >
              <option value="ALL">All journals</option>
              <option value="INCORPORATED">Incorporated</option>
              <option value="NOT_INCORPORATED">Not incorporated</option>
              <option value="AUTHOR_UPDATED">Author updated</option>
            </FilterSelect>

            <FilterSelect
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
            >
              <option value="ALL">All symbols</option>
              {filterOptions.symbols.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              value={htfFilter}
              onChange={(e) => setHtfFilter(e.target.value)}
            >
              <option value="ALL">All HTF</option>
              {filterOptions.htf.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              value={entryTfFilter}
              onChange={(e) => setEntryTfFilter(e.target.value)}
            >
              <option value="ALL">All Entry TF</option>
              {filterOptions.entryTf.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              value={tradingStyleFilter}
              onChange={(e) => setTradingStyleFilter(e.target.value)}
            >
              <option value="ALL">All trading styles</option>
              {filterOptions.tradingStyles.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              value={setupTypeFilter}
              onChange={(e) => setSetupTypeFilter(e.target.value)}
            >
              <option value="ALL">All setup types</option>
              {filterOptions.setupTypes.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              value={approachFilter}
              onChange={(e) => setApproachFilter(e.target.value)}
            >
              <option value="ALL">All approaches</option>
              {filterOptions.approaches.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            >
              <option value="ALL">All users</option>
              {filterOptions.users.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              value={purposeFilter}
              onChange={(e) => setPurposeFilter(e.target.value)}
            >
              <option value="ALL">All purposes</option>
              {filterOptions.purposes.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All statuses</option>
              {filterOptions.statuses.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </FilterSelect>
          </div>
        </section>

        {journals.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
              <BookOpen className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-xl font-black text-slate-950">
              No community picks yet
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Shared journals from other traders will appear here.
            </p>
          </div>
        ) : filteredJournals.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
            No community picks match your filters.
          </div>
        ) : (
          <div className="grid gap-5">
            {filteredJournals.map((journal) => {
              const strategy = getStrategy(journal);
              const symbol = journal.symbols
                ? `${journal.symbols.symbol_name} — ${journal.symbols.category}`
                : "—";

              const rr = calculatePlannedRR(journal);
              const isSell = norm(journal.direction) === "SELL";
              const incorporated = journal.copyStatus?.incorporated;
              const authorUpdated = journal.copyStatus?.authorUpdatedAfterCopy;
              const alreadySynced = incorporated && !authorUpdated;
              const reaction =
                localReactions[journal.id] || journal.myReaction || null;
              const incorporatedCount = Number(
                journal.incorporatedCount || journal.copyCount || 0,
              );

              return (
                <article
                  key={journal.id}
                  className={[
                    "group overflow-hidden rounded-[2rem] border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl",
                    authorUpdated
                      ? "border-orange-200 hover:border-orange-300"
                      : alreadySynced
                        ? "border-emerald-200 bg-emerald-50/20 hover:border-emerald-300"
                        : "border-slate-200 hover:border-sky-200",
                  ].join(" ")}
                >
                  <div className="border-b border-slate-100 bg-gradient-to-br from-white to-slate-50 p-5">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div
                          className={[
                            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide shadow-sm",
                            alreadySynced
                              ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                              : incorporated && authorUpdated
                                ? "bg-orange-100 text-orange-700 ring-1 ring-orange-200"
                                : "bg-sky-100 text-sky-700 ring-1 ring-sky-200",
                          ].join(" ")}
                        >
                          {alreadySynced ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : incorporated && authorUpdated ? (
                            <Sparkles className="h-4 w-4" />
                          ) : (
                            <PlusCircle className="h-4 w-4" />
                          )}

                          <span>
                            {alreadySynced
                              ? "Already Incorporated"
                              : incorporated && authorUpdated
                                ? "Updated After Your Copy"
                                : "New Opportunity"}
                          </span>
                        </div>

                        {incorporated && (
                          <div className="text-xs font-semibold text-slate-500">
                            {authorUpdated
                              ? "Author made new changes after your incorporation."
                              : "You already incorporated this setup."}
                          </div>
                        )}
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h2 className="text-2xl font-black tracking-tight text-slate-950">
                            {strategy.strategy_name || "Shared Journal"}
                          </h2>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <UserRound className="h-3.5 w-3.5" />
                              {getAuthorName(journal)}
                            </span>

                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {getSharedTime(journal.shared_at)}
                            </span>

                            <span className="inline-flex items-center gap-1">
                              <BookOpen className="h-3.5 w-3.5" />
                              {incorporatedCount} incorporated
                            </span>
                          </div>
                        </div>

                        <div className="ml-auto flex shrink-0 flex-wrap justify-end gap-2">
                          <ReactionButton
                            active={reaction === "INTERESTED"}
                            onClick={() =>
                              handleReaction(journal.id, "INTERESTED")
                            }
                          >
                            <ThumbsUp className="h-4 w-4" />
                            Interested
                          </ReactionButton>

                          <ReactionButton
                            active={reaction === "NO_IDEA"}
                            onClick={() =>
                              handleReaction(journal.id, "NO_IDEA")
                            }
                          >
                            <ThumbsDown className="h-4 w-4" />
                            No idea
                          </ReactionButton>

                          <button
                            type="button"
                            onClick={() => setSelectedJournal(journal)}
                            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                          >
                            <Eye className="h-4 w-4" />
                            Details
                          </button>

                          <button
                            type="button"
                            onClick={() => handleIncorporateClick(journal)}
                            className={[
                              "inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-bold text-white",
                              authorUpdated
                                ? "bg-orange-500 hover:bg-orange-600"
                                : alreadySynced
                                  ? "bg-emerald-600 hover:bg-emerald-700"
                                  : "bg-sky-600 hover:bg-sky-700",
                            ].join(" ")}
                          >
                            <PlusCircle className="h-4 w-4" />

                            {authorUpdated
                              ? "Incorporate Updated"
                              : alreadySynced
                                ? "Incorporate Again"
                                : "Incorporate"}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Pill className="border-slate-200 bg-white text-slate-600">
                          {journal.purpose || "—"}
                        </Pill>

                        <Pill className={getStatusTone(journal.status)}>
                          {journal.status || "No status"}
                        </Pill>

                        <Pill className="border-slate-200 bg-white text-slate-600">
                          {symbol}
                        </Pill>

                        <Pill
                          className={
                            isSell
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }
                        >
                          {journal.direction || "—"}
                        </Pill>

                        <Pill className="border-slate-200 bg-white text-slate-600">
                          RR: {rr > 0 ? `1:${round2(rr)}` : "—"}
                        </Pill>

                        <Pill className="border-slate-200 bg-white text-slate-600">
                          {strategy.trading_style || "—"}
                        </Pill>

                        <Pill className="border-slate-200 bg-white text-slate-600">
                          {strategy.setup_type || "—"}
                        </Pill>

                        <Pill className="border-slate-200 bg-white text-slate-600">
                          {strategy.strategy_type || "—"}
                        </Pill>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {asArray(journal.htf || strategy.htf).map((tf) => (
                          <Pill
                            key={`htf-${journal.id}-${tf}`}
                            className="border-indigo-200 bg-indigo-50 text-indigo-700"
                          >
                            HTF {tf}
                          </Pill>
                        ))}

                        {asArray(journal.entry_tf || strategy.entry_tf).map(
                          (tf) => (
                            <Pill
                              key={`etf-${journal.id}-${tf}`}
                              className="border-cyan-200 bg-cyan-50 text-cyan-700"
                            >
                              ETF {tf}
                            </Pill>
                          ),
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 p-5 lg:grid-cols-4">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-950">
                        <Target className="h-4 w-4 text-sky-600" />
                        Trade Plan
                      </div>

                      <div className="grid gap-3 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="font-semibold text-slate-500">
                            Entry
                          </span>
                          <span className="font-black text-slate-950">
                            {journal.entry_price ?? "—"}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="font-semibold text-slate-500">
                            SL
                          </span>
                          <span className="font-black text-slate-950">
                            {journal.stop_loss ?? "—"}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="font-semibold text-slate-500">
                            Risk
                          </span>
                          <span className="font-black text-slate-950">
                            {journal.risk_per_trade ?? "—"}{" "}
                            {journal.risk_mode || ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="mb-4 text-sm font-black text-slate-950">
                        Targets
                      </div>
                      <div className="whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-500">
                        {formatTP(journal.take_profit, journal.take_profit_qty)}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="mb-4 text-sm font-black text-slate-950">
                        Entry Reason
                      </div>
                      <div className="text-sm font-semibold leading-6 text-slate-500">
                        {shortText(journal.entry_reason, 140)}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-950">
                        <Layers className="h-4 w-4 text-sky-600" />
                        Exit Criteria
                      </div>
                      <div className="text-sm font-semibold leading-6 text-slate-500">
                        {shortText(
                          journal.exit_reason || strategy.exit_rules,
                          140,
                        )}
                      </div>
                    </div>

                    <JournalCardTabs journal={journal} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmIncorporateModal
        journal={confirmJournal}
        onClose={() => setConfirmJournal(null)}
      />

      <JournalDetailsModal
        journal={selectedJournal}
        onClose={() => setSelectedJournal(null)}
      />
    </>
  );
}
