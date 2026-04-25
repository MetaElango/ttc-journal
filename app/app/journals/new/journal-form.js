// app/app/strategies/new-journal/journal-form.js  (or wherever your form lives)
"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/* -----------------------------
  Helpers (critical for your bug)
------------------------------ */
function normPurpose(v) {
  return String(v || "")
    .trim()
    .toUpperCase();
}

function getStatusOptions(purpose) {
  const key = normPurpose(purpose);
  return (
    STATUS_OPTIONS_BY_PURPOSE[key] ||
    STATUS_OPTIONS_BY_PURPOSE["FOR OBSERVATION"]
  );
}

/* -----------------------------
   PURPOSE CONFIG (single source)
------------------------------ */
const PURPOSE_CONFIG = {
  "FOR OBSERVATION": {
    showStatusDropdown: true,
    forcedStatus: null,
    disable: {
      tradingAccount: true,
      risk: true,
    },
    required: {
      tradingAccount: false, // ✅ observation: don't capture it
      symbol: true,
      quantity: true,
      direction: true,
      entry_price: true,
      stop_loss: true,
      take_profit: true,
      entry_reason: true,
      exit_reason: true,
      exit_price: false,
      risk_mode: false,
      risk_per_trade: false,
      status: false,
    },
    exitRule: "reason_required_price_optional",
  },

  "ENTRY PLANNED": {
    showStatusDropdown: true,
    forcedStatus: null,
    disable: { tradingAccount: false, risk: false },
    required: {
      tradingAccount: true,
      symbol: true,
      quantity: true,
      direction: true,
      entry_price: true,
      stop_loss: true,
      take_profit: true,
      entry_reason: true,
      exit_reason: false,
      exit_price: false,
      risk_mode: true,
      risk_per_trade: true,
      status: true,
    },
    exitRule: "pair_or_empty",
  },

  "FORWARD TESTING": {
    showStatusDropdown: true,
    forcedStatus: null,
    disable: { tradingAccount: false, risk: false },
    required: {
      tradingAccount: true,
      symbol: true,
      quantity: true,
      direction: true,
      entry_price: true,
      stop_loss: true,
      take_profit: true,
      entry_reason: true,
      exit_reason: false,
      exit_price: false,
      risk_mode: true,
      risk_per_trade: true,
      status: true,
    },
    exitRule: "pair_or_empty",
  },
};

const PURPOSES = ["FOR OBSERVATION", "ENTRY PLANNED", "FORWARD TESTING"];

const STATUS_OPTIONS_BY_PURPOSE = {
  "FOR OBSERVATION": ["ENTRY MISSED", "ENTRY CLOSED"],
  "ENTRY PLANNED": [
    "ENTRY PLACED",
    "ENTRY TRIGGERED",
    "ENTRY CANCELLED",
    "ENTRY MISSED",
    "RUNNING TRADE",
    "TRADE SL HIT",
    "TRADE CLOSE WITH PROFIT",
    "TRADE EXIT IN MID",
  ],
  "FORWARD TESTING": [
    "ENTRY PLACED",
    "ENTRY TRIGGERED",
    "ENTRY CANCELLED",
    "ENTRY MISSED",
    "RUNNING TRADE",
    "TRADE SL HIT",
    "TRADE CLOSE WITH PROFIT",
    "TRADE EXIT IN MID",
  ],
};

/* -----------------------------
   Small UI blocks
------------------------------ */
function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
      {children}
    </span>
  );
}

function StrategyBlueprint({ s }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Strategy Blueprint</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-lg font-semibold">{s.strategy_name}</div>

        <div className="flex flex-wrap gap-2">
          <Pill>Prep: {s.preparation_status}</Pill>
          <Pill>Status: {s.strategy_status || "—"}</Pill>
          <Pill>Style: {s.trading_style}</Pill>
          <Pill>Setup: {s.setup_type}</Pill>
        </div>

        <div className="flex flex-wrap gap-2">
          {(s.bias_confluence || []).map((b) => (
            <Badge key={b} variant="secondary">
              {b}
            </Badge>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border p-3 text-sm whitespace-pre-wrap">
            <div className="mb-2 text-xs font-medium opacity-70">Checklist</div>
            {s.checklist}
          </div>

          <div className="rounded-md border p-3 text-sm whitespace-pre-wrap">
            <div className="mb-2 text-xs font-medium opacity-70">
              Entry Rules
            </div>
            {s.entry_rules}
          </div>

          <div className="rounded-md border p-3 text-sm whitespace-pre-wrap">
            <div className="mb-2 text-xs font-medium opacity-70">
              Exit Rules
            </div>
            {s.exit_rules}
          </div>

          <div className="rounded-md border p-3 text-sm whitespace-pre-wrap">
            <div className="mb-2 text-xs font-medium opacity-70">
              SL Management Rules
            </div>
            {s.sl_management_rules}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -----------------------------
   Helpers
------------------------------ */
function round2(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return 0;
  return Math.round(v * 100) / 100;
}

// allow only digits + one dot, max 2 decimals
function sanitize2dp(raw) {
  const s = String(raw ?? "");
  let out = s.replace(/[^\d.]/g, "");
  const firstDot = out.indexOf(".");
  if (firstDot !== -1) {
    out =
      out.slice(0, firstDot + 1) + out.slice(firstDot + 1).replace(/\./g, "");
  }
  if (firstDot !== -1) {
    const [a, b] = out.split(".");
    out = a + "." + (b || "").slice(0, 2);
  }
  return out;
}

// 0.5, 0.25, 0.125 ... last gets remaining
function defaultSplitWeights(n) {
  if (n <= 0) return [];
  if (n === 1) return [1];

  const w = [];
  let remaining = 1;

  for (let i = 0; i < n; i++) {
    if (i === n - 1) {
      w.push(remaining);
      break;
    }
    const next = i === 0 ? 0.5 : w[i - 1] / 2;
    w.push(next);
    remaining -= next;
  }

  const sum = w.reduce((a, b) => a + b, 0);
  if (Math.abs(1 - sum) > 1e-10) w[w.length - 1] += 1 - sum;
  return w;
}

/* -----------------------------
   TP Editor
------------------------------ */
function TakeProfitEditor({ items, setItems, totalLots, disabled }) {
  const total = round2(totalLots);
  const totalOk = total > 0 ? total : 0;

  const sumTpLots = useMemo(
    () => items.reduce((acc, it) => acc + (Number(it.qty) || 0), 0),
    [items],
  );

  const sumOk = totalOk > 0 ? Math.abs(sumTpLots - totalOk) <= 0.01 : false;

  function autoSplitAll() {
    if (disabled) return;
    if (!totalOk || items.length === 0) return;

    const weights = defaultSplitWeights(items.length);
    const next = items.map((it, idx) => ({
      ...it,
      qty: round2(weights[idx] * totalOk),
    }));

    const s = next.reduce((a, b) => a + (Number(b.qty) || 0), 0);
    const diff = round2(totalOk - s);
    if (next.length > 0 && diff !== 0) {
      next[next.length - 1] = {
        ...next[next.length - 1],
        qty: round2((Number(next[next.length - 1].qty) || 0) + diff),
      };
    }

    setItems(next);
  }

  function addRow() {
    if (disabled) return;
    const next = [...items, { price: "", qty: "" }];
    setItems(next);

    if (totalOk) {
      const weights = defaultSplitWeights(next.length);
      const applied = next.map((it, idx) => ({
        ...it,
        qty: round2(weights[idx] * totalOk),
      }));

      const s = applied.reduce((a, b) => a + (Number(b.qty) || 0), 0);
      const diff = round2(totalOk - s);
      if (applied.length > 0 && diff !== 0) {
        applied[applied.length - 1] = {
          ...applied[applied.length - 1],
          qty: round2((Number(applied[applied.length - 1].qty) || 0) + diff),
        };
      }

      setItems(applied);
    }
  }

  function removeRow(i) {
    if (disabled) return;
    const next = items.filter((_, idx) => idx !== i);
    if (next.length === 0) {
      setItems([]);
      return;
    }
    setItems(next);

    if (totalOk) {
      const weights = defaultSplitWeights(next.length);
      const applied = next.map((it, idx) => ({
        ...it,
        qty: round2(weights[idx] * totalOk),
      }));
      const s = applied.reduce((a, b) => a + (Number(b.qty) || 0), 0);
      const diff = round2(totalOk - s);
      if (applied.length > 0 && diff !== 0) {
        applied[applied.length - 1] = {
          ...applied[applied.length - 1],
          qty: round2((Number(applied[applied.length - 1].qty) || 0) + diff),
        };
      }
      setItems(applied);
    }
  }

  function updatePrice(i, raw) {
    if (disabled) return;
    const v = sanitize2dp(raw);
    const next = [...items];
    next[i] = { ...next[i], price: v };
    setItems(next);
  }

  // edit middle => split remainder across below
  // edit last => manual
  function updateQty(i, raw) {
    if (disabled) return;

    const vStr = sanitize2dp(raw);
    const v = vStr === "" ? "" : round2(vStr);

    const next = [...items];
    next[i] = { ...next[i], qty: vStr === "" ? "" : v };

    if (!totalOk) {
      setItems(next);
      return;
    }

    const lastIndex = next.length - 1;

    if (i === lastIndex) {
      setItems(next);
      return;
    }

    let fixedSum = 0;
    for (let k = 0; k <= i; k++) fixedSum += Number(next[k].qty) || 0;
    fixedSum = round2(fixedSum);

    let remaining = round2(totalOk - fixedSum);
    if (remaining < 0) remaining = 0;

    const tailCount = lastIndex - i;
    const weights = defaultSplitWeights(tailCount);

    for (let t = 0; t < tailCount; t++) {
      const idx = i + 1 + t;
      next[idx] = { ...next[idx], qty: round2(weights[t] * remaining) };
    }

    let sumNow = 0;
    for (let k = 0; k < next.length; k++) sumNow += Number(next[k].qty) || 0;
    sumNow = round2(sumNow);

    const diff = round2(totalOk - sumNow);
    if (diff !== 0 && next.length > 0) {
      next[lastIndex] = {
        ...next[lastIndex],
        qty: round2((Number(next[lastIndex].qty) || 0) + diff),
      };
    }

    setItems(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>
          Take Profit (multiple) <span className="text-destructive">*</span>
        </Label>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={autoSplitAll}
            disabled={disabled}
          >
            Auto Split
          </Button>
          <Button type="button" onClick={addRow} disabled={disabled}>
            Add TP
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Add one or more targets.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((it, idx) => {
            const tpLots = Number(it.qty) || 0;
            const pct = totalOk ? (tpLots / totalOk) * 100 : 0;

            return (
              <div
                key={idx}
                className="grid grid-cols-12 items-center gap-2 rounded-md border p-3"
              >
                <div className="col-span-12 md:col-span-1 text-sm font-medium">
                  TP {idx + 1}
                </div>

                <div className="col-span-12 md:col-span-5 space-y-1">
                  <div className="text-xs text-muted-foreground">Price</div>
                  <Input
                    value={it.price}
                    onChange={(e) => updatePrice(idx, e.target.value)}
                    inputMode="decimal"
                    placeholder="e.g. 250.50"
                    disabled={disabled}
                    required
                  />
                </div>

                <div className="col-span-12 md:col-span-4 space-y-1">
                  <div className="text-xs text-muted-foreground">
                    Qty (LOTS) — sum must equal total lots
                  </div>
                  <Input
                    value={it.qty}
                    onChange={(e) => updateQty(idx, e.target.value)}
                    inputMode="decimal"
                    placeholder={
                      totalOk ? "e.g. 0.50" : "Enter total lots first"
                    }
                    disabled={disabled}
                    required
                  />
                  <div className="text-xs text-muted-foreground">
                    {totalOk ? `${round2(pct)}%` : "—"}
                  </div>
                </div>

                <div className="col-span-12 md:col-span-2 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeRow(idx)}
                    disabled={disabled}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        <div className={sumOk ? "text-muted-foreground" : "text-destructive"}>
          TP Qty sum: {round2(sumTpLots)} / Total lots:{" "}
          {totalOk ? round2(totalOk) : "—"} {sumOk ? "" : "(must match)"}
        </div>

        <div className="text-muted-foreground">
          Tip: edit any TP qty (except last) to auto-split the remainder below.
        </div>
      </div>

      {!sumOk && items.length > 0 && totalOk ? (
        <p className="text-sm text-destructive">
          TP quantities must sum to total lots. Fix the last TP (or click Auto
          Split).
        </p>
      ) : null}
    </div>
  );
}

/* -----------------------------
   PurposeRenderer
------------------------------ */
function PurposeRenderer({ purpose, status, setStatus, children }) {
  const purposeKey = normPurpose(purpose);
  const cfg = PURPOSE_CONFIG[purposeKey] || PURPOSE_CONFIG["FOR OBSERVATION"];
  const showStatus = cfg.showStatusDropdown === true;
  const statusOptions = getStatusOptions(purposeKey);
  const statusRequired = !!cfg.required?.status;

  return (
    <div className="space-y-4">
      {children({ cfg, showStatus, purposeKey })}

      {showStatus ? (
        <div className="space-y-2">
          <Label>
            Status{" "}
            {statusRequired ? (
              <span className="text-destructive">*</span>
            ) : (
              <span className="text-muted-foreground">(optional)</span>
            )}
          </Label>
          <select
            name="status"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            required={statusRequired}
          >
            <option value="">
              {statusRequired ? "Select status" : "No status"}
            </option>
            {statusOptions.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="status" value={status} />
      )}
    </div>
  );
}

/* -----------------------------
   JournalDetailsCommon
------------------------------ */
function JournalDetailsCommon({
  cfg,
  purpose,
  setPurpose,

  status,
  setStatus,

  accounts,
  symbols,

  tpItems,
  setTpItems,

  direction,
  setDirection,

  quantity,
  setQuantity,

  riskMode,
  setRiskMode,

  strategy,

  entryPrice,
  setEntryPrice,
  stopLoss,
  setStopLoss,

  setupImages,
  setSetupImages,
  referenceImages,
  setReferenceImages,
}) {
  const disableTradingAccount = !!cfg.disable?.tradingAccount;
  const disableRisk = !!cfg.disable?.risk;

  const required = cfg.required || {};

  const [symbolQuery, setSymbolQuery] = useState("");
  const filteredSymbols = useMemo(() => {
    const q = symbolQuery.trim().toLowerCase();
    if (!q) return symbols;
    return symbols.filter(
      (s) =>
        s.symbol_name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  }, [symbols, symbolQuery]);

  const totalLotsNum = Number(quantity);
  const totalLotsOk =
    !Number.isNaN(totalLotsNum) && totalLotsNum > 0 ? round2(totalLotsNum) : 0;

  const sumTpLots = useMemo(
    () => tpItems.reduce((acc, it) => acc + (Number(it.qty) || 0), 0),
    [tpItems],
  );

  const sumOk =
    totalLotsOk > 0 ? Math.abs(round2(sumTpLots) - totalLotsOk) <= 0.01 : false;

  // BUY/SELL SL validation (client-side)
  const entryNum = Number(entryPrice);
  const slNum = Number(stopLoss);
  const hasEntry = entryPrice !== "" && !Number.isNaN(entryNum);
  const hasSl = stopLoss !== "" && !Number.isNaN(slNum);

  let slDirectionError = "";
  if (hasEntry && hasSl) {
    if (direction === "BUY" && !(slNum < entryNum)) {
      slDirectionError = "For BUY, stop loss must be less than entry price.";
    }
    if (direction === "SELL" && !(slNum > entryNum)) {
      slDirectionError =
        "For SELL, stop loss must be greater than entry price.";
    }
  }

  const exitReasonRequired = !!required.exit_reason;
  const exitPriceRequired = !!required.exit_price;

  function onQuantityChange(raw) {
    setQuantity(sanitize2dp(raw));
  }

  function onPurposeChange(next) {
    const nextKey = normPurpose(next);
    setPurpose(nextKey);

    const nextOptions = getStatusOptions(nextKey);

    if (!nextOptions.includes(status)) {
      setStatus("");
    }
  }

  return (
    <>
      <input
        type="hidden"
        name="take_profit_json"
        value={JSON.stringify(tpItems)}
      />

      {/* Top controls */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>
            Trading Account{" "}
            {required.tradingAccount ? (
              <span className="text-destructive">*</span>
            ) : null}
          </Label>

          <select
            name="trading_account_id"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            required={!!required.tradingAccount}
            defaultValue=""
            disabled={disableTradingAccount}
          >
            <option value="" disabled>
              Select account
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_name} — {a.framework} — {a.account_size}
              </option>
            ))}
          </select>

          {disableTradingAccount ? (
            <p className="text-xs text-muted-foreground">
              Disabled for {purpose}.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>
            Purpose <span className="text-destructive">*</span>
          </Label>
          <select
            name="purpose"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={normPurpose(purpose)}
            onChange={(e) => onPurposeChange(e.target.value)}
            required
          >
            {PURPOSES.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status is rendered by PurposeRenderer */}

      {/* Symbol */}
      <div className="space-y-2">
        <Label>
          Symbol{" "}
          {required.symbol ? <span className="text-destructive">*</span> : null}
        </Label>
        <Input
          value={symbolQuery}
          onChange={(e) => setSymbolQuery(e.target.value)}
          placeholder="Search symbol (e.g. GOLD, EURUSD, Indices)"
        />
        <select
          name="symbol_id"
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          required={!!required.symbol}
          defaultValue=""
        >
          <option value="" disabled>
            Select symbol
          </option>
          {filteredSymbols.map((s) => (
            <option key={s.id} value={s.id}>
              {s.symbol_name} — {s.category}
            </option>
          ))}
        </select>
      </div>

      {/* Direction / Qty / Entry / SL */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label>
            Direction{" "}
            {required.direction ? (
              <span className="text-destructive">*</span>
            ) : null}
          </Label>
          <select
            name="direction"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            required={!!required.direction}
          >
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>
            Quantity (Lots){" "}
            {required.quantity ? (
              <span className="text-destructive">*</span>
            ) : null}
          </Label>
          <Input
            name="quantity"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => onQuantityChange(e.target.value)}
            required={!!required.quantity}
            placeholder="1"
          />
          <p className="text-xs text-muted-foreground">Max 2 decimals.</p>
        </div>

        <div className="space-y-2">
          <Label>
            Entry Price{" "}
            {required.entry_price ? (
              <span className="text-destructive">*</span>
            ) : null}
          </Label>
          <Input
            name="entry_price"
            inputMode="decimal"
            value={entryPrice}
            required={!!required.entry_price}
            onChange={(e) => setEntryPrice(sanitize2dp(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label>
            Stop Loss{" "}
            {required.stop_loss ? (
              <span className="text-destructive">*</span>
            ) : null}
          </Label>
          <Input
            name="stop_loss"
            inputMode="decimal"
            value={stopLoss}
            required={!!required.stop_loss}
            onChange={(e) => setStopLoss(sanitize2dp(e.target.value))}
          />
          {slDirectionError ? (
            <p className="text-xs text-destructive">{slDirectionError}</p>
          ) : null}
        </div>
      </div>

      {/* TP */}
      <TakeProfitEditor
        items={tpItems}
        setItems={setTpItems}
        totalLots={quantity}
        disabled={false}
      />

      {/* Reasons */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>
            Entry Reason{" "}
            {required.entry_reason ? (
              <span className="text-destructive">*</span>
            ) : null}
          </Label>
          <Textarea
            name="entry_reason"
            rows={3}
            required={!!required.entry_reason}
          />
        </div>

        <div className="space-y-2">
          <Label>
            Exit Reason{" "}
            {exitReasonRequired ? (
              <span className="text-destructive">*</span>
            ) : null}
          </Label>
          <Textarea name="exit_reason" rows={3} required={exitReasonRequired} />
          {cfg.exitRule === "reason_required_price_optional" ? (
            <p className="text-xs text-muted-foreground">
              For {purpose}: exit reason is mandatory; exit price is optional.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>
            Exit Price{" "}
            {exitPriceRequired ? (
              <span className="text-destructive">*</span>
            ) : (
              <span className="text-muted-foreground">(optional)</span>
            )}
          </Label>
          <Input
            name="exit_price"
            inputMode="decimal"
            required={exitPriceRequired}
            onChange={(e) => {
              e.target.value = sanitize2dp(e.target.value);
            }}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Setup Images</Label>
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);

              if (files.length > 3) {
                alert("Setup images can be maximum 3.");
                e.target.value = "";
                setSetupImages([]);
                return;
              }

              setSetupImages(files);
            }}
          />
          <p className="text-xs text-muted-foreground">Max 3 images.</p>
        </div>

        <div className="space-y-2">
          <Label>Reference Images</Label>
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);

              if (files.length > 3) {
                alert("Reference images can be maximum 3.");
                e.target.value = "";
                setReferenceImages([]);
                return;
              }

              setReferenceImages(files);
            }}
          />
          <p className="text-xs text-muted-foreground">Max 3 images.</p>
        </div>
      </div>

      {/* Risk */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>
            Risk Mode{" "}
            {required.risk_mode ? (
              <span className="text-destructive">*</span>
            ) : null}
          </Label>
          <select
            name="risk_mode"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={riskMode}
            onChange={(e) => setRiskMode(e.target.value)}
            required={!!required.risk_mode && !disableRisk}
            disabled={disableRisk}
          >
            <option value="PERCENT">Percentage</option>
            <option value="AMOUNT">$ Amount</option>
          </select>

          {disableRisk ? (
            <>
              <input type="hidden" name="risk_mode" value={riskMode} />
              <p className="text-xs text-muted-foreground">
                Disabled for {purpose}.
              </p>
            </>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>
            Risk Per Trade{" "}
            {required.risk_per_trade ? (
              <span className="text-destructive">*</span>
            ) : null}
          </Label>
          <Input
            name="risk_per_trade"
            inputMode="decimal"
            required={!!required.risk_per_trade && !disableRisk}
            placeholder={riskMode === "PERCENT" ? "e.g. 1.5" : "e.g. 25"}
            disabled={disableRisk}
            onChange={(e) => {
              e.target.value = sanitize2dp(e.target.value);
            }}
          />
          {disableRisk ? (
            <input type="hidden" name="risk_per_trade" value="0" />
          ) : null}
        </div>

        <div className="rounded-md border p-3 text-xs text-muted-foreground">
          <div className="mb-1 font-medium text-foreground">Strategy risk</div>
          <div>Risk/Trade: {strategy.risk_per_trade}</div>
          <div>AVG R:R: {strategy.avg_planned_rr}</div>
          <div>Planned R/Year: {strategy.planned_r_year}</div>
        </div>
      </div>

      {/* Client hints */}
      {!sumOk && tpItems.length > 0 && totalLotsOk ? (
        <p className="text-xs text-destructive">
          Fix TP quantities to match total lots.
        </p>
      ) : null}
    </>
  );
}

/* -----------------------------
   Main
------------------------------ */
export default function NewJournalForm({
  action,
  strategy,
  accounts,
  symbols,
}) {
  const router = useRouter();

  const [setupImages, setSetupImages] = useState([]);
  const [referenceImages, setReferenceImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [state, formAction, pending] = useActionState(action, {
    ok: true,
    message: "",
  });

  const [purpose, setPurpose] = useState("FOR OBSERVATION");
  const purposeKey = normPurpose(purpose);
  const cfg = PURPOSE_CONFIG[purposeKey] || PURPOSE_CONFIG["FOR OBSERVATION"];

  // ✅ start empty (user chooses status for observation)
  const [status, setStatus] = useState("");

  const [riskMode, setRiskMode] = useState("PERCENT");
  const [direction, setDirection] = useState("BUY");
  const [quantity, setQuantity] = useState("1");
  const [tpItems, setTpItems] = useState([]);

  // controlled entry/sl for client validation
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");

  // submit disable: TP sum must match
  const totalLotsNum = Number(quantity);
  const totalLotsOk =
    !Number.isNaN(totalLotsNum) && totalLotsNum > 0 ? round2(totalLotsNum) : 0;

  const sumTpLots = useMemo(
    () => tpItems.reduce((acc, it) => acc + (Number(it.qty) || 0), 0),
    [tpItems],
  );

  const sumOk =
    totalLotsOk > 0 ? Math.abs(round2(sumTpLots) - totalLotsOk) <= 0.01 : false;

  // SL direction validation for disabling submit
  const entryNum = Number(entryPrice);
  const slNum = Number(stopLoss);
  const hasEntry = entryPrice !== "" && !Number.isNaN(entryNum);
  const hasSl = stopLoss !== "" && !Number.isNaN(slNum);

  let slOk = true;
  if (hasEntry && hasSl) {
    if (direction === "BUY") slOk = slNum < entryNum;
    if (direction === "SELL") slOk = slNum > entryNum;
  }
  useEffect(() => {
    async function uploadImagesAndRedirect() {
      if (!state?.ok || !state?.journalId) return;

      setUploadingImages(true);
      setUploadError("");

      try {
        const supabase = createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("User not found.");
        }

        async function uploadFiles(files, type) {
          const uploadedPaths = [];

          for (let i = 0; i < files.length; i++) {
            const file = files[i];

            const ext = file.name.split(".").pop() || "jpg";
            const filePath = `${user.id}/${state.journalId}/${type}/${Date.now()}-${i}.${ext}`;

            const { error } = await supabase.storage
              .from("journal-images")
              .upload(filePath, file, {
                contentType: file.type,
                upsert: false,
              });

            if (error) throw new Error(error.message);

            uploadedPaths.push(filePath);
          }

          return uploadedPaths;
        }

        const setupImagePaths = await uploadFiles(setupImages, "setup");
        const referenceImagePaths = await uploadFiles(
          referenceImages,
          "reference",
        );

        const { error: updateError } = await supabase
          .from("journals")
          .update({
            setup_images: setupImagePaths,
            reference_images: referenceImagePaths,
          })
          .eq("id", state.journalId);

        if (updateError) throw new Error(updateError.message);

        router.push("/app/journals");
      } catch (err) {
        setUploadError(err.message || "Image upload failed.");
      } finally {
        setUploadingImages(false);
      }
    }

    uploadImagesAndRedirect();
  }, [state?.ok, state?.journalId]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Create Journal</h1>
      </div>

      <StrategyBlueprint s={strategy} />

      <Card>
        <CardHeader>
          <CardTitle>Journal Details</CardTitle>
        </CardHeader>

        <CardContent>
          <form action={formAction} className="space-y-8">
            <PurposeRenderer
              purpose={purposeKey}
              status={status}
              setStatus={setStatus}
            >
              {({ cfg: derivedCfg }) => (
                <JournalDetailsCommon
                  cfg={derivedCfg}
                  purpose={purposeKey}
                  setPurpose={setPurpose}
                  status={status}
                  setStatus={setStatus}
                  accounts={accounts}
                  symbols={symbols}
                  tpItems={tpItems}
                  setTpItems={setTpItems}
                  direction={direction}
                  setDirection={setDirection}
                  quantity={quantity}
                  setQuantity={setQuantity}
                  riskMode={riskMode}
                  setRiskMode={setRiskMode}
                  strategy={strategy}
                  entryPrice={entryPrice}
                  setEntryPrice={setEntryPrice}
                  stopLoss={stopLoss}
                  setStopLoss={setStopLoss}
                  setupImages={setupImages}
                  setSetupImages={setSetupImages}
                  referenceImages={referenceImages}
                  setReferenceImages={setReferenceImages}
                />
              )}
            </PurposeRenderer>

            {state?.message ? (
              <p className="text-sm text-destructive">{state.message}</p>
            ) : null}
            {uploadError ? (
              <p className="text-sm text-destructive">{uploadError}</p>
            ) : null}
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={
                  pending ||
                  uploadingImages ||
                  tpItems.length === 0 ||
                  !sumOk ||
                  !slOk ||
                  (cfg.required?.status && !status)
                }
              >
                {pending
                  ? "Saving..."
                  : uploadingImages
                    ? "Uploading Images..."
                    : "Create Journal"}
              </Button>

              {cfg.required?.status && !status ? (
                <p className="text-xs text-destructive">
                  Please select a status.
                </p>
              ) : null}

              {!slOk ? (
                <p className="text-xs text-destructive">
                  Fix Stop Loss based on direction (BUY: SL &lt; Entry, SELL: SL
                  &gt; Entry).
                </p>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
