"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BookOpen,
  Eye,
  ImageIcon,
  PlusCircle,
  Filter,
  Share2,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import JournalDetailsModal from "../journals/journal-details-modal";
import CommentsSection from "./comments-section";

function norm(v) {
  return String(v || "")
    .trim()
    .toUpperCase();
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function shortText(value, max = 90) {
  const text = String(value || "—");
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
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
    return "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }

  if (s === "TRADE CLOSE WITH PROFIT") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (s === "TRADE SL HIT") {
    return "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300";
  }

  return "border-border bg-muted text-muted-foreground";
}

function Pill({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border bg-background p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <div className="text-2xl font-semibold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}

function ImagePreviewRow({ setupImages = [], referenceImages = [] }) {
  const images = [...setupImages, ...referenceImages].slice(0, 4);
  const remaining = setupImages.length + referenceImages.length - images.length;

  if (images.length === 0) {
    return (
      <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed bg-muted/30 text-xs text-muted-foreground">
        No images
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {images.map((url, index) => (
        <div
          key={`${url}-${index}`}
          className="relative h-24 overflow-hidden rounded-2xl border bg-muted"
        >
          <img
            src={url}
            alt={`Preview ${index + 1}`}
            className="h-full w-full object-cover"
          />

          {index === images.length - 1 && remaining > 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
              +{remaining}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
function NotePreview({ title, value }) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border bg-background/60 p-4">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div
        className="note-content prose prose-sm max-w-none text-sm text-muted-foreground dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: value }}
      />
    </div>
  );
}
function JournalCardTabs({ journal }) {
  const [activeTab, setActiveTab] = useState("images");
  const [parentCommentCount, setParentCommentCount] = useState(0);

  const imageCount =
    (journal.setupImageUrls || []).length +
    (journal.referenceImageUrls || []).length;

  const hasNotes = Boolean(journal.owner_note || journal.admin_note);

  const tabs = [
    {
      key: "images",
      label: `Images (${imageCount})`,
    },
    {
      key: "notes",
      label: "Notes",
      hasDot: hasNotes,
    },
    {
      key: "comments",
      label: `Comments (${parentCommentCount})`,
    },
  ];

  return (
    <div className="lg:col-span-3 space-y-4">
      <div className="flex flex-wrap gap-2 rounded-2xl border bg-background/60 p-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {tab.label}

              {tab.hasDot ? (
                <span
                  className={`h-2 w-2 rounded-full ${
                    active ? "bg-primary-foreground" : "bg-emerald-500"
                  }`}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {activeTab === "images" ? (
        <ImagePreviewRow
          setupImages={journal.setupImageUrls || []}
          referenceImages={journal.referenceImageUrls || []}
        />
      ) : null}

      {activeTab === "notes" ? (
        journal.owner_note || journal.admin_note ? (
          <div className="grid gap-4 md:grid-cols-2">
            <NotePreview title="Trader Note" value={journal.owner_note} />
            <NotePreview title="Admin Note" value={journal.admin_note} />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
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
export default function SocialClient({ journals }) {
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [purposeFilter, setPurposeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [directionFilter, setDirectionFilter] = useState("ALL");
  const [symbolFilter, setSymbolFilter] = useState("ALL");

  const stats = useMemo(() => {
    const total = journals.length;
    const withImages = journals.filter(
      (j) =>
        (j.setupImageUrls || []).length > 0 ||
        (j.referenceImageUrls || []).length > 0,
    ).length;

    const buy = journals.filter((j) => norm(j.direction) === "BUY").length;
    const sell = journals.filter((j) => norm(j.direction) === "SELL").length;

    return { total, withImages, buy, sell };
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

    return {
      purposes,
      statuses,
      directions,
      symbols,
    };
  }, [journals]);

  const filteredJournals = useMemo(() => {
    return journals.filter((journal) => {
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

      return purposeMatch && statusMatch && directionMatch && symbolMatch;
    });
  }, [journals, purposeFilter, statusFilter, directionFilter, symbolFilter]);

  return (
    <>
      <div className="space-y-6">
        <div className="overflow-hidden rounded-3xl border bg-gradient-to-br from-card via-card to-muted/40 p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Community Journals
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                Social
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Explore shared journals from other traders and incorporate
                useful setups into your own playbook.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <StatCard icon={Share2} label="Shared Journals" value={stats.total} />
          <StatCard
            icon={ImageIcon}
            label="With Images"
            value={stats.withImages}
          />
          <StatCard icon={TrendingUp} label="Buy Ideas" value={stats.buy} />
          <StatCard icon={TrendingDown} label="Sell Ideas" value={stats.sell} />
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Filters
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <select
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              className="h-11 rounded-xl border bg-background px-3 text-sm"
            >
              <option value="ALL">All symbols</option>

              {filterOptions.symbols.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <select
              value={purposeFilter}
              onChange={(e) => setPurposeFilter(e.target.value)}
              className="h-11 rounded-xl border bg-background px-3 text-sm"
            >
              <option value="ALL">All purposes</option>
              {filterOptions.purposes.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 rounded-xl border bg-background px-3 text-sm"
            >
              <option value="ALL">All statuses</option>
              {filterOptions.statuses.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="h-11 rounded-xl border bg-background px-3 text-sm"
            >
              <option value="ALL">All directions</option>
              {filterOptions.directions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setPurposeFilter("ALL");
                setStatusFilter("ALL");
                setDirectionFilter("ALL");
              }}
              className="h-11 rounded-xl border bg-background px-3 text-sm hover:bg-accent"
            >
              Reset filters
            </button>
          </div>
        </div>

        {journals.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">
              No shared journals yet
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Shared journals from other traders will appear here.
            </p>
          </div>
        ) : filteredJournals.length === 0 ? (
          <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">
            No shared journals match your search.
          </div>
        ) : (
          <div className="grid gap-5">
            {filteredJournals.map((journal, index) => {
              const strategy = journal.strategy_snapshot || {};
              const symbol = journal.symbols
                ? `${journal.symbols.symbol_name} — ${journal.symbols.category}`
                : "—";

              const rr = calculatePlannedRR(journal);
              const isSell = norm(journal.direction) === "SELL";

              return (
                <article
                  key={journal.id}
                  className={[
                    "group overflow-hidden rounded-3xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                    index % 2 === 1 ? "bg-muted/20" : "",
                  ].join(" ")}
                >
                  <div className="border-b bg-muted/20 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 space-y-3">
                        <div>
                          <h2 className="text-xl font-semibold tracking-tight">
                            {strategy.strategy_name || "Shared Journal"}
                          </h2>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Shared by Trader
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Pill>{journal.purpose || "—"}</Pill>
                          <Pill className={getStatusTone(journal.status)}>
                            {journal.status || "No status"}
                          </Pill>
                          <Pill>{symbol}</Pill>
                          <Pill
                            className={
                              isSell
                                ? "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300"
                                : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            }
                          >
                            {journal.direction || "—"}
                          </Pill>
                          <Pill>RR: {rr > 0 ? `1:${round2(rr)}` : "—"}</Pill>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedJournal(journal)}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border bg-background px-3 text-sm hover:bg-accent"
                        >
                          <Eye className="h-4 w-4" />
                          Details
                        </button>

                        <Link
                          href={`/app/journals/new?sharedJournalId=${journal.id}`}
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Incorporate
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 p-5 lg:grid-cols-3">
                    <div className="rounded-2xl border bg-background/60 p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        Trade Plan
                      </div>

                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Entry</span>
                          <span className="font-medium">
                            {journal.entry_price ?? "—"}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">SL</span>
                          <span className="font-medium">
                            {journal.stop_loss ?? "—"}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Risk</span>
                          <span className="font-medium">
                            {journal.risk_per_trade ?? "—"}{" "}
                            {journal.risk_mode || ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border bg-background/60 p-4">
                      <div className="mb-3 text-sm font-semibold">Targets</div>
                      <div className="text-sm leading-6 whitespace-pre-wrap text-muted-foreground">
                        {formatTP(journal.take_profit, journal.take_profit_qty)}
                      </div>
                    </div>

                    <div className="rounded-2xl border bg-background/60 p-4">
                      <div className="mb-3 text-sm font-semibold">
                        Entry Reason
                      </div>
                      <div className="text-sm leading-6 text-muted-foreground">
                        {shortText(journal.entry_reason, 120)}
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

      <JournalDetailsModal
        journal={selectedJournal}
        onClose={() => setSelectedJournal(null)}
      />
    </>
  );
}
