"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

// 0.5, 0.25, 0.125 ... last gets remaining (sum=1)
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

function round2(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return 0;
  return Math.round(v * 100) / 100;
}

// allow only digits + one dot, and max 2 decimals
function sanitize2dp(raw) {
  const s = String(raw ?? "");
  // keep digits and dot
  let out = s.replace(/[^\d.]/g, "");
  // keep only first dot
  const firstDot = out.indexOf(".");
  if (firstDot !== -1) {
    out =
      out.slice(0, firstDot + 1) + out.slice(firstDot + 1).replace(/\./g, "");
  }
  // limit to 2 decimals
  if (firstDot !== -1) {
    const [a, b] = out.split(".");
    out = a + "." + (b || "").slice(0, 2);
  }
  // avoid leading zeros weirdness: allow "0." pattern
  return out;
}

function TakeProfitEditor({ items, setItems, totalLots }) {
  const total = round2(totalLots);
  const totalOk = total > 0 ? total : 0;

  const sumTpLots = useMemo(
    () => items.reduce((acc, it) => acc + (Number(it.qty) || 0), 0),
    [items],
  );

  const sumOk = totalOk > 0 ? Math.abs(sumTpLots - totalOk) <= 0.01 : false;

  function autoSplitAll() {
    if (!totalOk) return;
    if (items.length === 0) return;

    const weights = defaultSplitWeights(items.length);
    const next = items.map((it, idx) => ({
      ...it,
      qty: round2(weights[idx] * totalOk),
    }));

    // fix rounding drift by pushing remainder to last
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
    const next = [...items, { price: "", qty: "" }];
    setItems(next);

    // If we have total lots, auto-split across all rows
    if (totalOk) {
      const weights = defaultSplitWeights(next.length);
      const applied = next.map((it, idx) => ({
        ...it,
        qty: round2(weights[idx] * totalOk),
      }));

      // fix rounding drift
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
    const next = items.filter((_, idx) => idx !== i);
    if (next.length === 0) {
      setItems([]);
      return;
    }
    setItems(next);

    // after removal, auto-split the remainder from scratch (good UX)
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
    const v = sanitize2dp(raw);
    const next = [...items];
    next[i] = { ...next[i], price: v };
    setItems(next);
  }

  // Core rule:
  // - If editing TP i and i is NOT last:
  //   keep TP 0..i fixed, compute remaining = totalLots - sum(fixed)
  //   split remaining across (i+1..last) using half-rule weights, scaled
  // - If editing LAST TP:
  //   just set it; if sum != total => show error (no auto)
  function updateQty(i, raw) {
    const vStr = sanitize2dp(raw);
    const v = vStr === "" ? "" : round2(vStr);

    const next = [...items];
    next[i] = { ...next[i], qty: vStr === "" ? "" : v };

    if (!totalOk) {
      setItems(next);
      return;
    }

    const lastIndex = next.length - 1;

    // if last TP edited -> do not auto rebalance
    if (i === lastIndex) {
      setItems(next);
      return;
    }

    // compute fixed sum (0..i)
    let fixedSum = 0;
    for (let k = 0; k <= i; k++) {
      fixedSum += Number(next[k].qty) || 0;
    }
    fixedSum = round2(fixedSum);

    let remaining = round2(totalOk - fixedSum);
    if (remaining < 0) remaining = 0;

    const tailCount = lastIndex - i;
    const weights = defaultSplitWeights(tailCount);

    // assign tail quantities based on remaining
    for (let t = 0; t < tailCount; t++) {
      const idx = i + 1 + t;
      next[idx] = {
        ...next[idx],
        qty: round2(weights[t] * remaining),
      };
    }

    // fix rounding drift by adjusting last TP
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
          <Button type="button" variant="secondary" onClick={autoSplitAll}>
            Auto Split
          </Button>
          <Button type="button" onClick={addRow}>
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
                    placeholder="e.g. 0.58942"
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
                      totalOk ? "e.g. 0.50" : "Enter total quantity first"
                    }
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

export default function NewJournalForm({
  action,
  strategy,
  accounts,
  symbols,
}) {
  const [state, formAction, pending] = useActionState(action, {
    ok: true,
    message: "",
  });

  const STATUS = useMemo(
    () => [
      "FOR OBSERVATION",
      "FORWARD TESTING",
      "ENTRY PLANNED",
      "ENTRY TRIGGERED",
      "ENTRY PLACED",
      "ENTRY CANCELLED",
      "ENTRY MISSED",
      "TRADE SL HIT",
      "TRADE CLOSE WITH PROFIT",
      "TRADE EXIT IN MID",
    ],
    [],
  );

  const [riskMode, setRiskMode] = useState("PERCENT");
  const [quantity, setQuantity] = useState("1");

  // TP rows: qty is LOTS
  const [tpItems, setTpItems] = useState([]);

  const totalLotsNum = Number(quantity);
  const totalLotsOk =
    !Number.isNaN(totalLotsNum) && totalLotsNum > 0 ? round2(totalLotsNum) : 0;

  const sumTpLots = useMemo(
    () => tpItems.reduce((acc, it) => acc + (Number(it.qty) || 0), 0),
    [tpItems],
  );

  const sumOk =
    totalLotsOk > 0 ? Math.abs(round2(sumTpLots) - totalLotsOk) <= 0.01 : false;

  // Symbols filtering
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

  function onQuantityChange(raw) {
    const v = sanitize2dp(raw);
    setQuantity(v);
    // Do NOT auto-scale existing TP qty here (your rule didn’t ask).
    // User can click Auto Split if they change total lots.
  }

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
            <input
              type="hidden"
              name="take_profit_json"
              value={JSON.stringify(tpItems)}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Trading Account <span className="text-destructive">*</span>
                </Label>
                <select
                  name="trading_account_id"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  required
                  defaultValue=""
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
              </div>

              <div className="space-y-2">
                <Label>
                  Status <span className="text-destructive">*</span>
                </Label>
                <select
                  name="status"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  defaultValue="FOR OBSERVATION"
                  required
                >
                  {STATUS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Symbol <span className="text-destructive">*</span>
              </Label>
              <Input
                value={symbolQuery}
                onChange={(e) => setSymbolQuery(e.target.value)}
                placeholder="Search symbol (e.g. GOLD, EURUSD, Indices)"
              />
              <select
                name="symbol_id"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                required
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
              <p className="text-xs text-muted-foreground">
                Tip: type to filter, then choose from dropdown.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>
                  Quantity (Lots) <span className="text-destructive">*</span>
                </Label>
                <Input
                  name="quantity"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => onQuantityChange(e.target.value)}
                  required
                  placeholder="1"
                />
                <p className="text-xs text-muted-foreground">Max 2 decimals.</p>
              </div>

              <div className="space-y-2">
                <Label>
                  Entry Price <span className="text-destructive">*</span>
                </Label>
                <Input
                  name="entry_price"
                  inputMode="decimal"
                  required
                  onChange={(e) => {
                    e.target.value = sanitize2dp(e.target.value);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Stop Loss <span className="text-destructive">*</span>
                </Label>
                <Input
                  name="stop_loss"
                  inputMode="decimal"
                  required
                  onChange={(e) => {
                    e.target.value = sanitize2dp(e.target.value);
                  }}
                />
              </div>
            </div>

            <TakeProfitEditor
              items={tpItems}
              setItems={setTpItems}
              totalLots={quantity}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Entry Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea name="entry_reason" rows={3} required />
              </div>

              <div className="space-y-2">
                <Label>Exit Reason (optional)</Label>
                <Textarea name="exit_reason" rows={3} />
              </div>

              <div className="space-y-2">
                <Label>Exit Price (optional)</Label>
                <Input
                  name="exit_price"
                  inputMode="decimal"
                  onChange={(e) => {
                    e.target.value = sanitize2dp(e.target.value);
                  }}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>
                  Risk Mode <span className="text-destructive">*</span>
                </Label>
                <select
                  name="risk_mode"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={riskMode}
                  onChange={(e) => setRiskMode(e.target.value)}
                  required
                >
                  <option value="PERCENT">Percentage</option>
                  <option value="AMOUNT">$ Amount</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>
                  Risk Per Trade <span className="text-destructive">*</span>
                </Label>
                <Input
                  name="risk_per_trade"
                  inputMode="decimal"
                  required
                  placeholder={riskMode === "PERCENT" ? "e.g. 1.5" : "e.g. 25"}
                  onChange={(e) => {
                    e.target.value = sanitize2dp(e.target.value);
                  }}
                />
              </div>

              <div className="rounded-md border p-3 text-xs text-muted-foreground">
                <div className="mb-1 font-medium text-foreground">
                  Strategy risk
                </div>
                <div>Risk/Trade: {strategy.risk_per_trade}</div>
                <div>AVG R:R: {strategy.avg_planned_rr}</div>
                <div>Planned R/Year: {strategy.planned_r_year}</div>
              </div>
            </div>

            {state?.message ? (
              <p className="text-sm text-destructive">{state.message}</p>
            ) : null}

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={pending || tpItems.length === 0 || !sumOk}
              >
                {pending ? "Saving..." : "Create Journal"}
              </Button>

              {!sumOk && tpItems.length > 0 && totalLotsOk ? (
                <p className="text-xs text-destructive">
                  Fix TP quantities to match total lots.
                </p>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
