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

function norm(v) {
  return String(v || "")
    .trim()
    .toUpperCase();
}

function getStatusTone(status) {
  const s = norm(status);

  if (["ENTRY PLACED", "ENTRY TRIGGERED", "RUNNING TRADE"].includes(s)) {
    return "border-blue-500/25 bg-blue-500/10 text-blue-700";
  }

  if (["TRADE CLOSE WITH PROFIT"].includes(s)) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700";
  }

  if (["TRADE SL HIT"].includes(s)) {
    return "border-red-500/25 bg-red-500/10 text-red-700";
  }

  if (["ENTRY CANCELLED", "ENTRY MISSED"].includes(s)) {
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
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 ${className}`}
    >
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
        {value || "—"}
      </div>
    </div>
  );
}

function ReasonBox({ label, value }) {
  return (
    <div>
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="min-h-[120px] resize-y overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 whitespace-pre-wrap">
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
}) {
  console.log("JournalDetailsModal render", journal);
  const [carousel, setCarousel] = useState({ images: [], index: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentCount, setCommentCount] = useState(0);

  const allImages = useMemo(() => {
    if (!journal) return [];

    return [
      ...(journal.setupImageUrls || []),
      ...(journal.referenceImageUrls || []),
    ];
  }, [journal]);

  useEffect(() => {
    setActiveIndex(0);
    setCarousel({ images: [], index: 0 });
  }, [journal?.id]);

  if (!journal) return null;

  const strategy = journal.strategy_snapshot || {};
  const activeImages = allImages;

  const symbol = journal.symbols
    ? `${journal.symbols.symbol_name} — ${journal.symbols.category}`
    : "—";

  function prevImage() {
    if (!activeImages.length) return;
    setActiveIndex((current) =>
      current === 0 ? activeImages.length - 1 : current - 1,
    );
  }

  function nextImage() {
    if (!activeImages.length) return;
    setActiveIndex((current) =>
      current === activeImages.length - 1 ? 0 : current + 1,
    );
  }

  function closeCarousel() {
    setCarousel({ images: [], index: 0 });
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

  const directionLabel = norm(journal.direction) === "SELL" ? "SHORT" : "LONG";

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
                  {allImages.map((img, idx) => (
                    <button
                      key={`${img}-${idx}`}
                      type="button"
                      onClick={() =>
                        setCarousel({
                          images: allImages,
                          index: idx,
                        })
                      }
                      className={`overflow-hidden rounded-2xl border transition ${
                        activeIndex === idx
                          ? "border-sky-500 ring-2 ring-sky-500/20"
                          : "border-slate-200"
                      }`}
                    >
                      <img
                        src={img}
                        alt=""
                        className="h-20 w-28 object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-4 overflow-y-auto bg-white p-5">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-500">
                      Symbol
                    </div>

                    <div className="mt-2 text-2xl font-bold text-slate-950">
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
                      {journal.entry_price || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">
                    <div className="text-xs font-bold uppercase text-orange-600">
                      Stop Loss
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-950">
                      {journal.stop_loss || "—"}
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
                      journal.take_profit.map((tp, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm"
                        >
                          <span className="font-semibold text-slate-600">
                            TP {i + 1}
                          </span>
                          <span className="font-bold text-slate-950">
                            {tp}{" "}
                            <span className="text-xs font-medium text-slate-500">
                              ({journal.take_profit_qty?.[i] || "—"} lots)
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
                    journal.risk_per_trade
                      ? `${journal.risk_per_trade} ${journal.risk_mode || ""}`
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

              {(journal.owner_note || journal.admin_note) && (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 text-sm font-bold text-slate-950">
                    Notes
                  </div>

                  <div className="space-y-3">
                    <NoteBlock title="Trader Note" value={journal.owner_note} />
                    <NoteBlock title="Admin Note" value={journal.admin_note} />
                  </div>
                </div>
              )}

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
