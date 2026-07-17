// app/app/journals/journals-table-client.jsx

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  BookOpen,
  CircleDashed,
  Eye,
  FilePenLine,
  ImageIcon,
  Paperclip,
  Save,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import JournalDetailsModal from "../radars/journal-details-modal";

const PAGE_SIZE = 10;

const PROFIT_STATUSES = ["TRADE CLOSE WITH PROFIT"];
const LOSS_STATUSES = ["TRADE SL HIT"];
const MID_EXIT_STATUSES = ["TRADE EXIT IN MID", "ENTRY CLOSED"];

function norm(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function toNumber(value, fallback = null) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function firstValidNumber(value) {
  const values = parseArray(value);

  for (const item of values) {
    const parsed = toNumber(item);

    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function round(value, decimalPlaces = 2) {
  const parsed = toNumber(value);

  if (parsed === null) {
    return null;
  }

  const multiplier = 10 ** decimalPlaces;

  return Math.round((parsed + Number.EPSILON) * multiplier) / multiplier;
}

function ClientDate({ value }) {
  const [text, setText] = useState("—");

  useEffect(() => {
    if (!value) {
      setText("—");
      return;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      setText("—");
      return;
    }

    setText(
      new Intl.DateTimeFormat(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date),
    );
  }, [value]);

  return <span suppressHydrationWarning>{text}</span>;
}

function toDatetimeLocal(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());

  return date.toISOString().slice(0, 16);
}

function formatUsd(value) {
  const parsed = toNumber(value);

  if (parsed === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);
}

function formatCurrency(value, currency = "USD") {
  const parsed = toNumber(value);

  if (parsed === null) {
    return "—";
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: norm(currency) || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parsed);
  } catch {
    return `${parsed.toFixed(2)} ${currency || ""}`.trim();
  }
}

function formatPrice(value, decimalPlaces = null) {
  const parsed = toNumber(value);

  if (parsed === null) {
    return "—";
  }

  const decimals = toNumber(decimalPlaces);

  if (decimals !== null && decimals >= 0 && decimals <= 10) {
    return parsed.toFixed(decimals);
  }

  return String(parsed);
}

function formatRisk(journal) {
  const mode = norm(journal.risk_mode);
  const risk = toNumber(journal.risk_per_trade);

  if (risk === null) {
    return "—";
  }

  if (mode === "AMOUNT") {
    return formatUsd(risk);
  }

  return `${risk}%`;
}

function getSymbolData(journal) {
  return journal.effective_symbol || journal.symbols || {};
}

function getSymbolName(journal) {
  return (
    journal.effective_symbol?.symbol_name || journal.symbols?.symbol_name || "—"
  );
}

function getEffectiveContractSize(journal) {
  return (
    toNumber(journal.effective_contract_size) ??
    toNumber(journal.calculation?.contract_size) ??
    toNumber(journal.effective_symbol?.contract_size) ??
    toNumber(journal.symbols?.contract_size)
  );
}

function getEffectivePriceMultiplier(journal) {
  return (
    toNumber(journal.effective_price_multiplier) ??
    toNumber(journal.calculation?.price_multiplier) ??
    toNumber(journal.effective_symbol?.price_multiplier) ??
    toNumber(journal.symbols?.price_multiplier) ??
    1
  );
}

function getDecimalPlaces(journal) {
  return (
    toNumber(journal.effective_symbol?.decimal_places) ??
    toNumber(journal.symbols?.decimal_places)
  );
}

function getCalculationCurrency(journal) {
  const symbol = getSymbolData(journal);

  return norm(
    journal.calculation_currency ||
      journal.pnl_quote_currency ||
      journal.calculation?.calculation_currency ||
      journal.calculation?.quote_currency ||
      symbol.quote_currency ||
      symbol.profit_currency ||
      "USD",
  );
}

function getUsdConversionRate(journal) {
  const calculationCurrency = getCalculationCurrency(journal);

  if (!calculationCurrency || calculationCurrency === "USD") {
    return 1;
  }

  return (
    toNumber(journal.pnl_conversion_rate) ??
    toNumber(journal.quote_to_usd_rate) ??
    toNumber(journal.historical_conversion_rate) ??
    toNumber(journal.calculation?.pnl_conversion_rate) ??
    toNumber(journal.calculation?.quote_to_usd_rate) ??
    toNumber(journal.calculation?.historical_conversion_rate) ??
    null
  );
}

function getConversionDate(journal) {
  return (
    journal.pnl_conversion_date ||
    journal.calculation?.pnl_conversion_date ||
    journal.calculation?.conversion_date ||
    null
  );
}

function getOriginalStopLoss(journal) {
  return toNumber(journal.stop_loss);
}

function getModifiedStopLoss(journal) {
  return toNumber(journal.modified_sl_price);
}

function getOriginalTakeProfit(journal) {
  return firstValidNumber(journal.take_profit);
}

function getModifiedTakeProfit(journal) {
  return firstValidNumber(journal.modified_tp_price);
}

/**
 * For planned-risk calculations, the original stop loss must be used.
 *
 * Modified SL is a trade-management decision made after entry. Using it as the
 * initial risk would distort Planned RR and Actual RR.
 */
function getInitialRiskStopLoss(journal) {
  return getOriginalStopLoss(journal);
}

/**
 * For planned reward, original TP should be used.
 *
 * Modified TP is used only when the trade actually exits at MODIFIED_TP.
 */
function getPlannedTakeProfit(journal) {
  return getOriginalTakeProfit(journal);
}

function getDisplayedStopLoss(journal) {
  const modified = getModifiedStopLoss(journal);

  if (modified !== null) {
    return modified;
  }

  return getOriginalStopLoss(journal);
}

function getDisplayedTakeProfit(journal) {
  const modified = getModifiedTakeProfit(journal);

  if (modified !== null) {
    return modified;
  }

  return getOriginalTakeProfit(journal);
}

function getExitPriceFromCheckpoint(journal) {
  const entryPrice = toNumber(journal.entry_price);
  const status = norm(journal.status);
  const checkpoint = norm(journal.exit_checkpoint);

  if (LOSS_STATUSES.includes(status)) {
    if (checkpoint === "ACTUAL_SL") {
      return getOriginalStopLoss(journal);
    }

    if (checkpoint === "MODIFIED_SL") {
      return getModifiedStopLoss(journal) ?? getOriginalStopLoss(journal);
    }

    if (checkpoint === "SL_BREAKEVEN") {
      return entryPrice;
    }
  }

  if (PROFIT_STATUSES.includes(status)) {
    if (checkpoint === "ACTUAL_TP") {
      return getOriginalTakeProfit(journal);
    }

    if (checkpoint === "MODIFIED_TP") {
      return getModifiedTakeProfit(journal) ?? getOriginalTakeProfit(journal);
    }

    if (checkpoint === "TP_BREAKEVEN") {
      return entryPrice;
    }
  }

  return null;
}

function getEffectiveExitPrice(journal) {
  /*
   * exit_price is the strongest source because your server action already
   * stores the actual price selected from ACTUAL_SL, MODIFIED_SL, ACTUAL_TP,
   * MODIFIED_TP, breakeven or manual mid-exit price.
   */
  const savedExitPrice = toNumber(journal.exit_price);

  if (savedExitPrice !== null) {
    return savedExitPrice;
  }

  const checkpointExitPrice = getExitPriceFromCheckpoint(journal);

  if (checkpointExitPrice !== null) {
    return checkpointExitPrice;
  }

  const status = norm(journal.status);

  if (LOSS_STATUSES.includes(status)) {
    return getOriginalStopLoss(journal);
  }

  if (PROFIT_STATUSES.includes(status)) {
    return getOriginalTakeProfit(journal);
  }

  return null;
}

function calculateInstrumentAmount({
  direction,
  entryPrice,
  targetPrice,
  lotSize,
  contractSize,
  priceMultiplier = 1,
}) {
  const entry = toNumber(entryPrice);
  const target = toNumber(targetPrice);
  const lots = toNumber(lotSize);
  const contract = toNumber(contractSize);
  const multiplier = toNumber(priceMultiplier, 1);

  if (
    entry === null ||
    target === null ||
    lots === null ||
    contract === null ||
    multiplier === null ||
    lots <= 0 ||
    contract <= 0 ||
    multiplier <= 0
  ) {
    return null;
  }

  const normalizedDirection = norm(direction);

  if (!["BUY", "SELL"].includes(normalizedDirection)) {
    return null;
  }

  const signedPriceMovement =
    normalizedDirection === "BUY" ? target - entry : entry - target;

  return signedPriceMovement * contract * lots * multiplier;
}

function convertInstrumentAmountToUsd(journal, amount) {
  const parsedAmount = toNumber(amount);

  if (parsedAmount === null) {
    return null;
  }

  const conversionRate = getUsdConversionRate(journal);

  if (conversionRate === null || conversionRate <= 0) {
    return null;
  }

  return parsedAmount * conversionRate;
}

function getInitialRiskInstrumentAmount(journal) {
  const serverValue =
    toNumber(journal.calculated_risk_instrument_currency) ??
    toNumber(journal.calculation?.risk_instrument_currency);

  if (serverValue !== null) {
    return Math.abs(serverValue);
  }

  const amount = calculateInstrumentAmount({
    direction: journal.direction,
    entryPrice: journal.entry_price,
    targetPrice: getInitialRiskStopLoss(journal),
    lotSize: journal.quantity,
    contractSize: getEffectiveContractSize(journal),
    priceMultiplier: getEffectivePriceMultiplier(journal),
  });

  return amount === null ? null : Math.abs(amount);
}

function getRewardInstrumentAmount(journal) {
  const serverValue =
    toNumber(journal.calculated_reward_instrument_currency) ??
    toNumber(journal.calculation?.reward_instrument_currency);

  if (serverValue !== null) {
    return Math.abs(serverValue);
  }

  const amount = calculateInstrumentAmount({
    direction: journal.direction,
    entryPrice: journal.entry_price,
    targetPrice: getPlannedTakeProfit(journal),
    lotSize: journal.quantity,
    contractSize: getEffectiveContractSize(journal),
    priceMultiplier: getEffectivePriceMultiplier(journal),
  });

  return amount === null ? null : Math.abs(amount);
}

function getProfitLossInstrumentAmount(journal) {
  const serverValue =
    toNumber(journal.profit_loss_instrument_currency) ??
    toNumber(journal.calculation?.profit_loss_instrument_currency) ??
    toNumber(journal.calculation?.gross_profit_loss);

  if (serverValue !== null) {
    return serverValue;
  }

  return calculateInstrumentAmount({
    direction: journal.direction,
    entryPrice: journal.entry_price,
    targetPrice: getEffectiveExitPrice(journal),
    lotSize: journal.quantity,
    contractSize: getEffectiveContractSize(journal),
    priceMultiplier: getEffectivePriceMultiplier(journal),
  });
}

function getRiskUsd(journal) {
  const serverValue =
    toNumber(journal.calculated_risk_usd) ??
    toNumber(journal.calculation?.calculated_risk_usd) ??
    toNumber(journal.calculation?.risk_usd);

  if (serverValue !== null) {
    return Math.abs(serverValue);
  }

  const amount = getInitialRiskInstrumentAmount(journal);
  const converted = convertInstrumentAmountToUsd(journal, amount);

  return converted === null ? null : Math.abs(converted);
}

function getRewardUsd(journal) {
  const serverValue =
    toNumber(journal.calculated_reward_usd) ??
    toNumber(journal.calculation?.calculated_reward_usd) ??
    toNumber(journal.calculation?.reward_usd);

  if (serverValue !== null) {
    return Math.abs(serverValue);
  }

  const amount = getRewardInstrumentAmount(journal);
  const converted = convertInstrumentAmountToUsd(journal, amount);

  return converted === null ? null : Math.abs(converted);
}

function getProfitLossUsd(journal) {
  /*
   * Broker-reported P&L must have the highest priority because it may include
   * the broker's exact historical conversion rate.
   */
  const serverCalculated =
    toNumber(journal.broker_profit_loss_usd) ??
    toNumber(journal.calculated_profit_loss_usd) ??
    toNumber(journal.profit_loss_usd) ??
    toNumber(journal.calculation?.broker_profit_loss_usd) ??
    toNumber(journal.calculation?.calculated_profit_loss_usd) ??
    toNumber(journal.calculation?.profit_loss_usd);

  if (serverCalculated !== null) {
    return serverCalculated;
  }

  const instrumentAmount = getProfitLossInstrumentAmount(journal);

  return convertInstrumentAmountToUsd(journal, instrumentAmount);
}

function getPlannedRRNumber(journal) {
  const serverValue =
    toNumber(journal.calculated_planned_rr) ??
    toNumber(journal.calculation?.calculated_planned_rr) ??
    toNumber(journal.calculation?.planned_rr);

  if (serverValue !== null) {
    return serverValue;
  }

  /*
   * Currency conversion is deliberately not used here.
   *
   * Both risk and reward are denominated in the same quote currency, so the
   * conversion rate cancels out.
   */
  const risk = getInitialRiskInstrumentAmount(journal);
  const reward = getRewardInstrumentAmount(journal);

  if (risk === null || reward === null || risk <= 0) {
    return null;
  }

  return reward / risk;
}

function getActualRRNumber(journal) {
  const serverValue =
    toNumber(journal.calculated_r_multiple) ??
    toNumber(journal.calculation?.calculated_r_multiple) ??
    toNumber(journal.calculation?.r_multiple);

  if (serverValue !== null) {
    return serverValue;
  }

  /*
   * Actual R is based on original entry risk, not modified SL.
   *
   * Example:
   * Entry: 0.98647
   * Initial SL: 0.99700
   * Exit: 0.98125
   *
   * Actual R:
   * 0.00522 / 0.01053 = approximately +0.50R
   */
  const initialRisk = getInitialRiskInstrumentAmount(journal);
  const profitLoss = getProfitLossInstrumentAmount(journal);

  if (initialRisk === null || profitLoss === null || initialRisk <= 0) {
    return null;
  }

  return profitLoss / initialRisk;
}

function getPlannedRR(journal) {
  const value = getPlannedRRNumber(journal);

  if (value === null) {
    return "—";
  }

  return `${value.toFixed(2)}R`;
}

function getActualRR(journal) {
  const value = getActualRRNumber(journal);

  if (value === null) {
    return "—";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(2)}R`;
}

function ProfitLossValue({ journal }) {
  const profitLossUsd = getProfitLossUsd(journal);
  const instrumentAmount = getProfitLossInstrumentAmount(journal);
  const calculationCurrency = getCalculationCurrency(journal);
  const conversionRate = getUsdConversionRate(journal);
  const conversionDate = getConversionDate(journal);

  if (profitLossUsd === null) {
    if (
      instrumentAmount !== null &&
      calculationCurrency &&
      calculationCurrency !== "USD"
    ) {
      return (
        <div className="min-w-[145px] text-right">
          <div className="font-bold text-slate-700">
            {formatCurrency(instrumentAmount, calculationCurrency)}
          </div>

          <div className="mt-1 text-[10px] font-bold text-amber-600">
            USD rate required
          </div>
        </div>
      );
    }

    return <span className="text-slate-400">—</span>;
  }

  const isProfit = profitLossUsd > 0;
  const isLoss = profitLossUsd < 0;

  return (
    <div className="min-w-[140px] text-right">
      <div
        className={`inline-flex min-w-[115px] items-center justify-end rounded-xl px-3 py-2 font-bold ${
          isProfit
            ? "bg-emerald-50 text-emerald-700"
            : isLoss
              ? "bg-red-50 text-red-700"
              : "bg-slate-100 text-slate-600"
        }`}
      >
        {isProfit ? "+" : ""}
        {formatUsd(profitLossUsd)}
      </div>

      {calculationCurrency !== "USD" && conversionRate !== null ? (
        <div className="mt-1 text-[10px] font-semibold text-slate-400">
          {calculationCurrency} → USD @ {round(conversionRate, 6)}
          {conversionDate ? ` • ${conversionDate}` : ""}
        </div>
      ) : null}
    </div>
  );
}

function getTradeStatusBadge(status) {
  const normalizedStatus = norm(status);

  if (normalizedStatus === "TRADE CLOSE WITH PROFIT") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalizedStatus === "TRADE SL HIT") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    normalizedStatus === "TRADE EXIT IN MID" ||
    normalizedStatus === "ENTRY CLOSED"
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (
    normalizedStatus === "ENTRY MISSED" ||
    normalizedStatus === "ENTRY CANCELLED"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
}

function getAftermathLabel(value) {
  const normalizedValue = norm(value);

  if (normalizedValue === "OPTIMAL_TRADE_CLOSE") {
    return "Optimal Trade Close";
  }

  if (normalizedValue === "ACTUAL_TP_HIT") {
    return "Actual TP Hit";
  }

  if (normalizedValue === "ACTUAL_SL_NOT_HIT") {
    return "Actual SL Not Hit";
  }

  if (normalizedValue === "NA") {
    return "N/A";
  }

  return "Not added";
}

function AftermathDetails({ journal }) {
  const hasAftermath =
    journal.aftermath_result ||
    journal.aftermath_date ||
    journal.aftermath_user_note ||
    journal.aftermath_mentor_note;

  if (!hasAftermath) return null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 text-sm font-bold text-slate-950">Aftermath</div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Status
          </div>

          <div className="mt-2 text-sm font-bold text-slate-900">
            {getAftermathLabel(journal.aftermath_result)}
          </div>
        </div>

        {journal.aftermath_date ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Aftermath Date
            </div>

            <div className="mt-2 text-sm font-semibold text-slate-800">
              <ClientDate value={journal.aftermath_date} />
            </div>
          </div>
        ) : null}

        {journal.aftermath_user_note ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              User Aftermath Note
            </div>

            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {journal.aftermath_user_note}
            </div>
          </div>
        ) : null}

        {journal.aftermath_mentor_note ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Mentor Aftermath Note
            </div>

            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {journal.aftermath_mentor_note}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AftermathModal({ journal, onClose, onSaved }) {
  const [result, setResult] = useState(journal.aftermath_result || "");
  const [images, setImages] = useState([]);
  const [date, setDate] = useState(toDatetimeLocal(journal.aftermath_date));
  const [userNote, setUserNote] = useState(journal.aftermath_user_note || "");
  const [mentorNote, setMentorNote] = useState(
    journal.aftermath_mentor_note || "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const showDate = result === "ACTUAL_TP_HIT" || result === "ACTUAL_SL_NOT_HIT";

  async function saveAftermath() {
    setSaving(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append("journalId", journal.id);
      formData.append("aftermath_result", result);
      formData.append("aftermath_date", showDate ? date : "");
      formData.append("aftermath_user_note", userNote);
      formData.append("aftermath_mentor_note", mentorNote);

      images.forEach((file) => {
        formData.append("aftermath_images", file);
      });

      const response = await fetch("/api/journals/aftermath", {
        method: "PATCH",
        body: formData,
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        setError(json.message || "Failed to save aftermath.");
        return;
      }

      onSaved(journal.id, json.journal);
      onClose();
    } catch {
      setError("Failed to save aftermath.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <div className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-600">
              AFTERMATH
            </div>

            <h2 className="mt-3 text-2xl font-bold text-slate-950">
              {journal.strategy_snapshot?.strategy_name || "Journal"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Capture what happened after closing this trade.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2.5 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-6 overflow-y-auto p-6">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ["OPTIMAL_TRADE_CLOSE", "Optimal Trade Close"],
              ["ACTUAL_TP_HIT", "Actual TP Hit"],
              ["ACTUAL_SL_NOT_HIT", "Actual SL Not Hit"],
              ["NA", "N/A"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setResult(value)}
                className={`rounded-2xl border p-4 text-left text-sm font-bold transition ${
                  result === value
                    ? "border-sky-500 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {showDate ? (
            <div>
              <label className="text-sm font-bold text-slate-900">
                Aftermath Date & Time
              </label>

              <input
                type="datetime-local"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-slate-900">
                User Aftermath Note
              </label>

              <textarea
                rows={5}
                value={userNote}
                onChange={(event) => setUserNote(event.target.value)}
                placeholder="Optional user note..."
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-white p-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-900">
                Mentor Aftermath Note
              </label>

              <textarea
                rows={5}
                value={mentorNote}
                onChange={(event) => setMentorNote(event.target.value)}
                placeholder="Optional mentor note..."
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-white p-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-900">
              Aftermath Images{" "}
              <span className="font-semibold text-slate-400">
                (optional, max 2)
              </span>
            </label>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files || []).slice(0, 2);
                setImages(files);
              }}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:text-sm file:font-bold file:text-sky-700 hover:file:bg-sky-100 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />

            {images.length ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {images.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  >
                    <span className="truncate font-semibold text-slate-700">
                      {file.name}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setImages((previous) =>
                          previous.filter(
                            (_, imageIndex) => imageIndex !== index,
                          ),
                        )
                      }
                      className="shrink-0 rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 hover:text-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end border-t border-slate-100 pt-5">
            <button
              type="button"
              disabled={saving || !result}
              onClick={saveAftermath}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-sky-600 px-6 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Aftermath"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClosedEvidenceModal({ journal, onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  function handleFileChange(event) {
    const selected = event.target.files?.[0] || null;

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : "");
    setError("");
  }

  async function saveEvidence() {
    if (!file) {
      setError("Please choose an image.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append("journalId", journal.id);
      formData.append("closed_evidence_image", file);

      const response = await fetch("/api/journals/closed-evidence", {
        method: "PATCH",
        body: formData,
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        setError(json.message || "Failed to upload evidence.");
        return;
      }

      onSaved(journal.id, json.journal);
      onClose();
    } catch {
      setError("Failed to upload evidence.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <div className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-sky-600">
              Closed Evidence
            </div>

            <h3 className="mt-3 text-2xl font-black text-slate-950">
              Upload close proof
            </h3>

            <p className="mt-1 text-sm font-medium text-slate-500">
              Add one screenshot/image as evidence for this closed trade.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center transition hover:border-sky-300 hover:bg-sky-50/50">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <BookOpen className="h-7 w-7 text-sky-600" />
            </div>

            <p className="mt-4 text-sm font-black text-slate-900">
              Click to choose image
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              PNG, JPG, JPEG or WEBP
            </p>
          </label>

          {preview ? (
            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
              <img
                src={preview}
                alt="Closed evidence preview"
                className="max-h-[360px] w-full object-contain"
              />
            </div>
          ) : null}

          {file ? (
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
              <span className="truncate font-bold text-slate-700">
                {file.name}
              </span>

              <button
                type="button"
                onClick={() => {
                  if (preview) {
                    URL.revokeObjectURL(preview);
                  }

                  setFile(null);
                  setPreview("");
                }}
                className="shrink-0 rounded-full border border-slate-200 p-1.5 text-slate-500 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-600">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={saving || !file}
              onClick={saveEvidence}
              className="h-11 rounded-2xl bg-sky-600 px-5 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Uploading..." : "Save Evidence"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JournalsTableClient({ journals, activeTab }) {
  const [items, setItems] = useState(journals);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [editingJournal, setEditingJournal] = useState(null);
  const [editingEvidenceJournal, setEditingEvidenceJournal] = useState(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;

    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  useEffect(() => {
    setItems(journals);
    setSelectedJournal(null);
    setEditingJournal(null);
    setEditingEvidenceJournal(null);
    setPage(1);
  }, [journals]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function handleSaved(journalId, updated) {
    setItems((previous) =>
      previous.map((item) =>
        item.id === journalId
          ? {
              ...item,
              ...updated,
            }
          : item,
      ),
    );

    setSelectedJournal((previous) => {
      if (!previous || previous.id !== journalId) {
        return previous;
      }

      return {
        ...previous,
        ...updated,
      };
    });
  }

  if (!items.length) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-12 text-center shadow-sm backdrop-blur-xl">
        <CircleDashed className="mx-auto h-11 w-11 text-slate-300" />

        <h3 className="mt-4 text-lg font-bold text-slate-950">
          No journals found
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Closed, missed and cancelled trades will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1550px] text-left text-sm">
            <thead className="bg-[#f3f7fb] text-xs text-slate-500">
              <tr>
                <th className="sticky left-0 z-30 border-r bg-[#f3f7fb] px-5 py-4 font-bold">
                  <span className="inline-flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-slate-400" />
                    Strategy
                  </span>
                </th>

                <th className="px-5 py-4 font-bold">Account</th>
                <th className="px-5 py-4 font-bold">Initial Risk</th>

                {activeTab === "closed" ? (
                  <>
                    <th className="px-5 py-4 font-bold">Planned RR</th>
                    <th className="px-5 py-4 font-bold">Actual RR</th>
                    <th className="px-5 py-4 text-right font-bold">P&amp;L</th>
                  </>
                ) : null}

                <th className="px-5 py-4 font-bold">
                  <span className="inline-flex items-center gap-1">
                    Timeframe
                    <ArrowDownUp className="h-3.5 w-3.5" />
                  </span>
                </th>

                <th className="px-5 py-4 font-bold">Market</th>
                <th className="px-5 py-4 font-bold">Action</th>
                <th className="px-5 py-4 font-bold">Entry</th>
                <th className="px-5 py-4 font-bold">Stop loss</th>
                <th className="px-5 py-4 font-bold">Take profit</th>
                <th className="px-5 py-4 font-bold">Exit price</th>
                <th className="px-5 py-4 font-bold">Close time</th>
                <th className="px-5 py-4 font-bold">Trade Status</th>

                {activeTab === "closed" ? (
                  <th className="px-5 py-4 font-bold">Closed Evidence</th>
                ) : null}

                <th className="sticky right-0 z-30 border-l bg-[#f3f7fb] px-5 py-4 text-center font-bold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedItems.map((journal) => {
                const strategyName =
                  journal.strategy_snapshot?.strategy_name || "No Strategy";

                const isBuy = norm(journal.direction) === "BUY";
                const decimalPlaces = getDecimalPlaces(journal);

                const displayedStopLoss = getDisplayedStopLoss(journal);
                const displayedTakeProfit = getDisplayedTakeProfit(journal);
                const effectiveExitPrice = getEffectiveExitPrice(journal);

                const hasModifiedStopLoss =
                  getModifiedStopLoss(journal) !== null;

                const hasModifiedTakeProfit =
                  getModifiedTakeProfit(journal) !== null;

                return (
                  <tr
                    key={journal.id}
                    className="text-slate-700 transition hover:bg-sky-50/60"
                  >
                    <td className="sticky left-0 z-20 border-r bg-white px-5 py-4">
                      <div className="max-w-[190px] truncate font-bold text-slate-900">
                        {strategyName}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {journal.quantity ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="max-w-[160px] truncate font-semibold text-slate-700">
                        {journal.trading_accounts?.account_name || "—"}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold">
                      {formatRisk(journal)}
                    </td>

                    {activeTab === "closed" ? (
                      <>
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {getPlannedRR(journal)}
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {getActualRR(journal)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <ProfitLossValue journal={journal} />
                        </td>
                      </>
                    ) : null}

                    <td className="px-5 py-4 font-medium">
                      {parseArray(journal.entry_tf)[0] || "—"}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {getSymbolName(journal)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${
                          isBuy
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {isBuy ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}

                        {isBuy ? "Buy" : "Sell"}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {formatPrice(journal.entry_price, decimalPlaces)}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      <div>{formatPrice(displayedStopLoss, decimalPlaces)}</div>

                      {hasModifiedStopLoss ? (
                        <div className="mt-1 text-[11px] font-bold text-violet-600">
                          Modified
                        </div>
                      ) : null}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      <div>
                        {formatPrice(displayedTakeProfit, decimalPlaces)}
                      </div>

                      {hasModifiedTakeProfit ? (
                        <div className="mt-1 text-[11px] font-bold text-violet-600">
                          Modified
                        </div>
                      ) : null}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {formatPrice(effectiveExitPrice, decimalPlaces)}
                    </td>

                    <td className="px-5 py-4 font-medium">
                      <ClientDate value={journal.journal_end_at} />
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${getTradeStatusBadge(
                          journal.status,
                        )}`}
                      >
                        {journal.status || "—"}
                      </span>
                    </td>

                    {activeTab === "closed" ? (
                      <td className="px-5 py-4">
                        <div className="flex justify-center">
                          {journal.closedEvidenceImageUrl ? (
                            <button
                              type="button"
                              onClick={() => setSelectedJournal(journal)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
                              title="View closed evidence"
                            >
                              <ImageIcon className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingEvidenceJournal(journal)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600"
                              title="Upload closed evidence"
                            >
                              <Paperclip className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    ) : null}

                    <td className="sticky right-0 z-20 border-l bg-white px-5 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedJournal(journal)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-sky-300 hover:text-sky-600"
                          title="View journal"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingJournal(journal)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-600 shadow-sm hover:bg-sky-100"
                          title="Edit aftermath"
                        >
                          <FilePenLine className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {items.length > PAGE_SIZE ? (
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-500">
            Showing{" "}
            <span className="font-bold text-slate-900">
              {(page - 1) * PAGE_SIZE + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-slate-900">
              {Math.min(page * PAGE_SIZE, items.length)}
            </span>{" "}
            of <span className="font-bold text-slate-900">{items.length}</span>{" "}
            journals
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
              Page {page} of {totalPages}
            </div>

            <button
              type="button"
              disabled={page === totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      <JournalDetailsModal
        journal={selectedJournal}
        onClose={() => setSelectedJournal(null)}
        afterContent={
          selectedJournal ? (
            <AftermathDetails journal={selectedJournal} />
          ) : null
        }
      />

      {editingJournal ? (
        <AftermathModal
          journal={editingJournal}
          onClose={() => setEditingJournal(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {editingEvidenceJournal ? (
        <ClosedEvidenceModal
          journal={editingEvidenceJournal}
          onClose={() => setEditingEvidenceJournal(null)}
          onSaved={handleSaved}
        />
      ) : null}
    </>
  );
}
