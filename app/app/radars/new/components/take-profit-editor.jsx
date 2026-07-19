"use client";

import { useMemo } from "react";
import { Lightbulb, Plus, Scale, SlidersHorizontal, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldShell } from "./form-ui";
import { norm } from "../lib/journal-config";
import {
  calculateMoneyAtPrice,
  convertToUsd,
  formatMoney,
  formatNumber,
  numeric,
  round2,
  sanitizeDecimal,
  splitTpQuantity,
} from "../lib/trade-risk";

export default function TakeProfitEditor({
  items,
  setItems,
  totalLots,
  disabled,
  direction,
  entryPrice,
  symbol,
  conversionRate,
  fxRateReady,
}) {
  const total = numeric(totalLots);
  const totalOk = total > 0 ? total : 0;
  const sumTpLots = useMemo(
    () => items.reduce((acc, item) => acc + numeric(item.qty), 0),
    [items],
  );
  const sumOk = totalOk > 0 ? Math.abs(sumTpLots - totalOk) <= 0.0000001 : false;

  function autoSplitAll() {
    if (!disabled) setItems(splitTpQuantity(items, totalOk));
  }

  function addRow() {
    if (!disabled) setItems(splitTpQuantity([...items, { price: "", qty: "" }], totalOk));
  }

  function removeRow(index) {
    if (!disabled) {
      setItems(splitTpQuantity(items.filter((_, itemIndex) => itemIndex !== index), totalOk));
    }
  }

  function updatePrice(index, rawValue) {
    if (disabled) return;
    setItems((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, price: sanitizeDecimal(rawValue, symbol?.decimal_places ?? 6) }
          : item,
      ),
    );
  }

  function updateQty(index, rawValue) {
    if (disabled) return;
    const sanitized = sanitizeDecimal(rawValue, 8);
    setItems((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index ? { ...item, qty: sanitized } : item,
      ),
    );
  }

  const totalPotentialProfitInstrumentCurrency = items.reduce(
    (acc, item) =>
      acc +
      calculateMoneyAtPrice({
        direction,
        entryPrice,
        targetPrice: item.price,
        lots: item.qty,
        symbol,
      }),
    0,
  );

  const totalPotentialProfitUsd = fxRateReady
    ? convertToUsd(totalPotentialProfitInstrumentCurrency, conversionRate)
    : 0;

  return (
    <section className="rounded-3xl border bg-card p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-primary/10 text-primary">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <Label className="text-lg font-semibold tracking-tight">
              Take Profit <span className="text-destructive">*</span>
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Add one or more targets. TP quantity must equal total lots.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={autoSplitAll} disabled={disabled || items.length === 0 || !totalOk} className="h-11 rounded-2xl">
            <SlidersHorizontal className="mr-2 h-4 w-4" /> Auto Split
          </Button>
          <Button type="button" onClick={addRow} disabled={disabled} className="h-11 rounded-2xl">
            <Plus className="mr-2 h-4 w-4" /> Add TP
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">No take-profit targets yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Click Add TP to create your first target.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {items.map((item, index) => {
            const tpLots = numeric(item.qty);
            const percentage = totalOk ? Math.min((tpLots / totalOk) * 100, 100) : 0;
            const instrumentProfit = calculateMoneyAtPrice({ direction, entryPrice, targetPrice: item.price, lots: item.qty, symbol });
            const tpProfitUsd = fxRateReady ? convertToUsd(instrumentProfit, conversionRate) : 0;
            const invalidTarget =
              numeric(item.price) > 0 &&
              ((norm(direction) === "BUY" && numeric(item.price) <= numeric(entryPrice)) ||
                (norm(direction) === "SELL" && numeric(item.price) >= numeric(entryPrice)));

            return (
              <div key={index} className="rounded-2xl border bg-background/40 p-4">
                <div className="grid gap-4 md:grid-cols-[90px_1fr_1fr_140px_70px] md:items-end">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</div>
                    <div className="text-sm font-semibold">TP {index + 1}</div>
                  </div>
                  <FieldShell label="Price" required>
                    <Input value={item.price} onChange={(event) => updatePrice(index, event.target.value)} inputMode="decimal" placeholder="Target price" disabled={disabled} required className="h-11 rounded-xl" />
                    {invalidTarget ? <p className="text-xs text-red-600">{norm(direction) === "BUY" ? "BUY target must be above entry." : "SELL target must be below entry."}</p> : null}
                  </FieldShell>
                  <FieldShell label="Qty / Lots" required>
                    <Input value={item.qty} onChange={(event) => updateQty(index, event.target.value)} inputMode="decimal" placeholder="0.50" disabled={disabled} required className="h-11 rounded-xl" />
                  </FieldShell>
                  <div className={`rounded-xl border px-3 py-2 text-center ${tpProfitUsd >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                    <div className={`text-sm font-bold ${tpProfitUsd >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {fxRateReady ? formatMoney(tpProfitUsd, "USD") : "—"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{round2(percentage)}% position</div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(index)} disabled={disabled} className="h-11 w-11 rounded-xl text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${sumOk ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
          <Scale className="h-4 w-4" />
          <span>TP Qty sum: <strong>{formatNumber(sumTpLots)}</strong> / Total lots: <strong>{totalOk ? formatNumber(totalOk) : "—"}</strong></span>
        </div>
        <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${totalPotentialProfitUsd >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          Total potential profit: {fxRateReady ? formatMoney(totalPotentialProfitUsd, "USD") : "—"}
        </div>
      </div>
      {!sumOk && items.length ? (
        <div className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Lightbulb className="h-4 w-4" /> Use Auto Split after changing quantity.
        </div>
      ) : null}
    </section>
  );
}
