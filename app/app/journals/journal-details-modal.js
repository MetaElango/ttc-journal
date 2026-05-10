"use client";
import { useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  Target,
  Wallet,
  ShieldCheck,
  FileText,
  ImageIcon,
  TrendingUp,
  TrendingDown,
  BadgeCheck,
} from "lucide-react";
function norm(v) {
  return String(v || "")
    .trim()
    .toUpperCase();
}
function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function formatTP(tp = [], qty = []) {
  if (!Array.isArray(tp) || tp.length === 0) return "—";
  if (Array.isArray(qty) && qty.length === tp.length) {
    return tp.map((p, i) => `TP ${i + 1}: ${p} (${qty[i] ?? "—"} lots)`);
  }
  return tp.map((p, i) => `TP ${i + 1}: ${p}`);
}
function getStatusTone(status) {
  const s = norm(status);
  if (["ENTRY PLACED", "ENTRY TRIGGERED", "RUNNING TRADE"].includes(s)) {
    return "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }
  if (["TRADE CLOSE WITH PROFIT"].includes(s)) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (["TRADE SL HIT"].includes(s)) {
    return "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300";
  }
  if (["ENTRY CANCELLED", "ENTRY MISSED"].includes(s)) {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{value ?? "—"}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}
function InfoBlock({ label, value, className = "" }) {
  return (
    <div className={`rounded-2xl border bg-background/60 p-4 ${className}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-sm leading-6 whitespace-pre-wrap">
        {value || "—"}
      </div>
    </div>
  );
}
function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-3xl border bg-card p-5 shadow-sm">
      <div className="mb-5 flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-background">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}
function ImageCarousel({ images, index, onClose, onPrev, onNext }) {
  if (!images?.length) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>
      {images.length > 1 ? (
        <button
          type="button"
          onClick={onPrev}
          className="absolute left-4 rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      ) : null}
      <img
        src={images[index]}
        alt={`Image ${index + 1}`}
        className="max-h-[86vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
      />
      {images.length > 1 ? (
        <button
          type="button"
          onClick={onNext}
          className="absolute right-4 rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      ) : null}
      <div className="absolute bottom-4 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}
function ImageGrid({ title, images = [], onOpen }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="text-xs text-muted-foreground">
          {images.length} image{images.length === 1 ? "" : "s"}
        </span>
      </div>
      {images.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed bg-muted/30 text-sm text-muted-foreground">
          No images uploaded.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {images.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              onClick={() => onOpen(images, index)}
              className="group overflow-hidden rounded-2xl border bg-muted"
            >
              <img
                src={url}
                alt={`${title} ${index + 1}`}
                className="h-40 w-full object-cover transition duration-300 group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export default function JournalDetailsModal({ journal, onClose }) {
  const [carousel, setCarousel] = useState(null);
  if (!journal) return null;
  const strategy = journal.strategy_snapshot || {};
  const symbol = journal.symbols
    ? `${journal.symbols.symbol_name} — ${journal.symbols.category}`
    : "—";
  const account = journal.trading_accounts
    ? `${journal.trading_accounts.account_name} — ${journal.trading_accounts.account_size}`
    : "—";
  const tpItems = formatTP(journal.take_profit, journal.take_profit_qty);
  function openCarousel(images, index) {
    setCarousel({ images, index });
  }
  function closeCarousel() {
    setCarousel(null);
  }
  function prevImage() {
    setCarousel((current) => {
      if (!current) return current;
      return {
        ...current,
        index:
          current.index === 0 ? current.images.length - 1 : current.index - 1,
      };
    });
  }
  function nextImage() {
    setCarousel((current) => {
      if (!current) return current;
      return {
        ...current,
        index:
          current.index === current.images.length - 1 ? 0 : current.index + 1,
      };
    });
  }
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 p-4 backdrop-blur-sm">
        <div className="mx-auto flex max-h-[92vh] max-w-6xl flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl">
          <div className="border-b bg-gradient-to-br from-card via-card to-muted/40 p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Journal Details
                </div>
                <h2 className="mt-4 truncate text-2xl font-semibold tracking-tight md:text-3xl">
                  {strategy.strategy_name || "Journal Details"}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill className={getStatusTone(journal.status)}>
                    {journal.status || "No status"}
                  </Pill>
                  <Pill>{journal.purpose || "—"}</Pill>
                  <Pill>{formatDateTime(journal.journal_start_at)}</Pill>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border bg-background p-2.5 hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="space-y-6 overflow-y-auto p-5 md:p-6">
            <div className="grid gap-3 md:grid-cols-4">
              <StatCard icon={Target} label="Symbol" value={symbol} />
              <StatCard
                icon={
                  norm(journal.direction) === "SELL" ? TrendingDown : TrendingUp
                }
                label="Direction"
                value={journal.direction || "—"}
              />
              <StatCard icon={Wallet} label="Trading Account" value={account} />
              <StatCard
                icon={ShieldCheck}
                label="Risk"
                value={
                  journal.risk_per_trade != null
                    ? `${journal.risk_per_trade} ${journal.risk_mode || ""}`
                    : "—"
                }
              />
            </div>
            <Section
              icon={CalendarClock}
              title="Trade Timeline"
              description="Start and end time recorded for this journal."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <InfoBlock
                  label="Journal Start Date"
                  value={formatDateTime(journal.journal_start_at)}
                />
                <InfoBlock
                  label="Journal End Date"
                  value={formatDateTime(journal.journal_end_at)}
                />
              </div>
            </Section>
            <Section
              icon={Target}
              title="Trade Plan"
              description="Entry, stop loss, quantity, take profit, and exit details."
            >
              <div className="grid gap-3 md:grid-cols-5">
                <InfoBlock label="Quantity" value={journal.quantity} />
                <InfoBlock label="Entry Price" value={journal.entry_price} />
                <InfoBlock label="Stop Loss" value={journal.stop_loss} />
                <InfoBlock label="Exit Price" value={journal.exit_price} />
                <InfoBlock
                  label="Take Profit"
                  value={
                    Array.isArray(tpItems) ? tpItems.join("\n") : tpItems || "—"
                  }
                  className="md:col-span-5"
                />
              </div>
            </Section>
            <Section
              icon={FileText}
              title="Journal Notes"
              description="Reasoning recorded for entry and exit."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <InfoBlock label="Entry Reason" value={journal.entry_reason} />
                <InfoBlock label="Exit Reason" value={journal.exit_reason} />
              </div>
            </Section>
            <Section
              icon={ShieldCheck}
              title="Strategy Snapshot"
              description="The strategy details saved at the time of journaling."
            >
              <div className="grid gap-3 md:grid-cols-4">
                <InfoBlock
                  label="Trading Style"
                  value={strategy.trading_style}
                />
                <InfoBlock label="Setup Type" value={strategy.setup_type} />
                <InfoBlock
                  label="Strategy Status"
                  value={strategy.strategy_status}
                />
                <InfoBlock
                  label="Preparation Status"
                  value={strategy.preparation_status}
                />
              </div>
            </Section>
            <Section
              icon={ImageIcon}
              title="Images"
              description="Setup and reference images attached to this journal."
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <ImageGrid
                  title="Setup Images"
                  images={journal.setupImageUrls || []}
                  onOpen={openCarousel}
                />
                <ImageGrid
                  title="Reference Images"
                  images={journal.referenceImageUrls || []}
                  onOpen={openCarousel}
                />
              </div>
            </Section>
            <Section
              icon={FileText}
              title="Strategy Rules"
              description="Checklist and execution rules from the strategy blueprint."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <InfoBlock label="Checklist" value={strategy.checklist} />
                <InfoBlock label="Entry Rules" value={strategy.entry_rules} />
                <InfoBlock label="Exit Rules" value={strategy.exit_rules} />
                <InfoBlock
                  label="SL Management Rules"
                  value={strategy.sl_management_rules}
                />
              </div>
            </Section>
          </div>
        </div>
      </div>
      {carousel ? (
        <ImageCarousel
          images={carousel.images}
          index={carousel.index}
          onClose={closeCarousel}
          onPrev={prevImage}
          onNext={nextImage}
        />
      ) : null}
    </>
  );
}
