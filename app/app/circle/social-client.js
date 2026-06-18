"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  Filter,
  Layers,
  MessageSquareText,
  PlusCircle,
  RefreshCcw,
  Share2,
  Sparkles,
  StickyNote,
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

function shortText(value, max = 120) {
  const text = String(value || "—");
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
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

function formatRisk(journal) {
  const mode = norm(journal.risk_mode);
  const risk = journal.risk_per_trade;

  if (risk == null) return "—";
  if (mode === "PERCENT") return `${risk}%`;
  if (mode === "AMOUNT") return `$${risk}`;

  return risk;
}

function formatTP(tp = [], qty = []) {
  if (!Array.isArray(tp) || tp.length === 0) return "—";

  if (Array.isArray(qty) && qty.length === tp.length) {
    return tp
      .map((p, i) => `TP ${i + 1}: ${p} · ${qty[i] ?? "—"} lots`)
      .join(", ");
  }

  return tp.map((p, i) => `TP ${i + 1}: ${p}`).join(", ");
}

function getStatusStyle(status) {
  const s = norm(status);

  if (["ENTRY PLACED", "ENTRY TRIGGERED", "RUNNING TRADE"].includes(s)) {
    return {
      border: "border-l-emerald-500",
      badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
      label: status || "Open",
    };
  }

  if (s === "TRADE CLOSE WITH PROFIT") {
    return {
      border: "border-l-blue-500",
      badge: "border-blue-500/25 bg-blue-500/10 text-blue-700",
      label: status,
    };
  }

  if (s === "TRADE SL HIT") {
    return {
      border: "border-l-red-500",
      badge: "border-red-500/25 bg-red-500/10 text-red-700",
      label: status,
    };
  }

  if (["ENTRY CANCELLED", "ENTRY MISSED"].includes(s)) {
    return {
      border: "border-l-muted-foreground/40",
      badge: "border-border bg-muted text-muted-foreground",
      label: status,
    };
  }

  return {
    border: "border-l-border",
    badge: "border-border bg-background text-muted-foreground",
    label: status || "No status",
  };
}

function needsStatusConfirm(status) {
  return [
    "ENTRY TRIGGERED",
    "TRADE SL HIT",
    "TRADE CLOSE WITH PROFIT",
    "TRADE EXIT IN MID",
  ].includes(norm(status));
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border bg-background/70 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value ?? "—"}</div>
    </div>
  );
}

function FilterSelect({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="h-10 rounded-xl border bg-background px-3 text-xs font-medium text-foreground outline-none transition hover:bg-accent focus:ring-2 focus:ring-ring"
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
        "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function NotePreview({ title, value }) {
  return (
    <div className="rounded-2xl border bg-background/70 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <MessageSquareText className="h-4 w-4 text-muted-foreground" />
        {title}
      </div>

      {value ? (
        <div
          className="note-content prose prose-sm max-w-none text-sm"
          dangerouslySetInnerHTML={{ __html: value }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No note added yet.</p>
      )}
    </div>
  );
}

function SocialJournalTabs({ journal }) {
  const [activeTab, setActiveTab] = useState("notes");
  const [commentCount, setCommentCount] = useState(0);

  const hasNotes = Boolean(journal.owner_note || journal.admin_note);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
            activeTab === "notes"
              ? "bg-primary text-primary-foreground"
              : "bg-background hover:bg-accent"
          }`}
        >
          <StickyNote className="h-3.5 w-3.5" />
          Notes
          {hasNotes ? (
            <span
              className={`h-2 w-2 rounded-full ${
                activeTab === "notes"
                  ? "bg-primary-foreground"
                  : "bg-emerald-500"
              }`}
            />
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("comments")}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
            activeTab === "comments"
              ? "bg-primary text-primary-foreground"
              : "bg-background hover:bg-accent"
          }`}
        >
          <MessageSquareText className="h-3.5 w-3.5" />
          Comments
          <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px]">
            {commentCount}
          </span>
        </button>
      </div>

      {activeTab === "notes" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <NotePreview title="Trader Note" value={journal.owner_note} />
          <NotePreview title="Admin Note" value={journal.admin_note} />
        </div>
      ) : null}

      {activeTab === "comments" ? (
        <CommentsSection
          journalId={journal.id}
          onParentCountChange={setCommentCount}
        />
      ) : (
        <CommentsSection
          journalId={journal.id}
          onParentCountChange={setCommentCount}
          hidden
        />
      )}
    </div>
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
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b p-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700">
              <AlertTriangle className="h-4 w-4" />
              Confirm Incorporation
            </div>

            <h2 className="mt-4 text-2xl font-bold tracking-tight">
              Continue with this opportunity?
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {alreadyCopied
                ? "You already incorporated this journal before. Review the author’s latest changes before creating another copy."
                : "This will create a new opportunity from this shared journal."}
            </p>

            {statusWarning ? (
              <p className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700">
                Current status: {journal.status}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {updatedFields.length > 0 ? (
          <div className="max-h-[52vh] overflow-y-auto p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">
                  Author updated these values
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Old value is what you copied. New value is the latest shared
                  version.
                </p>
              </div>

              <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                {updatedFields.length} changes
              </span>
            </div>

            <div className="grid gap-3">
              {updatedFields.map((change) => (
                <div
                  key={change.key}
                  className="rounded-2xl border bg-muted/20 p-4"
                >
                  <div className="mb-3 text-sm font-bold uppercase text-muted-foreground">
                    {change.label}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-red-200 bg-background p-4">
                      <div className="mb-2 text-xs font-bold uppercase text-red-600">
                        Old
                      </div>
                      <div className="whitespace-pre-wrap break-words text-sm font-semibold">
                        {formatChangeValue(change.oldValue)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-background p-4">
                      <div className="mb-2 text-xs font-bold uppercase text-emerald-600">
                        New
                      </div>
                      <div className="whitespace-pre-wrap break-words text-sm font-semibold">
                        {formatChangeValue(change.newValue)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 text-sm text-muted-foreground">
            No updated values found.
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t bg-muted/20 p-5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-xl border bg-background px-4 text-xs font-medium hover:bg-accent"
          >
            Cancel
          </button>

          <a
            href={href}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-medium text-primary-foreground"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Continue
          </a>
        </div>
      </div>
    </div>
  );
}

function SocialJournalCard({
  journal,
  index,
  setSelectedJournal,
  handleIncorporateClick,
  handleReaction,
  localReactions,
}) {
  const strategy = getStrategy(journal);

  const symbol = journal.symbols?.symbol_name || "—";
  const category = journal.symbols?.category || "—";
  const strategyName = strategy.strategy_name || "Shared Journal";
  const tradingStyle = strategy.trading_style || "—";
  const setup = strategy.setup_type || "—";
  const approach = strategy.strategy_type || "—";
  const rr = calculatePlannedRR(journal);

  const statusStyle = getStatusStyle(journal.status);
  const isBuy = norm(journal.direction) === "BUY";
  const isSell = norm(journal.direction) === "SELL";

  const incorporated = journal.copyStatus?.incorporated;
  const authorUpdated = journal.copyStatus?.authorUpdatedAfterCopy;
  const alreadySynced = incorporated && !authorUpdated;

  const reaction = localReactions[journal.id] || journal.myReaction || null;

  const incorporatedCount = Number(
    journal.incorporatedCount || journal.copyCount || 0,
  );

  return (
    <article
      className={[
        "group overflow-hidden rounded-3xl border border-l-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        authorUpdated
          ? "border-l-orange-500"
          : alreadySynced
            ? "border-l-emerald-500"
            : statusStyle.border,
        index % 2 === 0 ? "bg-card" : "bg-muted/20",
      ].join(" ")}
    >
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xl font-bold tracking-tight ${
                  isBuy
                    ? "border-emerald-500 text-emerald-500"
                    : isSell
                      ? "border-orange-200 text-orange-400"
                      : "border-slate-200 text-slate-500"
                }`}
              >
                {isBuy ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {symbol}
              </div>

              <h3 className="truncate text-lg font-semibold tracking-tight text-muted-foreground">
                {strategyName}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex flex-wrap overflow-hidden rounded-2xl border bg-muted/30">
                <div className="border-r px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Style
                  </p>
                  <p className="text-xs font-bold uppercase text-foreground">
                    {tradingStyle}
                  </p>
                </div>

                <div className="border-r px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Setup
                  </p>
                  <p className="text-xs font-bold uppercase text-foreground">
                    {setup}
                  </p>
                </div>

                <div className="border-r px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    RR
                  </p>
                  <p className="text-xs font-bold uppercase text-foreground">
                    {rr > 0 ? `1:${round2(rr)}` : "—"}
                  </p>
                </div>

                <div className="border-r px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </p>
                  <p className="text-xs font-bold uppercase text-foreground">
                    {statusStyle.label}
                  </p>
                </div>

                <div className="border-r px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Category
                  </p>
                  <p className="text-xs font-bold uppercase text-foreground">
                    {category}
                  </p>
                </div>

                <div className="px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Copies
                  </p>
                  <p className="text-xs font-bold uppercase text-foreground">
                    {incorporatedCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyle.badge}`}
              >
                {journal.purpose || "—"}
              </span>

              <span className="inline-flex rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {approach}
              </span>

              {asArray(journal.htf || strategy.htf).map((tf) => (
                <span
                  key={`htf-${journal.id}-${tf}`}
                  className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
                >
                  HTF {tf}
                </span>
              ))}

              {asArray(journal.entry_tf || strategy.entry_tf).map((tf) => (
                <span
                  key={`etf-${journal.id}-${tf}`}
                  className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700"
                >
                  ETF {tf}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-3.5 w-3.5" />
                {getAuthorName(journal)}
              </span>

              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {getSharedTime(journal.shared_at)}
              </span>
            </div>

            {incorporated ? (
              <div
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium ${
                  authorUpdated
                    ? "border-orange-200 bg-orange-50 text-orange-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {authorUpdated ? (
                  <Sparkles className="h-3.5 w-3.5" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                {authorUpdated
                  ? "Author updated this after your copy"
                  : "Already incorporated by you"}
              </div>
            ) : null}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ReactionButton
              active={reaction === "INTERESTED"}
              onClick={() => handleReaction(journal.id, "INTERESTED")}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              Interested
            </ReactionButton>

            <ReactionButton
              active={reaction === "NO_IDEA"}
              onClick={() => handleReaction(journal.id, "NO_IDEA")}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              No idea
            </ReactionButton>

            <button
              type="button"
              onClick={() => setSelectedJournal(journal)}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
            >
              <Eye className="h-3.5 w-3.5" />
              Details
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleIncorporateClick(journal)}
              className={[
                "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition",
                authorUpdated
                  ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                  : alreadySynced
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
              ].join(" ")}
            >
              {alreadySynced ? (
                <Copy className="h-3.5 w-3.5" />
              ) : (
                <PlusCircle className="h-3.5 w-3.5" />
              )}

              {authorUpdated
                ? "Incorporate Updated"
                : alreadySynced
                  ? "Incorporate Again"
                  : "Incorporate"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <MiniStat label="Entry" value={journal.entry_price} />
          <MiniStat label="SL" value={journal.stop_loss} />
          <MiniStat
            label="TP"
            value={formatTP(journal.take_profit, journal.take_profit_qty)}
          />
          <MiniStat label="Risk" value={formatRisk(journal)} />
          <MiniStat label="Qty" value={journal.quantity} />
          <MiniStat label="Direction" value={journal.direction || "—"} />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border bg-background/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-muted-foreground" />
              Entry Reason
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {shortText(journal.entry_reason, 180)}
            </p>
          </div>

          <div className="rounded-2xl border bg-background/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Exit Criteria
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {shortText(journal.exit_reason || strategy.exit_rules, 180)}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <SocialJournalTabs journal={journal} />
      </div>
    </article>
  );
}

export default function SocialClient({ journals, title, description }) {
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [confirmJournal, setConfirmJournal] = useState(null);

  const [purposeFilter, setPurposeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
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

    const totalIncorporations = journals.reduce(
      (acc, j) => acc + Number(j.incorporatedCount || j.copyCount || 0),
      0,
    );

    return { total, incorporated, totalIncorporations };
  }, [journals]);

  const filterOptions = useMemo(() => {
    const purposes = Array.from(
      new Set(journals.map((j) => j.purpose).filter(Boolean)),
    );

    const statuses = Array.from(
      new Set(journals.map((j) => j.status || "No status")),
    );

    const symbols = Array.from(
      new Set(journals.map((j) => j.symbols?.symbol_name).filter(Boolean)),
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

      const symbolMatch =
        symbolFilter === "ALL" || journal.symbols?.symbol_name === symbolFilter;

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

  return (
    <>
      <div className="space-y-8">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {description}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {stats.total} Shared
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {stats.incorporated} Incorporated
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                <Share2 className="h-3.5 w-3.5" />
                {stats.totalIncorporations} Copies
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filters
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-9 items-center gap-2 rounded-xl border bg-background px-3 text-xs font-medium transition hover:bg-accent"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>

          <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
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
              <option value="ALL">All styles</option>
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
              <option value="ALL">All setups</option>
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
          <div className="rounded-3xl border border-dashed bg-card p-12 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">
              No community picks yet
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Shared journals from other traders will appear here.
            </p>
          </div>
        ) : filteredJournals.length === 0 ? (
          <div className="rounded-3xl border bg-card p-10 text-center text-sm text-muted-foreground">
            No community picks match your filters.
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredJournals.map((journal, index) => (
              <SocialJournalCard
                key={journal.id}
                journal={journal}
                index={index}
                setSelectedJournal={setSelectedJournal}
                handleIncorporateClick={handleIncorporateClick}
                handleReaction={handleReaction}
                localReactions={localReactions}
              />
            ))}
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
