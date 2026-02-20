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
            <div className="text-xs font-medium opacity-70 mb-2">Checklist</div>
            {s.checklist}
          </div>
          <div className="rounded-md border p-3 text-sm whitespace-pre-wrap">
            <div className="text-xs font-medium opacity-70 mb-2">
              Entry Rules
            </div>
            {s.entry_rules}
          </div>
          <div className="rounded-md border p-3 text-sm whitespace-pre-wrap">
            <div className="text-xs font-medium opacity-70 mb-2">
              Exit Rules
            </div>
            {s.exit_rules}
          </div>
          <div className="rounded-md border p-3 text-sm whitespace-pre-wrap">
            <div className="text-xs font-medium opacity-70 mb-2">
              SL Management Rules
            </div>
            {s.sl_management_rules}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TakeProfitEditor({ value, onChange }) {
  const [tp, setTp] = useState("");

  function add() {
    const v = Number(tp);
    if (Number.isNaN(v)) return;
    onChange([...(value || []), v]);
    setTp("");
  }

  function removeAt(i) {
    const next = [...value];
    next.splice(i, 1);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <Label>Take Profit (multiple)</Label>

      <div className="flex gap-2">
        <Input
          value={tp}
          onChange={(e) => setTp(e.target.value)}
          placeholder="Add TP price"
          inputMode="decimal"
        />
        <Button type="button" variant="secondary" onClick={add}>
          Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(value || []).map((v, idx) => (
          <span
            key={`${v}-${idx}`}
            className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs"
          >
            {v}
            <button
              type="button"
              onClick={() => removeAt(idx)}
              className="opacity-70 hover:opacity-100"
              aria-label="Remove take profit"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
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
      "FORWARD TESTING",
      "FOR OBSERVATION",
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
  const [tpList, setTpList] = useState([]);

  // Simple searchable symbol list
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
              name="take_profit"
              value={JSON.stringify(tpList)}
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
                  defaultValue="FORWARD TESTING"
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
                  Entry Price <span className="text-destructive">*</span>
                </Label>
                <Input name="entry_price" inputMode="decimal" required />
              </div>

              <div className="space-y-2">
                <Label>
                  Stop Loss <span className="text-destructive">*</span>
                </Label>
                <Input name="stop_loss" inputMode="decimal" required />
              </div>

              <div className="space-y-2">
                <TakeProfitEditor value={tpList} onChange={setTpList} />
              </div>
            </div>

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
                <Input name="exit_price" inputMode="decimal" />
                <p className="text-xs text-muted-foreground">
                  If you fill exit reason, exit price is required (and vice
                  versa).
                </p>
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
                />
                <p className="text-xs text-muted-foreground">
                  {riskMode === "PERCENT"
                    ? "Store as percent number (e.g. 1.5 means 1.5%)."
                    : "Store as amount (e.g. 25 means $25)."}
                </p>
              </div>

              <div className="rounded-md border p-3 text-xs text-muted-foreground">
                <div className="font-medium text-foreground mb-1">
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
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Create Journal"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
