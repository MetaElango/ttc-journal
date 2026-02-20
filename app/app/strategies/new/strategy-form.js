"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";

// shadcn (if installed)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function MultiSelect({ label, required, options, value, onChange }) {
  const selected = useMemo(() => new Set(value), [value]);

  function toggle(opt) {
    const next = new Set(selected);
    if (next.has(opt)) next.delete(opt);
    else next.add(opt);
    onChange(Array.from(next));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>
          {label}{" "}
          {required ? <span className="text-destructive">*</span> : null}
        </Label>
        <div className="flex flex-wrap gap-1">
          {value.map((v) => (
            <Badge
              key={v}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => toggle(v)}
              title="Click to remove"
            >
              {v}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.has(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={[
                "rounded-md border px-3 py-1.5 text-sm",
                active ? "bg-foreground text-background" : "bg-background",
              ].join(" ")}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function NewStrategyForm({ action }) {
  const [state, formAction, pending] = useActionState(action, {
    ok: true,
    message: "",
  });

  const STRATEGY_TYPE = ["Conservative", "Aggressive"];
  const TRADING_STYLE = ["Intraday", "Swing", "Positional"];
  const SETUP_TYPE = [
    "Trend Follow",
    "Reversal",
    "Retest",
    "Breakout",
    "Price Action",
    "SUPPLY / DEMAND",
    "Support & Resistance",
  ];
  const BIAS = [
    "Fundamentals",
    "Price Action",
    "Technical Indicator",
    "Sentiment",
    "NEWS",
  ];
  const TF = [
    "MN",
    "Week",
    "2D",
    "D",
    "H16",
    "H14",
    "H12",
    "H10",
    "H8",
    "H6",
    "H4",
    "H3",
    "H2",
    "H1",
    "30",
    "30M",
    "15M",
    "10M",
    "5M",
    "1M",
  ];
  const PREP_STATUS = ["Preparing", "Draft", "Active"];
  const STRAT_STATUS = ["LIVE", "ALTERNATING", "NOT USING"];

  const [bias, setBias] = useState([]);
  const [htf, setHtf] = useState([]);
  const [itf, setItf] = useState([]);
  const [etf, setEtf] = useState([]);

  const [prepStatus, setPrepStatus] = useState("Preparing");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Strategy</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-8">
            {/* Hidden inputs to submit arrays */}
            <input
              type="hidden"
              name="bias_confluence"
              value={JSON.stringify(bias)}
            />
            <input type="hidden" name="htf" value={JSON.stringify(htf)} />
            <input
              type="hidden"
              name="intermediate_tf"
              value={JSON.stringify(itf)}
            />
            <input type="hidden" name="entry_tf" value={JSON.stringify(etf)} />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>
                  Strategy Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  name="strategy_name"
                  placeholder="Eg: ORB + Trend"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Strategy Type <span className="text-destructive">*</span>
                </Label>
                <select
                  name="strategy_type"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select
                  </option>
                  {STRATEGY_TYPE.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>
                  Trading Style <span className="text-destructive">*</span>
                </Label>
                <select
                  name="trading_style"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select
                  </option>
                  {TRADING_STYLE.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>
                  Setup Type <span className="text-destructive">*</span>
                </Label>
                <select
                  name="setup_type"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select
                  </option>
                  {SETUP_TYPE.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <MultiSelect
              label="Bias & Confluence"
              required
              options={BIAS}
              value={bias}
              onChange={setBias}
            />

            <MultiSelect
              label="HTF"
              required
              options={TF}
              value={htf}
              onChange={setHtf}
            />

            <MultiSelect
              label="Intermediate TF"
              required={false}
              options={TF}
              value={itf}
              onChange={setItf}
            />

            <MultiSelect
              label="Entry TF"
              required
              options={TF}
              value={etf}
              onChange={setEtf}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Risk Per Trade <span className="text-destructive">*</span>
                </Label>
                <Input
                  name="risk_per_trade"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="2"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use percent (1 = 1%).
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  AVG Planned R:R <span className="text-destructive">*</span>
                </Label>
                <Input name="avg_planned_rr" placeholder="1:2" required />
              </div>

              <div className="space-y-2">
                <Label>
                  Planned R/Year <span className="text-destructive">*</span>
                </Label>
                <Input
                  name="planned_r_year"
                  placeholder="20"
                  inputMode="numeric"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Preparation Status <span className="text-destructive">*</span>
                </Label>
                <select
                  name="preparation_status"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  required
                  value={prepStatus}
                  onChange={(e) => setPrepStatus(e.target.value)}
                >
                  {PREP_STATUS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              {prepStatus === "Active" ? (
                <div className="space-y-2 md:col-span-2">
                  <Label>
                    Strategy Status <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {STRAT_STATUS.map((x) => (
                      <label
                        key={x}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="radio"
                          name="strategy_status"
                          value={x}
                          required
                        />
                        {x}
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                // Ensure it doesn't submit old value
                <input type="hidden" name="strategy_status" value="" />
              )}
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>
                  CheckList <span className="text-destructive">*</span>
                </Label>
                <Textarea name="checklist" rows={3} required />
              </div>

              <div className="space-y-2">
                <Label>
                  Entry Rules <span className="text-destructive">*</span>
                </Label>
                <Textarea name="entry_rules" rows={3} required />
              </div>

              <div className="space-y-2">
                <Label>
                  Exit Rules <span className="text-destructive">*</span>
                </Label>
                <Textarea name="exit_rules" rows={3} required />
              </div>

              <div className="space-y-2">
                <Label>
                  SL Management Rules{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea name="sl_management_rules" rows={3} required />
              </div>
            </div>

            {state?.message ? (
              <p className="text-sm text-destructive">{state.message}</p>
            ) : null}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Create Strategy"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Your strategy is private (RLS enforced).
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
