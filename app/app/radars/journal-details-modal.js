"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import CommentsSection from "../circle/comments-section";

const CLOSED_TRADE_STATUSES = [
  "TRADE CLOSE WITH PROFIT",
  "TRADE EXIT IN MID",
  "TRADE SL HIT",
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

function formatR(value) {
  const parsed = toNumber(value);

  if (parsed === null) {
    return "—";
  }

  return `${parsed > 0 ? "+" : ""}${parsed.toFixed(2)}R`;
}

function formatRiskReward(value) {
  const parsed = toNumber(value);

  if (parsed === null) {
    return "—";
  }

  return `1:${parsed.toFixed(2)}`;
}

function getStatusTone(status) {
  const normalizedStatus = norm(status);

  if (
    ["ENTRY PLACED", "ENTRY TRIGGERED", "RUNNING TRADE"].includes(
      normalizedStatus,
    )
  ) {
    return "border-blue-500/25 bg-blue-500/10 text-blue-700";
  }

  if (normalizedStatus === "TRADE CLOSE WITH PROFIT") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700";
  }

  if (normalizedStatus === "TRADE SL HIT") {
    return "border-red-500/25 bg-red-500/10 text-red-700";
  }

  if (normalizedStatus === "TRADE EXIT IN MID") {
    return "border-violet-500/25 bg-violet-500/10 text-violet-700";
  }

  if (["ENTRY CANCELLED", "ENTRY MISSED"].includes(normalizedStatus)) {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
}

function Pill({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${className}`}
    >
      {children}
    </span>
  );
}

function InfoBlock({ label, value, className = "" }) {
  const displayValue =
    value !== null && value !== undefined && value !== "" ? value : "—";

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 ${className}`}
    >
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
        {displayValue}
      </div>
    </div>
  );
}

function PerformanceCard({
  label,
  value,
  numericValue = null,
  helper = "",
  neutral = false,
}) {
  const parsedValue = toNumber(numericValue);

  let containerTone = "border-slate-200 bg-slate-50";
  let valueTone = "text-slate-950";
  let helperTone = "text-slate-500";

  if (!neutral && parsedValue !== null) {
    if (parsedValue > 0) {
      containerTone = "border-emerald-500/20 bg-emerald-500/5";
      valueTone = "text-emerald-700";
      helperTone = "text-emerald-600";
    } else if (parsedValue < 0) {
      containerTone = "border-red-500/20 bg-red-500/5";
      valueTone = "text-red-700";
      helperTone = "text-red-600";
    }
  }

  return (
    <div className={`min-w-0 rounded-2xl border p-4 ${containerTone}`}>
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className={`mt-2 truncate text-xl font-black ${valueTone}`}>
        {value}
      </div>

      {helper ? (
        <div className={`mt-2 text-xs font-bold ${helperTone}`}>{helper}</div>
      ) : null}
    </div>
  );
}

function ReasonBox({ label, value }) {
  return (
    <div>
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="min-h-[120px] resize-y overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
        {value || "—"}
      </div>
    </div>
  );
}

function NoteBlock({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 text-sm font-bold text-slate-950">{title}</div>

      {value ? (
        <div
          className="note-content prose prose-sm max-w-none text-sm"
          dangerouslySetInnerHTML={{ __html: value }}
        />
      ) : (
        <p className="text-sm text-slate-500">No note added yet.</p>
      )}
    </div>
  );
}

function ImageCarousel({ images, index, onClose, onPrev, onNext }) {
  if (!images?.length) {
    return null;
  }

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
        <>
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-4 rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={onNext}
            className="absolute right-4 rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      ) : null}

      <img
        src={images[index]}
        alt={`Image ${index + 1}`}
        className="max-h-[86vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
      />

      <div className="absolute bottom-4 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}

export default function JournalDetailsModal({
  journal,
  onClose,
  afterContent,
  expectancyR = null,
}) {
  const [carousel, setCarousel] = useState({
    images: [],
    index: 0,
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [, setCommentCount] = useState(0);

  const allImages = useMemo(() => {
    if (!journal) {
      return [];
    }

    return [
      ...(journal.setupImageUrls || []),
      ...(journal.referenceImageUrls || []),
    ];
  }, [journal]);

  useEffect(() => {
    setActiveIndex(0);
    setCarousel({
      images: [],
      index: 0,
    });
  }, [journal?.id]);

  if (!journal) {
    return null;
  }

  const strategy = journal.strategy_snapshot || {};
  const activeImages = allImages;

  const symbol = journal.symbols
    ? `${journal.symbols.symbol_name} — ${journal.symbols.category}`
    : "—";

  const directionLabel = norm(journal.direction) === "SELL" ? "SHORT" : "LONG";

  const isClosedTrade = CLOSED_TRADE_STATUSES.includes(norm(journal.status));

  const profitLossUsd =
    toNumber(journal.profit_loss_usd) ??
    toNumber(journal.calculated_profit_loss_usd) ??
    toNumber(journal.calculation?.profit_loss_usd);

  const realizedR =
    toNumber(journal.calculated_r_multiple) ??
    toNumber(journal.calculation?.r_multiple);

  const plannedRiskReward =
    toNumber(journal.calculated_planned_rr) ??
    toNumber(journal.calculation?.planned_risk_reward);

  /*
   * Expectancy normally belongs to a collection of trades.
   * Pass expectancyR from the filtered closed-trade table when available.
   */
  const displayedExpectancy =
    toNumber(expectancyR) ??
    toNumber(journal.expectancy_r) ??
    toNumber(journal.calculated_expectancy_r);

  const profitLossHelper =
    profitLossUsd === null
      ? "Calculation unavailable"
      : profitLossUsd > 0
        ? "Realized profit"
        : profitLossUsd < 0
          ? "Realized loss"
          : "Breakeven";

  const rMultipleHelper =
    realizedR === null
      ? "Calculation unavailable"
      : realizedR > 0
        ? "Positive R result"
        : realizedR < 0
          ? "Negative R result"
          : "Breakeven result";

  function prevImage() {
    if (!activeImages.length) {
      return;
    }

    setActiveIndex((current) =>
      current === 0 ? activeImages.length - 1 : current - 1,
    );
  }

  function nextImage() {
    if (!activeImages.length) {
      return;
    }

    setActiveIndex((current) =>
      current === activeImages.length - 1 ? 0 : current + 1,
    );
  }

  function closeCarousel() {
    setCarousel({
      images: [],
      index: 0,
    });
  }

  function carouselPrev() {
    setCarousel((current) => ({
      ...current,
      index:
        current.index === 0 ? current.images.length - 1 : current.index - 1,
    }));
  }

  function carouselNext() {
    setCarousel((current) => ({
      ...current,
      index:
        current.index === current.images.length - 1 ? 0 : current.index + 1,
    }));
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 p-4 backdrop-blur-sm">
        <div className="mx-auto flex max-h-[92vh] max-w-7xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white p-5">
            <div>
              <div className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-600">
                OPPORTUNITY DETAILS
              </div>

              <h2 className="mt-3 text-2xl font-bold text-slate-950">
                {strategy.strategy_name || "Opportunity"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {strategy.trading_style || "—"} • {strategy.setup_type || "—"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white p-2.5 hover:bg-slate-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid overflow-y-auto lg:grid-cols-[1.4fr_430px]">
            <div className="border-r border-slate-200 bg-slate-50 p-5">
              <div>
                {activeImages.length ? (
                  <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-black">
                    <img
                      src={activeImages[activeIndex]}
                      alt="Chart"
                      className="h-[640px] w-full object-contain"
                    />

                    {activeImages.length > 1 ? (
                      <>
                        <button
                          type="button"
                          onClick={prevImage}
                          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white backdrop-blur transition hover:bg-black/70"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>

                        <button
                          type="button"
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white backdrop-blur transition hover:bg-black/70"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </>
                    ) : null}

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs font-bold text-white">
                      {activeIndex + 1} / {activeImages.length}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[640px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white">
                    <div className="text-center">
                      <ImageIcon className="mx-auto h-10 w-10 text-slate-400" />

                      <p className="mt-3 text-sm text-slate-500">
                        No setup images uploaded
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {allImages.length ? (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                  {allImages.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => {
                        setActiveIndex(index);

                        setCarousel({
                          images: allImages,
                          index,
                        });
                      }}
                      className={`overflow-hidden rounded-2xl border transition ${
                        activeIndex === index
                          ? "border-sky-500 ring-2 ring-sky-500/20"
                          : "border-slate-200"
                      }`}
                    >
                      <img
                        src={image}
                        alt=""
                        className="h-20 w-28 object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}

              {journal.closedEvidenceImageUrl ? (
                <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 text-sm font-bold text-slate-950">
                    Closed Evidence
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setCarousel({
                        images: [journal.closedEvidenceImageUrl],
                        index: 0,
                      })
                    }
                    className="block w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                  >
                    <img
                      src={journal.closedEvidenceImageUrl}
                      alt="Closed evidence"
                      className="max-h-[420px] w-full object-contain"
                    />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="space-y-4 overflow-y-auto bg-white p-5">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase text-slate-500">
                      Symbol
                    </div>

                    <div className="mt-2 truncate text-2xl font-bold text-slate-950">
                      {journal.symbols?.symbol_name || "—"}
                    </div>

                    <div
                      className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                        directionLabel === "SHORT"
                          ? "bg-red-50 text-red-600"
                          : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      {directionLabel === "SHORT" ? (
                        <TrendingDown className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingUp className="h-3.5 w-3.5" />
                      )}

                      {directionLabel}
                    </div>
                  </div>

                  <Pill className={getStatusTone(journal.status)}>
                    {journal.status || "No Status"}
                  </Pill>
                </div>
              </div>

              {isClosedTrade ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4">
                    <div className="text-sm font-bold text-slate-950">
                      Trade Performance
                    </div>

                    <div className="mt-1 text-xs font-medium text-slate-500">
                      Realized result and original trade plan
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <PerformanceCard
                      label="Profit & Loss"
                      value={formatUsd(profitLossUsd)}
                      numericValue={profitLossUsd}
                      helper={profitLossHelper}
                    />

                    <PerformanceCard
                      label="R Multiple"
                      value={formatR(realizedR)}
                      numericValue={realizedR}
                      helper={rMultipleHelper}
                    />

                    <PerformanceCard
                      label="Risk to Reward"
                      value={formatRiskReward(plannedRiskReward)}
                      numericValue={plannedRiskReward}
                      helper="Original planned RR"
                      neutral
                    />

                    <PerformanceCard
                      label="Expectancy"
                      value={formatR(displayedExpectancy)}
                      numericValue={displayedExpectancy}
                      helper={
                        displayedExpectancy !== null
                          ? "Filtered trades average R"
                          : "Expectancy not provided"
                      }
                    />
                  </div>
                </div>
              ) : null}

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 text-sm font-bold text-slate-950">
                  Trade Levels
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
                    <div className="text-xs font-bold uppercase text-blue-600">
                      Entry Price
                    </div>

                    <div className="mt-2 text-2xl font-bold text-slate-950">
                      {journal.entry_price ?? "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">
                    <div className="text-xs font-bold uppercase text-orange-600">
                      Stop Loss
                    </div>

                    <div className="mt-2 text-2xl font-bold text-slate-950">
                      {journal.stop_loss ?? "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="text-xs font-bold uppercase text-emerald-600">
                    Take Profit
                  </div>

                  <div className="mt-3 space-y-2">
                    {Array.isArray(journal.take_profit) &&
                    journal.take_profit.length ? (
                      journal.take_profit.map((takeProfit, index) => (
                        <div
                          key={`${takeProfit}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2 text-sm"
                        >
                          <span className="shrink-0 font-semibold text-slate-600">
                            TP {index + 1}
                          </span>

                          <span className="min-w-0 text-right font-bold text-slate-950">
                            {takeProfit}{" "}
                            <span className="text-xs font-medium text-slate-500">
                              (
                              {journal.take_profit_qty?.[index] !== null &&
                              journal.take_profit_qty?.[index] !== undefined
                                ? journal.take_profit_qty[index]
                                : "—"}{" "}
                              lots)
                            </span>
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-500">—</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoBlock label="Quantity" value={journal.quantity} />

                <InfoBlock
                  label="Risk"
                  value={
                    journal.risk_per_trade !== null &&
                    journal.risk_per_trade !== undefined &&
                    journal.risk_per_trade !== ""
                      ? `${journal.risk_per_trade} ${
                          journal.risk_mode || ""
                        }`.trim()
                      : "—"
                  }
                />

                <InfoBlock label="Symbol" value={symbol} />

                <InfoBlock
                  label="Account"
                  value={journal.trading_accounts?.account_name || "—"}
                />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 text-sm font-bold text-slate-950">
                  Reasoning
                </div>

                <div className="space-y-4">
                  <ReasonBox
                    label="Entry Reason"
                    value={journal.entry_reason}
                  />

                  <ReasonBox label="Exit Reason" value={journal.exit_reason} />
                </div>
              </div>

              {journal.owner_note || journal.admin_note ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 text-sm font-bold text-slate-950">
                    Notes
                  </div>

                  <div className="space-y-3">
                    <NoteBlock title="Trader Note" value={journal.owner_note} />

                    <NoteBlock title="Admin Note" value={journal.admin_note} />
                  </div>
                </div>
              ) : null}

              {afterContent}

              {journal.is_shared ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <CommentsSection
                    journalId={journal.id}
                    onParentCountChange={setCommentCount}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {carousel.images.length ? (
        <ImageCarousel
          images={carousel.images}
          index={carousel.index}
          onClose={closeCarousel}
          onPrev={carouselPrev}
          onNext={carouselNext}
        />
      ) : null}
    </>
  );
}
