"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Plus, Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { FieldShell, Pill } from "./components/form-ui";
import JournalDetailsCommon from "./components/journal-details-common";
import OpportunityStepper from "./components/opportunity-stepper";
import StrategyBlueprint from "./components/strategy-blueprint";
import { RiskOverrideModal } from "./components/risk-components";
import { useUsdConversionRate } from "./hooks/use-usd-conversion-rate";
import {
  PURPOSE_CONFIG,
  nowLocalDateTimeValue,
  norm,
  toDatetimeLocal,
} from "./lib/journal-config";
import {
  calculateAllowedRisk,
  calculateMoneyAtPrice,
  calculateSuggestedQuantity,
  convertToUsd,
  getCalculationCurrency,
  numeric,
  sanitizeDecimal,
  splitTpQuantity,
} from "./lib/trade-risk";

export default function NewJournalForm({
  action,
  strategy,
  strategies = [],
  accounts = [],
  symbols = [],
  prefillJournal = null,
  isIncorporate = false,
}) {
  const router = useRouter();
  const formRef = useRef(null);
  const riskOverrideApprovedRef = useRef(false);

  const [selectedStrategy, setSelectedStrategy] = useState(strategy || null);
  const activeStrategy = selectedStrategy || strategy || {};
  const [setupImages, setSetupImages] = useState([]);
  const [referenceImages, setReferenceImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [setupImageError, setSetupImageError] = useState("");
  const [referenceImageError, setReferenceImageError] = useState("");
  const [existingSetupImages, setExistingSetupImages] = useState([]);
  const [existingReferenceImages, setExistingReferenceImages] = useState([]);
  const [selectedHtf, setSelectedHtf] = useState(prefillJournal?.htf?.length ? prefillJournal.htf : []);
  const [selectedEntryTf, setSelectedEntryTf] = useState(prefillJournal?.entry_tf?.length ? prefillJournal.entry_tf : []);
  const [activeSection, setActiveSection] = useState("setup");
  const [purpose, setPurpose] = useState(prefillJournal?.purpose || "TRADE OBSERVATION");
  const purposeKey = norm(purpose);
  const cfg = PURPOSE_CONFIG[purposeKey] || PURPOSE_CONFIG["TRADE OBSERVATION"];
  const [status, setStatus] = useState(prefillJournal?.status || "");
  const [selectedAccountId, setSelectedAccountId] = useState(prefillJournal?.trading_account_id || "");
  const [selectedSymbolId, setSelectedSymbolId] = useState(prefillJournal?.symbol_id || "");
  const [journalStartAt, setJournalStartAt] = useState(prefillJournal?.journal_start_at ? toDatetimeLocal(prefillJournal.journal_start_at) : nowLocalDateTimeValue());
  const [journalEndAt, setJournalEndAt] = useState(prefillJournal?.journal_end_at ? toDatetimeLocal(prefillJournal.journal_end_at) : nowLocalDateTimeValue());
  const [riskMode, setRiskMode] = useState(prefillJournal?.risk_mode || "PERCENT");
  const [riskPerTrade, setRiskPerTrade] = useState(
    prefillJournal?.risk_per_trade != null
      ? String(prefillJournal.risk_per_trade)
      : activeStrategy?.risk_per_trade != null
        ? String(activeStrategy.risk_per_trade)
        : "1",
  );
  const [direction, setDirection] = useState(prefillJournal?.direction || "BUY");
  const [quantity, setQuantity] = useState(prefillJournal?.quantity != null ? String(prefillJournal.quantity) : "");
  const [entryPrice, setEntryPrice] = useState(prefillJournal?.entry_price != null ? String(prefillJournal.entry_price) : "");
  const [stopLoss, setStopLoss] = useState(prefillJournal?.stop_loss != null ? String(prefillJournal.stop_loss) : "");
  const [tpItems, setTpItems] = useState(() => {
    if (!prefillJournal) return [];
    const prices = Array.isArray(prefillJournal.take_profit) ? prefillJournal.take_profit : [];
    const quantities = Array.isArray(prefillJournal.take_profit_qty) ? prefillJournal.take_profit_qty : [];
    return prices.map((price, index) => ({
      price: String(price),
      qty: quantities[index] != null ? String(quantities[index]) : "",
    }));
  });
  const [quantityManuallyEdited, setQuantityManuallyEdited] = useState(Boolean(prefillJournal));
  const [quantityAutoAdjusted, setQuantityAutoAdjusted] = useState(false);
  const [showRiskWarning, setShowRiskWarning] = useState(false);

  const [state, formAction, pending] = useActionState(action, { ok: true, message: "" });

  const selectedAccount = useMemo(
    () => accounts.find((account) => String(account.id) === String(selectedAccountId)) || null,
    [accounts, selectedAccountId],
  );
  const selectedSymbol = useMemo(
    () => symbols.find((symbol) => String(symbol.id) === String(selectedSymbolId)) || null,
    [symbols, selectedSymbolId],
  );
  const calculationCurrency = useMemo(() => getCalculationCurrency(selectedSymbol), [selectedSymbol]);
  const {
    rate: quoteToUsdRate,
    rateDate: quoteToUsdRateDate,
    loading: fxRateLoading,
    error: fxRateError,
  } = useUsdConversionRate(calculationCurrency);

  const conversionRate = calculationCurrency === "USD" ? 1 : Number(quoteToUsdRate);
  const fxRateReady = calculationCurrency === "USD" || (Number.isFinite(conversionRate) && conversionRate > 0);

  const allowedRisk = useMemo(
    () => cfg.disable?.risk ? 0 : calculateAllowedRisk({ account: selectedAccount, riskMode, riskPerTrade }),
    [cfg.disable?.risk, selectedAccount, riskMode, riskPerTrade],
  );

  const suggestedQuantity = useMemo(() => {
    if (!fxRateReady) return 0;
    return calculateSuggestedQuantity({ direction, entryPrice, stopLoss, allowedRisk, symbol: selectedSymbol, conversionRate });
  }, [direction, entryPrice, stopLoss, allowedRisk, selectedSymbol, conversionRate, fxRateReady]);

  const estimatedLossInstrumentCurrency = useMemo(
    () => Math.abs(calculateMoneyAtPrice({ direction, entryPrice, targetPrice: stopLoss, lots: quantity, symbol: selectedSymbol })),
    [direction, entryPrice, stopLoss, quantity, selectedSymbol],
  );
  const estimatedLoss = useMemo(
    () => fxRateReady ? convertToUsd(estimatedLossInstrumentCurrency, conversionRate) : 0,
    [estimatedLossInstrumentCurrency, conversionRate, fxRateReady],
  );

  const potentialProfitInstrumentCurrency = useMemo(
    () => tpItems.reduce((acc, item) => acc + calculateMoneyAtPrice({ direction, entryPrice, targetPrice: item.price, lots: item.qty, symbol: selectedSymbol }), 0),
    [direction, entryPrice, tpItems, selectedSymbol],
  );
  const potentialProfit = useMemo(
    () => fxRateReady ? convertToUsd(potentialProfitInstrumentCurrency, conversionRate) : 0,
    [potentialProfitInstrumentCurrency, conversionRate, fxRateReady],
  );

  const riskTolerance = Math.max(0.01, allowedRisk * 0.0001);
  const isOverRisk = !cfg.disable?.risk && allowedRisk > 0 && estimatedLoss > allowedRisk + riskTolerance;
  const totalLots = numeric(quantity);
  const sumTpLots = useMemo(() => tpItems.reduce((acc, item) => acc + numeric(item.qty), 0), [tpItems]);
  const sumOk = totalLots > 0 ? Math.abs(sumTpLots - totalLots) <= 0.0000001 : false;
  const entryNumber = numeric(entryPrice);
  const stopNumber = numeric(stopLoss);
  let slOk = true;
  if (entryPrice !== "" && stopLoss !== "") {
    if (direction === "BUY") slOk = stopNumber < entryNumber;
    if (direction === "SELL") slOk = stopNumber > entryNumber;
  }

  const setupImageCount = (existingSetupImages?.length || 0) + (setupImages?.length || 0);
  const setupImagesOk = setupImageCount >= 1 && setupImageCount <= 2;

  useEffect(() => {
    const sections = ["setup", "levels", "reasoning", "images", "risk"];
    function handleScroll() {
      const scrollPosition = window.scrollY + 180;
      for (const id of sections) {
        const element = document.getElementById(id);
        if (element && scrollPosition >= element.offsetTop && scrollPosition < element.offsetTop + element.offsetHeight) {
          setActiveSection(id);
          break;
        }
      }
    }
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    async function loadSignedUrls() {
      if (!prefillJournal) return;
      const supabase = createClient();
      async function buildImages(paths = []) {
        return Promise.all(paths.map(async (path) => {
          const { data } = await supabase.storage.from("journal-images").createSignedUrl(path, 60 * 60);
          return { path, url: data?.signedUrl || "" };
        }));
      }
      setExistingSetupImages(await buildImages(prefillJournal.setup_images || []));
      setExistingReferenceImages(await buildImages(prefillJournal.reference_images || []));
    }
    loadSignedUrls();
  }, [prefillJournal]);

  useEffect(() => {
    if (prefillJournal || cfg.disable?.risk || quantityManuallyEdited || !fxRateReady || suggestedQuantity <= 0) return;
    setQuantity(String(suggestedQuantity));
    setTpItems((previous) => previous.length ? splitTpQuantity(previous, suggestedQuantity) : previous);
    setQuantityAutoAdjusted(true);
  }, [suggestedQuantity, quantityManuallyEdited, prefillJournal, cfg.disable?.risk, fxRateReady]);

  useEffect(() => {
    if (!state?.ok || !state?.journalId) return;

    async function uploadImagesAndRedirect() {
      setUploadingImages(true);
      setUploadError("");
      try {
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("User not found.");

        let copiedSetupImages = [];
        let copiedReferenceImages = [];
        const hasExistingImages = (state.existingSetupImages || []).length > 0 || (state.existingReferenceImages || []).length > 0;

        if (hasExistingImages) {
          const copyResponse = await fetch("/api/journals/copy-images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              journalId: state.journalId,
              setupImages: state.existingSetupImages || [],
              referenceImages: state.existingReferenceImages || [],
            }),
          });
          const copyResult = await copyResponse.json();
          if (!copyResult.ok) throw new Error(copyResult.message || "Failed to copy images.");
          copiedSetupImages = copyResult.setupImages || [];
          copiedReferenceImages = copyResult.referenceImages || [];
        }

        async function uploadFiles(files, type) {
          const uploadedPaths = [];
          for (let index = 0; index < files.length; index++) {
            const file = files[index];
            const extension = file.name.split(".").pop() || "jpg";
            const filePath = `${user.id}/${state.journalId}/${type}/${Date.now()}-${index}.${extension}`;
            const { error } = await supabase.storage.from("journal-images").upload(filePath, file, { contentType: file.type, upsert: false });
            if (error) throw new Error(error.message);
            uploadedPaths.push(filePath);
          }
          return uploadedPaths;
        }

        const uploadedSetupImages = await uploadFiles(setupImages, "setup");
        const uploadedReferenceImages = await uploadFiles(referenceImages, "reference");
        const { error: updateError } = await supabase.from("journals").update({
          setup_images: [...copiedSetupImages, ...uploadedSetupImages],
          reference_images: [...copiedReferenceImages, ...uploadedReferenceImages],
        }).eq("id", state.journalId);
        if (updateError) throw new Error(updateError.message);
        router.push("/app/radars");
      } catch (error) {
        setUploadError(error.message || "Image upload failed.");
      } finally {
        setUploadingImages(false);
      }
    }

    uploadImagesAndRedirect();
  }, [state?.ok, state?.journalId, state?.existingSetupImages, state?.existingReferenceImages, setupImages, referenceImages, router]);

  function handleAccountChange(accountId) {
    setSelectedAccountId(accountId);
    setQuantityManuallyEdited(false);
    setQuantityAutoAdjusted(false);
    setQuantity("");
    setTpItems((previous) => previous.map((item) => ({ ...item, qty: "" })));
  }

  function handleQuantityChange(rawValue) {
    const decimalPlaces = Math.min(8, Math.max(2, String(selectedSymbol?.lot_step || "0.01").split(".")[1]?.length || 2));
    setQuantity(sanitizeDecimal(rawValue, decimalPlaces));
    setQuantityManuallyEdited(true);
    setQuantityAutoAdjusted(false);
  }

  function applySuggestedQuantity() {
    if (suggestedQuantity <= 0) return;
    setQuantity(String(suggestedQuantity));
    setTpItems((previous) => previous.length ? splitTpQuantity(previous, suggestedQuantity) : previous);
    setQuantityManuallyEdited(false);
    setQuantityAutoAdjusted(true);
  }

  function handleSubmit(event) {
    if (!fxRateReady || fxRateLoading) {
      event.preventDefault();
      return;
    }
    if (!isOverRisk) {
      riskOverrideApprovedRef.current = false;
      return;
    }
    if (riskOverrideApprovedRef.current) {
      riskOverrideApprovedRef.current = false;
      return;
    }
    event.preventDefault();
    setShowRiskWarning(true);
  }

  function submitDespiteRisk() {
    setShowRiskWarning(false);
    riskOverrideApprovedRef.current = true;
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  return (
    <>
      <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6">
          <img src="/playbook-bg.png" alt="" className="absolute right-0 top-0 h-full w-[65%] object-cover opacity-80" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white/80 px-4 py-2 text-sm font-semibold text-sky-600"><Sparkles className="h-4 w-4" /> OPPORTUNITY BUILDER</div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950">
              {isIncorporate ? <>Incorporate <span className="text-sky-500">Opportunity</span></> : prefillJournal ? <>Edit <span className="text-sky-500">Opportunity</span></> : <>Create <span className="text-sky-500">Opportunity</span></>}
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-slate-500">
              {isIncorporate ? "Review this shared opportunity, adjust details if needed, and incorporate it into your own journal." : prefillJournal ? "Modify your existing trading opportunity and update execution details." : "Select a live playbook and create a structured trading opportunity."}
            </p>
          </div>
        </div>

        {!selectedStrategy && !prefillJournal ? (
          <div className="grid gap-5 md:grid-cols-2">
            {strategies.map((item) => {
              const isConservative = item.strategy_type === "Conservative";
              return (
                <div key={item.id} className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50/40 p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl">
                  <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-sky-100/40 blur-3xl transition group-hover:bg-sky-200/50" />
                  <div className="relative z-10">
                    <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="text-2xl font-bold text-slate-950">{item.strategy_name}</h3><div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" /> LIVE</div></div>
                    <p className="mt-2 text-sm text-slate-500">{item.trading_style} • {item.setup_type}</p>
                    <div className="mt-4 flex flex-wrap gap-2"><span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${isConservative ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>{item.strategy_type}</span><Pill>Risk: {Number(item.risk_per_trade || 0).toFixed(3)}%</Pill></div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {[{ label: "HTF", values: item.htf }, { label: "ENTRY TF", values: item.entry_tf }].map((group) => <div key={group.label} className="rounded-2xl border border-slate-200 bg-white/70 p-4"><div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{group.label}</div><div className="mt-3 flex flex-wrap gap-2">{(group.values || []).map((timeframe) => <span key={timeframe} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">{timeframe}</span>)}</div></div>)}
                    </div>
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-white/70 p-4"><div className="text-xs font-bold uppercase tracking-wide text-sky-600">Confluence</div><div className="mt-3 flex flex-wrap gap-2">{(item.bias_confluence || []).map((confluence) => <span key={confluence} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />{confluence}</span>)}</div></div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2"><FieldShell label="Checklist"><textarea readOnly rows={4} value={item.checklist || "—"} className="w-full resize-y rounded-xl border border-slate-200 bg-white/80 p-3 text-sm leading-6 text-slate-600 outline-none" /></FieldShell><FieldShell label="Entry Criteria"><textarea readOnly rows={4} value={item.entry_rules || "—"} className="w-full resize-y rounded-xl border border-slate-200 bg-white/80 p-3 text-sm leading-6 text-slate-600 outline-none" /></FieldShell></div>
                    <div className="mt-6 flex justify-end"><Button type="button" onClick={() => { setSelectedStrategy(item); setRiskPerTrade(item.risk_per_trade != null ? String(item.risk_per_trade) : "1"); setSelectedHtf([]); setSelectedEntryTf([]); }} className="h-12 rounded-2xl bg-sky-600 px-5 text-white hover:bg-sky-700"><Plus className="mr-2 h-4 w-4" /> New Opportunity</Button></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {selectedStrategy || prefillJournal ? (
          <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
            <OpportunityStepper activeSection={activeSection} />
            <div className="space-y-6">
              {!prefillJournal ? <StrategyBlueprint strategy={selectedStrategy} /> : null}
              <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="space-y-6">
                <JournalDetailsCommon
                  cfg={cfg} purpose={purposeKey} setPurpose={setPurpose} status={status} setStatus={setStatus}
                  accounts={accounts} selectedAccountId={selectedAccountId} setSelectedAccountId={handleAccountChange}
                  symbols={symbols} selectedSymbolId={selectedSymbolId} setSelectedSymbolId={setSelectedSymbolId}
                  tpItems={tpItems} setTpItems={setTpItems} direction={direction} setDirection={setDirection}
                  quantity={quantity} onQuantityChange={handleQuantityChange} applySuggestedQuantity={applySuggestedQuantity}
                  riskMode={riskMode} setRiskMode={setRiskMode} riskPerTrade={riskPerTrade} setRiskPerTrade={setRiskPerTrade}
                  strategy={activeStrategy} entryPrice={entryPrice} setEntryPrice={setEntryPrice} stopLoss={stopLoss} setStopLoss={setStopLoss}
                  setupImages={setupImages} setSetupImages={setSetupImages} referenceImages={referenceImages} setReferenceImages={setReferenceImages}
                  setupImageError={setupImageError} setSetupImageError={setSetupImageError} referenceImageError={referenceImageError} setReferenceImageError={setReferenceImageError}
                  prefillJournal={prefillJournal} existingSetupImages={existingSetupImages} setExistingSetupImages={setExistingSetupImages}
                  existingReferenceImages={existingReferenceImages} setExistingReferenceImages={setExistingReferenceImages}
                  journalStartAt={journalStartAt} setJournalStartAt={setJournalStartAt} journalEndAt={journalEndAt} setJournalEndAt={setJournalEndAt}
                  selectedHtf={selectedHtf} setSelectedHtf={setSelectedHtf} selectedEntryTf={selectedEntryTf} setSelectedEntryTf={setSelectedEntryTf}
                  selectedAccount={selectedAccount} selectedSymbol={selectedSymbol} allowedRisk={allowedRisk} estimatedLoss={estimatedLoss}
                  potentialProfit={potentialProfit} suggestedQuantity={suggestedQuantity} quantityAutoAdjusted={quantityAutoAdjusted}
                  isOverRisk={isOverRisk} calculationCurrency={calculationCurrency} conversionRate={conversionRate}
                  conversionRateDate={quoteToUsdRateDate} fxRateLoading={fxRateLoading} fxRateError={fxRateError} fxRateReady={fxRateReady}
                />
                <input type="hidden" name="strategy_id" value={selectedStrategy?.id || strategy?.id || ""} />
                {state?.message ? <div className={`rounded-2xl border p-4 text-sm ${state.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>{state.message}</div> : null}
                {uploadError ? <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{uploadError}</div> : null}
                <div className="bottom-4 z-10 rounded-3xl border bg-background/85 p-4 shadow-lg backdrop-blur">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-xl"><p className="text-sm">Save this trade plan for disciplined execution and post-trade review.</p>{isOverRisk ? <p className="mt-2 text-xs font-semibold text-red-600">This quantity is above your configured risk. You may still submit after confirming the warning.</p> : null}</div>
                    <Button type="submit" disabled={pending || uploadingImages || fxRateLoading || !fxRateReady || tpItems.length === 0 || !sumOk || !slOk || selectedHtf.length === 0 || selectedEntryTf.length === 0 || !setupImagesOk || (cfg.required?.status && !status && !prefillJournal)} className="h-11 rounded-2xl bg-sky-600 px-5 text-white hover:bg-sky-700 md:ml-auto">
                      {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isIncorporate ? "Incorporating..." : prefillJournal ? "Updating..." : "Saving..."}</> : uploadingImages ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading Images...</> : fxRateLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading FX Rate...</> : isIncorporate ? "Incorporate Opportunity" : prefillJournal ? "Update Opportunity" : "Create Opportunity"}
                    </Button>
                  </div>
                  {!slOk ? <p className="mt-3 text-xs text-destructive">Fix Stop Loss based on direction. BUY: SL &lt; Entry, SELL: SL &gt; Entry.</p> : null}
                  {cfg.required?.status && !status ? <p className="mt-3 text-xs text-destructive">Please select a status.</p> : null}
                  {!setupImagesOk ? <p className="mt-3 text-xs text-destructive">Please upload at least 1 setup image. Maximum allowed is 2.</p> : null}
                  {fxRateError ? <p className="mt-3 text-xs font-semibold text-red-600">Currency conversion failed. Quantity and risk calculations cannot be confirmed until the latest {calculationCurrency}/USD rate is available.</p> : null}
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>

      <RiskOverrideModal open={showRiskWarning} allowedRisk={allowedRisk} estimatedLoss={estimatedLoss} suggestedQuantity={suggestedQuantity} quantity={quantity} onCancel={() => setShowRiskWarning(false)} onContinue={submitDespiteRisk} />
    </>
  );
}
