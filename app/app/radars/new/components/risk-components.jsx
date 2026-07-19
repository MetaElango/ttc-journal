"use client";

import { AlertTriangle, BarChart3, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { norm } from "../lib/journal-config";
import { formatMoney, formatNumber, numeric, round2 } from "../lib/trade-risk";

function RiskValue({ label, value, detail, danger = false, positive = false }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-lg font-bold ${danger ? "text-red-600" : positive ? "text-emerald-600" : "text-slate-950"}`}>{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}

export function RiskSummary({
  account,
  symbol,
  calculationCurrency,
  conversionRate,
  conversionRateDate,
  fxRateLoading,
  fxRateError,
  riskMode,
  riskPerTrade,
  allowedRisk,
  estimatedLoss,
  potentialProfit,
  suggestedQuantity,
  quantity,
  quantityAutoAdjusted,
  isOverRisk,
}) {
  const rewardRisk = estimatedLoss > 0 ? potentialProfit / estimatedLoss : 0;

  return (
    <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold text-slate-950"><BarChart3 className="h-5 w-5 text-sky-600" /> Position Risk Summary</div>
          <p className="mt-1 text-sm text-slate-500">Based on account size, symbol contract details and current levels.</p>
        </div>
        {isOverRisk ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700"><AlertTriangle className="h-4 w-4" /> Above configured risk</span>
        ) : allowedRisk > 0 && estimatedLoss > 0 ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"><ShieldCheck className="h-4 w-4" /> Within configured risk</span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <RiskValue label="Account Size" value={account ? formatMoney(numeric(account.account_size), "USD") : "—"} />
        <RiskValue label="Allowed Risk" value={allowedRisk > 0 ? formatMoney(allowedRisk, "USD") : "—"} detail={norm(riskMode) === "PERCENT" ? `${riskPerTrade || 0}%` : "Fixed amount"} />
        <RiskValue label="SL Loss" value={estimatedLoss > 0 ? formatMoney(estimatedLoss, "USD") : "—"} danger={isOverRisk} />
        <RiskValue label="TP Profit" value={potentialProfit !== 0 ? formatMoney(potentialProfit, "USD") : "—"} positive={potentialProfit > 0} />
        <RiskValue label="Reward / Risk" value={rewardRisk > 0 ? `1:${round2(rewardRisk)}` : "—"} />
      </div>

      {quantityAutoAdjusted ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
          <div>
            <p className="font-semibold">Quantity adjusted according to your risk</p>
            <p className="mt-1 leading-6">The quantity was set to <strong>{suggestedQuantity}</strong>. You may change it manually, but a warning will appear before submission if it exceeds your configured risk.</p>
          </div>
        </div>
      ) : null}

      {suggestedQuantity > 0 && numeric(quantity) !== numeric(suggestedQuantity) ? (
        <div className="mt-4 rounded-2xl border bg-white p-4 text-sm text-slate-600">
          Risk-based quantity: <strong className="text-slate-950">{suggestedQuantity}</strong>. Current quantity: <strong className="text-slate-950">{quantity || "—"}</strong>.
        </div>
      ) : null}

      {symbol ? (
        <div className="mt-4 space-y-2 text-xs leading-5 text-slate-500">
          <p>Formula uses contract size <strong>{formatNumber(numeric(symbol.contract_size, 1))}</strong>, price multiplier <strong>{formatNumber(numeric(symbol.price_multiplier, 1))}</strong>, minimum lot <strong>{formatNumber(numeric(symbol.min_lot, 0))}</strong> and lot step <strong>{formatNumber(numeric(symbol.lot_step, 0.01))}</strong>.</p>
          {fxRateLoading ? <p className="font-semibold text-sky-600">Loading {calculationCurrency} to USD conversion rate…</p> : fxRateError ? <p className="font-semibold text-red-600">Unable to convert {calculationCurrency} to USD: {fxRateError}</p> : calculationCurrency === "USD" ? <p>The instrument calculation currency is USD, so no conversion is required.</p> : <p>Profit and loss are first calculated in <strong>{calculationCurrency}</strong>, then converted to <strong>USD</strong> at <strong>1 {calculationCurrency} = {formatNumber(conversionRate, 8)} USD</strong>{conversionRateDate ? ` using the ${conversionRateDate} rate` : ""}.</p>}
        </div>
      ) : null}
    </div>
  );
}

export function RiskOverrideModal({ open, allowedRisk, estimatedLoss, suggestedQuantity, quantity, onCancel, onContinue }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-red-200 bg-white shadow-2xl">
        <div className="border-b border-red-100 bg-red-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600"><AlertTriangle className="h-6 w-6" /></div>
            <div><h2 className="text-xl font-bold text-slate-950">This quantity exceeds your configured risk</h2><p className="mt-2 text-sm leading-6 text-slate-600">You can return and reduce the quantity, or explicitly submit this opportunity with the higher risk.</p></div>
          </div>
        </div>
        <div className="space-y-4 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <RiskValue label="Allowed Risk" value={formatMoney(allowedRisk, "USD")} />
            <RiskValue label="Estimated SL Loss" value={formatMoney(estimatedLoss, "USD")} danger />
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">Excess risk: <strong>{formatMoney(Math.max(0, estimatedLoss - allowedRisk), "USD")}</strong></div>
          <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600">Suggested quantity: <strong className="text-slate-950">{suggestedQuantity || "—"}</strong><br />Current quantity: <strong className="text-slate-950">{quantity || "—"}</strong></div>
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t bg-slate-50 p-5">
          <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">Go Back and Adjust</Button>
          <Button type="button" onClick={onContinue} className="rounded-xl bg-red-600 text-white hover:bg-red-700">Submit Anyway</Button>
        </div>
      </div>
    </div>
  );
}
