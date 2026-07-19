"use client";

import { useMemo, useState } from "react";
import { Camera, ChevronRight, FileText, Lightbulb, ShieldCheck, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldShell, NativeSelect, StepHeader } from "./form-ui";
import TimeframeSelector from "./timeframe-selector";
import TakeProfitEditor from "./take-profit-editor";
import { ExistingImageGrid, NewImageUploader } from "./image-components";
import { RiskSummary } from "./risk-components";
import {
  EDIT_STATUS_TRANSITIONS,
  PURPOSES,
  TF,
  getStatusOptions,
  isClosedStatus,
  needsEndDate,
  norm,
} from "../lib/journal-config";
import {
  formatMoney,
  formatNumber,
  numeric,
  sanitize2dp,
  sanitizeDecimal,
} from "../lib/trade-risk";

export default function JournalDetailsCommon(props) {
  const {
    cfg, purpose, setPurpose, status, setStatus,
    accounts, selectedAccountId, setSelectedAccountId,
    symbols, selectedSymbolId, setSelectedSymbolId,
    tpItems, setTpItems, direction, setDirection, quantity,
    onQuantityChange, applySuggestedQuantity,
    riskMode, setRiskMode, riskPerTrade, setRiskPerTrade,
    strategy, entryPrice, setEntryPrice, stopLoss, setStopLoss,
    setupImages, setSetupImages, referenceImages, setReferenceImages,
    setupImageError, setSetupImageError, referenceImageError, setReferenceImageError,
    prefillJournal, existingSetupImages, setExistingSetupImages,
    existingReferenceImages, setExistingReferenceImages,
    journalStartAt, setJournalStartAt, journalEndAt, setJournalEndAt,
    selectedHtf, setSelectedHtf, selectedEntryTf, setSelectedEntryTf,
    selectedAccount, selectedSymbol, allowedRisk, estimatedLoss, potentialProfit,
    suggestedQuantity, quantityAutoAdjusted, isOverRisk,
    calculationCurrency, conversionRate, conversionRateDate,
    fxRateLoading, fxRateError, fxRateReady,
  } = props;

  const disableTradingAccount = !!cfg.disable?.tradingAccount;
  const disableRisk = !!cfg.disable?.risk;
  const required = cfg.required || {};
  const [symbolQuery, setSymbolQuery] = useState("");

  const filteredSymbols = useMemo(() => {
    const query = symbolQuery.trim().toLowerCase();
    if (!query) return symbols;
    return symbols.filter((symbol) =>
      [symbol.symbol_name, symbol.category, symbol.full_name]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(query)),
    );
  }, [symbols, symbolQuery]);

  const totalLots = numeric(quantity);
  const sumTpLots = useMemo(
    () => tpItems.reduce((acc, item) => acc + numeric(item.qty), 0),
    [tpItems],
  );
  const sumOk = totalLots > 0 ? Math.abs(sumTpLots - totalLots) <= 0.0000001 : false;

  const entryNumber = numeric(entryPrice);
  const stopNumber = numeric(stopLoss);
  let slDirectionError = "";
  if (entryPrice !== "" && stopLoss !== "") {
    if (direction === "BUY" && !(stopNumber < entryNumber)) slDirectionError = "For BUY, stop loss must be less than entry price.";
    if (direction === "SELL" && !(stopNumber > entryNumber)) slDirectionError = "For SELL, stop loss must be greater than entry price.";
  }

  const exitReasonRequired = !!required.exit_reason || isClosedStatus(status);
  const exitPriceRequired = !!required.exit_price || isClosedStatus(status);
  const currentStatus = norm(prefillJournal?.status);
  const isEditingPlannedOrPlaced = prefillJournal && ["ENTRY PLANNED", "ENTRY PLACED"].includes(currentStatus);
  const statusOptions = prefillJournal && EDIT_STATUS_TRANSITIONS[currentStatus]
    ? EDIT_STATUS_TRANSITIONS[currentStatus]
    : getStatusOptions(purpose);

  function onPurposeChange(nextPurpose) {
    const next = norm(nextPurpose);
    setPurpose(next);
    if (!getStatusOptions(next).includes(status)) setStatus("");
  }

  return (
    <>
      <input type="hidden" name="take_profit_json" value={JSON.stringify(tpItems)} />
      <input type="hidden" name="existing_setup_images" value={JSON.stringify((existingSetupImages || []).map((x) => x.path))} />
      <input type="hidden" name="existing_reference_images" value={JSON.stringify((existingReferenceImages || []).map((x) => x.path))} />
      <input type="hidden" name="htf_json" value={JSON.stringify(selectedHtf)} />
      <input type="hidden" name="entry_tf_json" value={JSON.stringify(selectedEntryTf)} />

      <section id="setup" className="scroll-mt-24 rounded-3xl border bg-card p-5 shadow-sm md:p-6">
        <StepHeader icon={Target} eyebrow="Step 1" title="Opportunity Setup" description="Choose purpose, account, symbol, status and timing." />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <FieldShell label="Purpose" required>
            <NativeSelect name="purpose" value={norm(purpose)} onChange={(e) => onPurposeChange(e.target.value)} required>
              {PURPOSES.map((item) => <option key={item} value={item}>{item}</option>)}
            </NativeSelect>
          </FieldShell>

          <FieldShell label="Trading Account" required={required.tradingAccount}>
            <NativeSelect name="trading_account_id" required={!!required.tradingAccount} value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} disabled={disableTradingAccount}>
              <option value="">Select account</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.account_name} — {account.framework} — {account.account_size}</option>)}
            </NativeSelect>
            {disableTradingAccount ? <><input type="hidden" name="trading_account_id" value={selectedAccountId} /><p className="text-xs text-muted-foreground">Disabled for {purpose}.</p></> : null}
          </FieldShell>

          <div className="md:col-span-2">
            <FieldShell label="Symbol" required={required.symbol}>
              <Input value={symbolQuery} onChange={(e) => setSymbolQuery(e.target.value)} placeholder="Search symbol e.g. GOLD, EURUSD, Indices" className="mb-2 h-11 rounded-xl" />
              <NativeSelect name="symbol_id" required={!!required.symbol} value={selectedSymbolId} onChange={(e) => setSelectedSymbolId(e.target.value)}>
                <option value="">Select symbol</option>
                {filteredSymbols.map((symbol) => <option key={symbol.id} value={symbol.id}>{symbol.symbol_name} — {symbol.category}</option>)}
              </NativeSelect>
              {selectedSymbol ? <p className="text-xs text-slate-500">Contract size: {formatNumber(numeric(selectedSymbol.contract_size, 1))} · Lot step: {formatNumber(numeric(selectedSymbol.lot_step, 0.01))} · Calculation currency: {calculationCurrency}</p> : null}
            </FieldShell>
          </div>

          {isEditingPlannedOrPlaced ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase text-slate-500">Current Status</div><div className="mt-2 text-sm font-bold text-slate-900">{prefillJournal.status}</div></div> : null}

          <FieldShell label={isEditingPlannedOrPlaced ? "Update Status To" : "Status"} required={!!required.status}>
            <NativeSelect name="status" value={statusOptions.includes(status) ? status : ""} onChange={(e) => setStatus(e.target.value)} required={!!required.status}>
              <option value="">{required.status ? "Select status" : "No status"}</option>
              {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </NativeSelect>
          </FieldShell>

          <FieldShell label="Create Date & Time" required>
            <Input name="journal_start_at" type="datetime-local" value={journalStartAt} onChange={(e) => setJournalStartAt(e.target.value)} required className="h-11 rounded-xl" />
          </FieldShell>
          {needsEndDate(status) ? <FieldShell label="End Date & Time" required><Input name="journal_end_at" type="datetime-local" value={journalEndAt} onChange={(e) => setJournalEndAt(e.target.value)} required className="h-11 rounded-xl" /></FieldShell> : <input type="hidden" name="journal_end_at" value="" />}
        </div>
      </section>

      <section id="levels" className="scroll-mt-24 rounded-3xl border bg-card p-5 shadow-sm md:p-6">
        <StepHeader icon={ChevronRight} eyebrow="Step 2" title="Trade Levels" description="Enter direction, quantity, entry, stop loss and targets." />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <TimeframeSelector title="HTF" values={prefillJournal ? TF : strategy?.htf || []} selected={selectedHtf} setSelected={setSelectedHtf} />
          <TimeframeSelector title="Entry TF" values={prefillJournal ? TF : strategy?.entry_tf || []} selected={selectedEntryTf} setSelected={setSelectedEntryTf} />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <FieldShell label="Direction" required={required.direction}><NativeSelect name="direction" value={direction} onChange={(e) => setDirection(e.target.value)} required={!!required.direction}><option value="BUY">Long</option><option value="SELL">Short</option></NativeSelect></FieldShell>
          <FieldShell label="Quantity" required={required.quantity} hint="Lots">
            <Input name="quantity" inputMode="decimal" value={quantity} onChange={(e) => onQuantityChange(e.target.value)} required={!!required.quantity} placeholder="1" className="h-11 rounded-xl" />
            {suggestedQuantity > 0 ? <button type="button" onClick={applySuggestedQuantity} className="text-left text-xs font-semibold text-sky-600 hover:text-sky-700">Suggested from risk: {suggestedQuantity}. Click to apply.</button> : null}
          </FieldShell>
          <FieldShell label="Entry Price" required={required.entry_price}><Input name="entry_price" inputMode="decimal" value={entryPrice} required={!!required.entry_price} onChange={(e) => setEntryPrice(sanitizeDecimal(e.target.value, selectedSymbol?.decimal_places ?? 6))} className="h-11 rounded-xl" /></FieldShell>
          <FieldShell label="Stop Loss" required={required.stop_loss}>
            <Input name="stop_loss" inputMode="decimal" value={stopLoss} required={!!required.stop_loss} onChange={(e) => setStopLoss(sanitizeDecimal(e.target.value, selectedSymbol?.decimal_places ?? 6))} className="h-11 rounded-xl" />
            {estimatedLoss > 0 ? <div className={`rounded-xl border px-3 py-2 text-xs font-bold ${isOverRisk ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}>Estimated SL loss: {formatMoney(estimatedLoss, "USD")}</div> : null}
            {slDirectionError ? <p className="text-xs text-destructive">{slDirectionError}</p> : null}
          </FieldShell>
        </div>

        <div className="mt-6"><TakeProfitEditor items={tpItems} setItems={setTpItems} totalLots={quantity} disabled={false} direction={direction} entryPrice={entryPrice} symbol={selectedSymbol} conversionRate={conversionRate} fxRateReady={fxRateReady} /></div>
        {!sumOk && tpItems.length > 0 && totalLots > 0 ? <p className="mt-3 text-xs text-destructive">Fix TP quantities to match total lots.</p> : null}
        <RiskSummary account={selectedAccount} symbol={selectedSymbol} calculationCurrency={calculationCurrency} conversionRate={conversionRate} conversionRateDate={conversionRateDate} fxRateLoading={fxRateLoading} fxRateError={fxRateError} riskMode={riskMode} riskPerTrade={riskPerTrade} allowedRisk={allowedRisk} estimatedLoss={estimatedLoss} potentialProfit={potentialProfit} suggestedQuantity={suggestedQuantity} quantity={quantity} quantityAutoAdjusted={quantityAutoAdjusted} isOverRisk={isOverRisk} />
      </section>

      <section id="reasoning" className="scroll-mt-24 rounded-3xl border bg-card p-5 shadow-sm md:p-6">
        <StepHeader icon={FileText} eyebrow="Step 3" title="Reasoning" description="Capture why you entered and how or why the trade ended." />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <FieldShell label="Entry Reason" required={required.entry_reason}><Textarea name="entry_reason" rows={4} defaultValue={prefillJournal?.entry_reason || ""} required={!!required.entry_reason} className="rounded-xl" /></FieldShell>
          <FieldShell label="Exit Reason" required={exitReasonRequired}><Textarea name="exit_reason" rows={4} defaultValue={prefillJournal?.exit_reason || ""} required={exitReasonRequired} className="rounded-xl" /></FieldShell>
          <FieldShell label="Exit Price" required={exitPriceRequired} hint={exitPriceRequired ? "" : "Optional"}><Input name="exit_price" inputMode="decimal" defaultValue={prefillJournal?.exit_price ?? ""} required={exitPriceRequired} onChange={(e) => { e.target.value = sanitizeDecimal(e.target.value, selectedSymbol?.decimal_places ?? 6); }} className="h-11 rounded-xl" /></FieldShell>
        </div>
      </section>

      <section id="images" className="scroll-mt-24 rounded-3xl border bg-card p-5 shadow-sm md:p-6">
        <StepHeader icon={Camera} eyebrow="Step 4" title="Images" description="Add setup screenshots and reference charts." />
        <div className="mt-6 grid gap-6">
          <ExistingImageGrid title="Existing Setup Images" images={existingSetupImages} onRemove={(path) => setExistingSetupImages((previous) => previous.filter((image) => image.path !== path))} />
          <ExistingImageGrid title="Existing Reference Images" images={existingReferenceImages} onRemove={(path) => setExistingReferenceImages((previous) => previous.filter((image) => image.path !== path))} />
          <div className="grid gap-4 md:grid-cols-2">
            <NewImageUploader title="Add Setup Images" files={setupImages} setFiles={setSetupImages} existingCount={existingSetupImages?.length || 0} max={2} error={setupImageError} setError={setSetupImageError} />
            <NewImageUploader title="Add Reference Images" files={referenceImages} setFiles={setReferenceImages} existingCount={existingReferenceImages?.length || 0} max={5} error={referenceImageError} setError={setReferenceImageError} />
          </div>
        </div>
      </section>

      <section id="risk" className="scroll-mt-24 rounded-3xl border bg-card p-5 shadow-sm md:p-6">
        <StepHeader icon={ShieldCheck} eyebrow="Step 5" title="Risk" description="Set risk mode and risk per trade." />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <FieldShell label="Risk Mode" required={required.risk_mode}>
            <NativeSelect name="risk_mode" value={riskMode} onChange={(e) => setRiskMode(e.target.value)} required={!!required.risk_mode && !disableRisk} disabled={disableRisk}><option value="PERCENT">Percentage</option><option value="AMOUNT">Amount</option></NativeSelect>
            {disableRisk ? <input type="hidden" name="risk_mode" value={riskMode} /> : null}
          </FieldShell>
          <FieldShell label="Risk Per Trade" required={required.risk_per_trade}>
            <Input name="risk_per_trade" inputMode="decimal" value={riskPerTrade} required={!!required.risk_per_trade && !disableRisk} placeholder={riskMode === "PERCENT" ? "e.g. 1.5" : "e.g. 25"} disabled={disableRisk} onChange={(e) => setRiskPerTrade(sanitize2dp(e.target.value))} className="h-11 rounded-xl" />
            {disableRisk ? <input type="hidden" name="risk_per_trade" value={riskPerTrade} /> : null}
            {allowedRisk > 0 ? <p className="text-xs font-semibold text-sky-600">Maximum planned loss: {formatMoney(allowedRisk, "USD")}</p> : null}
          </FieldShell>
          <div className="rounded-2xl border bg-background/60 p-4 text-sm"><div className="mb-2 font-medium">Strategy Risk</div><div className="space-y-1 text-xs text-muted-foreground"><div>Risk/Trade: {strategy?.risk_per_trade ?? "—"}</div><div>AVG R:R: {strategy?.avg_planned_rr ?? "—"}</div><div>Planned R/Year: {strategy?.planned_r_year ?? strategy?.planned_r_per_year ?? "—"}</div></div></div>
        </div>
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800"><Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" /><p className="leading-6">Once account, symbol, entry, stop loss and risk are available, the form calculates a suggested quantity. The quantity remains editable.</p></div>
      </section>
    </>
  );
}
