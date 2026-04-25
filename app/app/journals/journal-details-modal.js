"use client";
import { useState } from "react";
import { X } from "lucide-react";

function Field({ label, value }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium whitespace-pre-wrap">
        {value ?? "—"}
      </div>
    </div>
  );
}
function ImageCarousel({ images, index, onClose, onPrev, onNext }) {
  if (!images?.length) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-md bg-white px-3 py-2 text-sm text-black"
      >
        Close
      </button>

      <button
        type="button"
        onClick={onPrev}
        className="absolute left-4 rounded-md bg-white px-3 py-2 text-black"
      >
        Prev
      </button>

      <img
        src={images[index]}
        alt={`Image ${index + 1}`}
        className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
      />

      <button
        type="button"
        onClick={onNext}
        className="absolute right-4 rounded-md bg-white px-3 py-2 text-black"
      >
        Next
      </button>

      <div className="absolute bottom-4 rounded-full bg-white px-3 py-1 text-xs text-black">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}
function ImageGrid({ title, images = [], onOpen }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>

      {images.length === 0 ? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          No images uploaded.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {images.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => onOpen(images, index)}
              className="overflow-hidden rounded-lg border bg-muted"
            >
              <img
                src={url}
                alt={`${title} ${index + 1}`}
                className="h-40 w-full object-cover transition hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTP(tp = [], qty = []) {
  if (!Array.isArray(tp) || tp.length === 0) return "—";

  if (Array.isArray(qty) && qty.length === tp.length) {
    return tp.map((p, i) => `${p} (${qty[i] ?? "—"})`).join(", ");
  }

  return tp.join(", ");
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
      <div className="fixed inset-0 z-50 bg-black/50 p-4">
        <div className="mx-auto flex max-h-[92vh] max-w-5xl flex-col overflow-hidden rounded-2xl bg-background shadow-xl">
          <div className="flex items-start justify-between border-b p-5">
            <div>
              <h2 className="text-xl font-semibold">
                {strategy.strategy_name || "Journal Details"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {journal.created_at
                  ? new Date(journal.created_at).toLocaleString()
                  : "—"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-md border p-2 hover:bg-accent"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-6 overflow-y-auto p-5">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Purpose" value={journal.purpose} />
              <Field label="Status" value={journal.status || "No status"} />
              <Field label="Symbol" value={symbol} />
              <Field label="Direction" value={journal.direction} />
              <Field label="Trading Account" value={account} />
              <Field
                label="Risk"
                value={`${journal.risk_per_trade} ${journal.risk_mode}`}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Quantity" value={journal.quantity} />
              <Field label="Entry Price" value={journal.entry_price} />
              <Field label="Stop Loss" value={journal.stop_loss} />
              <Field
                label="Take Profit"
                value={formatTP(journal.take_profit, journal.take_profit_qty)}
              />
              <Field label="Exit Price" value={journal.exit_price} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Entry Reason" value={journal.entry_reason} />
              <Field label="Exit Reason" value={journal.exit_reason} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Trading Style" value={strategy.trading_style} />
              <Field label="Setup Type" value={strategy.setup_type} />
              <Field label="Strategy Status" value={strategy.strategy_status} />
              <Field
                label="Preparation Status"
                value={strategy.preparation_status}
              />
            </div>

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

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Checklist" value={strategy.checklist} />
              <Field label="Entry Rules" value={strategy.entry_rules} />
              <Field label="Exit Rules" value={strategy.exit_rules} />
              <Field
                label="SL Management Rules"
                value={strategy.sl_management_rules}
              />
            </div>
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
