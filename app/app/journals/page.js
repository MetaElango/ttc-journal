// app/app/journals/page.js

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Target } from "lucide-react";
import JournalsFilterShell from "./journals-filter-shell";

const VIEWS = [
  { key: "my", label: "My Journals" },
  { key: "incorporated", label: "Incorporated Journals" },
];

const TABS = [
  { key: "closed", label: "Closed" },
  { key: "missed", label: "Missed" },
  { key: "cancelled", label: "Cancelled" },
];

const CLOSED_STATUSES = [
  "TRADE SL HIT",
  "TRADE CLOSE WITH PROFIT",
  "TRADE EXIT IN MID",
  "ENTRY CLOSED",
];

const MISSED_STATUSES = ["ENTRY MISSED"];
const CANCELLED_STATUSES = ["ENTRY CANCELLED"];

const PROFIT_STATUSES = ["TRADE CLOSE WITH PROFIT"];
const LOSS_STATUSES = ["TRADE SL HIT"];

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

function round(value, decimalPlaces = 2) {
  const parsed = toNumber(value);

  if (parsed === null) {
    return null;
  }

  const multiplier = 10 ** decimalPlaces;

  return Math.round((parsed + Number.EPSILON) * multiplier) / multiplier;
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

function getJournalTab(journal) {
  const status = norm(journal.status);

  if (CLOSED_STATUSES.includes(status)) return "closed";
  if (MISSED_STATUSES.includes(status)) return "missed";
  if (CANCELLED_STATUSES.includes(status)) return "cancelled";

  return null;
}

function getOverrideKey(tradingAccountId, symbolId) {
  return `${tradingAccountId || ""}:${symbolId || ""}`;
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

  const signedMovement =
    normalizedDirection === "BUY" ? target - entry : entry - target;

  return signedMovement * contract * lots * multiplier;
}

function calculatePoints({ direction, entryPrice, targetPrice, tickSize }) {
  const entry = toNumber(entryPrice);
  const target = toNumber(targetPrice);
  const tick = toNumber(tickSize);

  if (entry === null || target === null || tick === null || tick <= 0) {
    return null;
  }

  const normalizedDirection = norm(direction);

  if (!["BUY", "SELL"].includes(normalizedDirection)) {
    return null;
  }

  const signedMovement =
    normalizedDirection === "BUY" ? target - entry : entry - target;

  return signedMovement / tick;
}

/**
 * Forex P&L from:
 *
 * price movement × contract size × lots
 *
 * is initially expressed in the pair's quote currency.
 *
 * Examples:
 * EURUSD -> USD
 * AUDCAD -> CAD
 * GBPJPY -> JPY
 *
 * For non-Forex instruments, profit_currency is preferred because a broker
 * may define the contract to settle directly in USD even when the displayed
 * instrument is associated with another market currency.
 */
function getCalculationCurrency(symbol) {
  const assetClass = norm(symbol?.asset_class);

  if (assetClass === "FOREX") {
    return norm(symbol?.quote_currency || "USD");
  }

  return norm(symbol?.profit_currency || symbol?.quote_currency || "USD");
}

function getTradeConversionDate(journal) {
  const rawDate =
    journal.journal_end_at || journal.updated_at || journal.created_at;

  if (!rawDate) {
    return null;
  }

  const date = new Date(rawDate);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function convertToUsd(amount, conversionRate) {
  const parsedAmount = toNumber(amount);
  const rate = toNumber(conversionRate);

  if (parsedAmount === null || rate === null || rate <= 0) {
    return null;
  }

  return parsedAmount * rate;
}

async function fetchHistoricalUsdRate(currency, date) {
  const fromCurrency = norm(currency);

  if (!fromCurrency || fromCurrency === "USD") {
    return {
      rate: 1,
      rateDate: date,
    };
  }

  if (!date) {
    return {
      rate: null,
      rateDate: null,
    };
  }

  try {
    const url =
      `https://api.frankfurter.dev/v1/${encodeURIComponent(date)}` +
      `?base=${encodeURIComponent(fromCurrency)}` +
      `&symbols=USD`;

    const response = await fetch(url, {
      cache: "force-cache",
      next: {
        revalidate: 60 * 60 * 24 * 30,
      },
    });

    if (!response.ok) {
      console.error(
        `Historical FX request failed for ${fromCurrency}/USD on ${date}:`,
        response.status,
      );

      return {
        rate: null,
        rateDate: null,
      };
    }

    const json = await response.json();
    const rate = toNumber(json?.rates?.USD);

    return {
      rate,
      rateDate: json?.date || date,
    };
  } catch (error) {
    console.error(
      `Historical FX request error for ${fromCurrency}/USD on ${date}:`,
      error,
    );

    return {
      rate: null,
      rateDate: null,
    };
  }
}

async function createHistoricalRateMap(journals = []) {
  const uniqueRequests = new Map();

  for (const journal of journals) {
    const currency = getCalculationCurrency(journal.effective_symbol);
    const date = getTradeConversionDate(journal);

    if (!currency || currency === "USD" || !date) {
      continue;
    }

    const key = `${currency}:${date}`;

    if (!uniqueRequests.has(key)) {
      uniqueRequests.set(key, {
        currency,
        date,
      });
    }
  }

  const entries = await Promise.all(
    Array.from(uniqueRequests.entries()).map(async ([key, request]) => {
      const result = await fetchHistoricalUsdRate(
        request.currency,
        request.date,
      );

      return [key, result];
    }),
  );

  return new Map(entries);
}

function calculateJournalMetrics(
  journal,
  effectiveSymbol,
  conversionDetails = null,
) {
  const entryPrice = toNumber(journal.entry_price);
  const exitPrice = getEffectiveExitPrice(journal);

  /*
   * Initial risk always uses the original SL.
   * Moving SL later must not change the original R denominator.
   */
  const initialStopLoss = getOriginalStopLoss(journal);

  /*
   * Planned reward always uses the original first TP.
   * Modified TP represents later trade management.
   */
  const plannedTakeProfit = getOriginalTakeProfit(journal);

  const lotSize = toNumber(journal.quantity);
  const contractSize = toNumber(effectiveSymbol?.contract_size);
  const leverage = toNumber(effectiveSymbol?.leverage);
  const tickSize = toNumber(effectiveSymbol?.tick_size);
  const priceMultiplier = toNumber(effectiveSymbol?.price_multiplier) ?? 1;

  const calculationCurrency = getCalculationCurrency(effectiveSymbol);

  const conversionRate =
    calculationCurrency === "USD" ? 1 : toNumber(conversionDetails?.rate);

  const conversionDate =
    calculationCurrency === "USD"
      ? getTradeConversionDate(journal)
      : conversionDetails?.rateDate || null;

  const profitLossInstrumentCurrency = calculateInstrumentAmount({
    direction: journal.direction,
    entryPrice,
    targetPrice: exitPrice,
    lotSize,
    contractSize,
    priceMultiplier,
  });

  const riskInstrumentCurrencyRaw = calculateInstrumentAmount({
    direction: journal.direction,
    entryPrice,
    targetPrice: initialStopLoss,
    lotSize,
    contractSize,
    priceMultiplier,
  });

  const rewardInstrumentCurrencyRaw = calculateInstrumentAmount({
    direction: journal.direction,
    entryPrice,
    targetPrice: plannedTakeProfit,
    lotSize,
    contractSize,
    priceMultiplier,
  });

  const riskInstrumentCurrency =
    riskInstrumentCurrencyRaw === null
      ? null
      : Math.abs(riskInstrumentCurrencyRaw);

  const rewardInstrumentCurrency =
    rewardInstrumentCurrencyRaw === null
      ? null
      : Math.abs(rewardInstrumentCurrencyRaw);

  const profitLossUsd = convertToUsd(
    profitLossInstrumentCurrency,
    conversionRate,
  );

  const riskUsd = convertToUsd(riskInstrumentCurrency, conversionRate);

  const rewardUsd = convertToUsd(rewardInstrumentCurrency, conversionRate);

  /*
   * R calculations do not require currency conversion because the numerator
   * and denominator are in the same instrument currency.
   */
  const rMultiple =
    profitLossInstrumentCurrency !== null &&
    riskInstrumentCurrency !== null &&
    riskInstrumentCurrency > 0
      ? profitLossInstrumentCurrency / riskInstrumentCurrency
      : null;

  const plannedRiskReward =
    rewardInstrumentCurrency !== null &&
    riskInstrumentCurrency !== null &&
    riskInstrumentCurrency > 0
      ? rewardInstrumentCurrency / riskInstrumentCurrency
      : null;

  const accountSize = toNumber(journal.trading_accounts?.account_size);

  const riskPercent =
    riskUsd !== null && accountSize !== null && accountSize > 0
      ? (riskUsd / accountSize) * 100
      : null;

  const signedPriceMovement =
    entryPrice !== null && exitPrice !== null
      ? norm(journal.direction) === "BUY"
        ? exitPrice - entryPrice
        : entryPrice - exitPrice
      : null;

  const pointsOrTicks = calculatePoints({
    direction: journal.direction,
    entryPrice,
    targetPrice: exitPrice,
    tickSize,
  });

  /*
   * Notional is expressed in the symbol's quote/settlement currency first.
   * It is converted to USD only when a conversion rate exists.
   */
  const notionalInstrumentCurrency =
    entryPrice !== null &&
    lotSize !== null &&
    contractSize !== null &&
    priceMultiplier !== null
      ? entryPrice * lotSize * contractSize * priceMultiplier
      : null;

  const notionalValueUsd = convertToUsd(
    notionalInstrumentCurrency,
    conversionRate,
  );

  const requiredMarginUsd =
    notionalValueUsd !== null && leverage !== null && leverage > 0
      ? notionalValueUsd / leverage
      : null;

  return {
    calculation_currency: calculationCurrency,
    quote_currency: norm(effectiveSymbol?.quote_currency),
    profit_currency: norm(effectiveSymbol?.profit_currency),

    pnl_conversion_rate: conversionRate,
    pnl_conversion_date: conversionDate,

    lot_size: lotSize,
    contract_size: contractSize,
    leverage,
    tick_size: tickSize,
    price_multiplier: priceMultiplier,

    effective_exit_price: exitPrice,
    original_stop_loss: initialStopLoss,
    original_take_profit: plannedTakeProfit,

    price_movement:
      signedPriceMovement !== null ? round(signedPriceMovement, 10) : null,

    points_or_ticks: pointsOrTicks !== null ? round(pointsOrTicks, 2) : null,

    profit_loss_instrument_currency:
      profitLossInstrumentCurrency !== null
        ? round(profitLossInstrumentCurrency, 8)
        : null,

    risk_instrument_currency:
      riskInstrumentCurrency !== null ? round(riskInstrumentCurrency, 8) : null,

    reward_instrument_currency:
      rewardInstrumentCurrency !== null
        ? round(rewardInstrumentCurrency, 8)
        : null,

    profit_loss_usd: profitLossUsd !== null ? round(profitLossUsd, 2) : null,

    risk_usd: riskUsd !== null ? round(riskUsd, 2) : null,

    reward_usd: rewardUsd !== null ? round(rewardUsd, 2) : null,

    risk_percent: riskPercent !== null ? round(riskPercent, 2) : null,

    r_multiple: rMultiple !== null ? round(rMultiple, 4) : null,

    planned_risk_reward:
      plannedRiskReward !== null ? round(plannedRiskReward, 4) : null,

    notional_instrument_currency:
      notionalInstrumentCurrency !== null
        ? round(notionalInstrumentCurrency, 8)
        : null,

    notional_value_usd:
      notionalValueUsd !== null ? round(notionalValueUsd, 2) : null,

    required_margin_usd:
      requiredMarginUsd !== null ? round(requiredMarginUsd, 2) : null,
  };
}

async function getSignedImageUrls(supabase, paths = []) {
  const normalizedPaths = parseArray(paths);

  if (normalizedPaths.length === 0) {
    return [];
  }

  const { data, error } = await supabase.storage
    .from("journal-images")
    .createSignedUrls(normalizedPaths, 60 * 60);

  if (error) {
    console.error("Failed to create signed image URLs:", error);
    return [];
  }

  return data?.map((item) => item.signedUrl).filter(Boolean) || [];
}

async function attachImageUrls(supabase, journals = []) {
  return Promise.all(
    journals.map(async (journal) => {
      const setupImageUrls = await getSignedImageUrls(
        supabase,
        journal.setup_images,
      );

      const referenceImageUrls = await getSignedImageUrls(
        supabase,
        journal.reference_images,
      );

      const aftermathImageUrls = await getSignedImageUrls(
        supabase,
        journal.aftermath_images,
      );

      let closedEvidenceImageUrl = "";

      if (journal.closed_evidence_image) {
        const { data, error } = await supabase.storage
          .from("journal-images")
          .createSignedUrl(journal.closed_evidence_image, 60 * 60);

        if (!error) {
          closedEvidenceImageUrl = data?.signedUrl || "";
        }
      }

      return {
        ...journal,
        setup_images: parseArray(journal.setup_images),
        reference_images: parseArray(journal.reference_images),
        aftermath_images: parseArray(journal.aftermath_images),
        take_profit: parseArray(journal.take_profit),
        take_profit_qty: parseArray(journal.take_profit_qty),
        modified_tp_price: parseArray(journal.modified_tp_price),
        modified_tp_qty: parseArray(journal.modified_tp_qty),
        htf: parseArray(journal.htf),
        entry_tf: parseArray(journal.entry_tf),

        setupImageUrls,
        referenceImageUrls,
        aftermathImageUrls,
        closedEvidenceImageUrl,
      };
    }),
  );
}

export default async function JournalsPage({ searchParams }) {
  const params = await searchParams;

  const requestedView = params?.view || "my";
  const requestedTab = params?.tab || "closed";

  const activeView = VIEWS.some((item) => item.key === requestedView)
    ? requestedView
    : "my";

  const activeTab = TABS.some((item) => item.key === requestedTab)
    ? requestedTab
    : "closed";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error: journalsError } = await supabase
    .from("journals")
    .select(
      `
        id,
        user_id,
        copied_from_journal_id,
        strategy_id,
        trading_account_id,
        symbol_id,
        strategy_snapshot,
        purpose,
        status,
        direction,
        quantity,
        risk_mode,
        risk_per_trade,
        entry_price,
        stop_loss,
        take_profit,
        take_profit_qty,
        entry_reason,
        exit_reason,
        exit_price,
        exit_checkpoint,
        modified_sl_price,
        modified_tp_price,
        modified_tp_qty,
        sl_tp_adjustment_reason,
        journal_start_at,
        journal_end_at,
        closed_evidence_image,
        htf,
        entry_tf,
        setup_images,
        reference_images,
        owner_note,
        owner_note_updated_at,
        admin_note,
        admin_note_updated_at,
        is_shared,
        shared_at,
        created_at,
        updated_at,
        aftermath_result,
        aftermath_date,
        aftermath_user_note,
        aftermath_mentor_note,
        aftermath_updated_at,
        aftermath_images,

        symbols:symbol_id (
          id,
          symbol_name,
          full_name,
          category,
          asset_class,
          contract_size,
          tick_size,
          decimal_places,
          min_lot,
          lot_step,
          leverage,
          margin_percent,
          price_multiplier,
          base_currency,
          quote_currency,
          profit_currency,
          is_active
        ),

        trading_accounts:trading_account_id (
          id,
          account_name,
          account_size,
          framework,
          tag,
          is_hidden
        )
      `,
    )
    .eq("user_id", user.id)
    .order("journal_end_at", {
      ascending: false,
      nullsFirst: false,
    })
    .order("created_at", {
      ascending: false,
    });

  if (journalsError) {
    console.error("Failed to load journals:", journalsError);
  }

  /*
   * This preserves observations that have trading_account_id = null while
   * still excluding journals attached to hidden trading accounts.
   */
  const rawJournals = (data || []).filter((journal) => {
    if (!journal.trading_accounts) {
      return true;
    }

    return journal.trading_accounts.is_hidden !== true;
  });

  const { data: overrideRows, error: overrideError } = await supabase
    .from("trading_account_symbol_settings")
    .select(
      `
          id,
          trading_account_id,
          symbol_id,
          contract_size,
          leverage
        `,
    )
    .eq("user_id", user.id);

  if (overrideError) {
    console.error("Failed to load account symbol settings:", overrideError);
  }

  const overrideMap = new Map();

  for (const override of overrideRows || []) {
    overrideMap.set(
      getOverrideKey(override.trading_account_id, override.symbol_id),
      override,
    );
  }

  const journalsWithEffectiveSymbols = rawJournals.map((journal) => {
    const masterSymbol = journal.symbols || null;

    const override = journal.trading_account_id
      ? overrideMap.get(
          getOverrideKey(journal.trading_account_id, journal.symbol_id),
        )
      : null;

    const effectiveContractSize =
      override?.contract_size != null
        ? toNumber(override.contract_size)
        : toNumber(masterSymbol?.contract_size);

    const effectiveLeverage =
      override?.leverage != null
        ? toNumber(override.leverage)
        : toNumber(masterSymbol?.leverage);

    const effectiveSymbol = masterSymbol
      ? {
          ...masterSymbol,

          contract_size: effectiveContractSize,
          leverage: effectiveLeverage,

          master_contract_size: toNumber(masterSymbol.contract_size),

          master_leverage: toNumber(masterSymbol.leverage),

          override_contract_size:
            override?.contract_size != null
              ? toNumber(override.contract_size)
              : null,

          override_leverage:
            override?.leverage != null ? toNumber(override.leverage) : null,

          has_contract_size_override: override?.contract_size != null,

          has_leverage_override: override?.leverage != null,

          has_account_override: Boolean(override),

          override_id: override?.id || null,
        }
      : null;

    return {
      ...journal,

      effective_symbol: effectiveSymbol,
      effective_contract_size: effectiveContractSize,
      effective_leverage: effectiveLeverage,
      effective_price_multiplier:
        toNumber(effectiveSymbol?.price_multiplier) ?? 1,

      symbol_override: override || null,
    };
  });

  const historicalRateMap = await createHistoricalRateMap(
    journalsWithEffectiveSymbols,
  );

  const journalsWithMetrics = journalsWithEffectiveSymbols.map((journal) => {
    const calculationCurrency = getCalculationCurrency(
      journal.effective_symbol,
    );

    const conversionRequestDate = getTradeConversionDate(journal);

    const conversionKey = `${calculationCurrency}:${conversionRequestDate}`;

    const conversionDetails =
      calculationCurrency === "USD"
        ? {
            rate: 1,
            rateDate: conversionRequestDate,
          }
        : historicalRateMap.get(conversionKey) || {
            rate: null,
            rateDate: null,
          };

    const calculation = calculateJournalMetrics(
      journal,
      journal.effective_symbol,
      conversionDetails,
    );

    return {
      ...journal,

      calculation,

      calculation_currency: calculation.calculation_currency,

      pnl_quote_currency: calculation.calculation_currency,

      pnl_conversion_rate: calculation.pnl_conversion_rate,

      quote_to_usd_rate: calculation.pnl_conversion_rate,

      historical_conversion_rate: calculation.pnl_conversion_rate,

      pnl_conversion_date: calculation.pnl_conversion_date,

      profit_loss_instrument_currency:
        calculation.profit_loss_instrument_currency,

      calculated_risk_instrument_currency: calculation.risk_instrument_currency,

      calculated_reward_instrument_currency:
        calculation.reward_instrument_currency,

      profit_loss_usd: calculation.profit_loss_usd,

      calculated_profit_loss_usd: calculation.profit_loss_usd,

      calculated_risk_usd: calculation.risk_usd,

      calculated_reward_usd: calculation.reward_usd,

      calculated_risk_percent: calculation.risk_percent,

      calculated_r_multiple: calculation.r_multiple,

      calculated_planned_rr: calculation.planned_risk_reward,

      calculated_points: calculation.points_or_ticks,

      calculated_price_movement: calculation.price_movement,

      calculated_margin_usd: calculation.required_margin_usd,
    };
  });

  const allJournals = await attachImageUrls(supabase, journalsWithMetrics);

  const counts = {
    my: {
      closed: allJournals.filter(
        (journal) =>
          journal.copied_from_journal_id === null &&
          getJournalTab(journal) === "closed",
      ).length,

      missed: allJournals.filter(
        (journal) =>
          journal.copied_from_journal_id === null &&
          getJournalTab(journal) === "missed",
      ).length,

      cancelled: allJournals.filter(
        (journal) =>
          journal.copied_from_journal_id === null &&
          getJournalTab(journal) === "cancelled",
      ).length,
    },

    incorporated: {
      closed: allJournals.filter(
        (journal) =>
          journal.copied_from_journal_id !== null &&
          getJournalTab(journal) === "closed",
      ).length,

      missed: allJournals.filter(
        (journal) =>
          journal.copied_from_journal_id !== null &&
          getJournalTab(journal) === "missed",
      ).length,

      cancelled: allJournals.filter(
        (journal) =>
          journal.copied_from_journal_id !== null &&
          getJournalTab(journal) === "cancelled",
      ).length,
    },
  };

  const filteredByView = allJournals.filter((journal) => {
    if (activeView === "incorporated") {
      return journal.copied_from_journal_id !== null;
    }

    return journal.copied_from_journal_id === null;
  });

  const journals = filteredByView.filter(
    (journal) => getJournalTab(journal) === activeTab,
  );

  return (
    <main className="min-h-screen bg-[#f6f9fd] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-8xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-sm backdrop-blur-xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-600">
                <Target className="h-3.5 w-3.5" />
                Trade History
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Journals
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Review closed, missed and cancelled opportunities.
              </p>
            </div>

            <Link
              href="/app/radars/new"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-sky-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700"
            >
              New Opportunity
            </Link>
          </div>
        </section>

        <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-2 shadow-sm backdrop-blur-xl">
          <div className="grid gap-2 md:grid-cols-2">
            {VIEWS.map((item) => {
              const active = activeView === item.key;

              const totalCount =
                counts[item.key].closed +
                counts[item.key].missed +
                counts[item.key].cancelled;

              return (
                <Link
                  key={item.key}
                  href={`/app/journals?view=${item.key}&tab=${activeTab}`}
                  className={`rounded-2xl px-4 py-3 text-center text-sm font-bold transition ${
                    active
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {item.label}

                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {totalCount}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => {
            const active = activeTab === item.key;

            return (
              <Link
                key={item.key}
                href={`/app/journals?view=${activeView}&tab=${item.key}`}
                className={`rounded-2xl border px-5 py-2.5 text-sm font-bold transition ${
                  active
                    ? "border-sky-600 bg-sky-600 text-white shadow-sm"
                    : "border-slate-200 bg-white/85 text-slate-500 hover:text-slate-900"
                }`}
              >
                {item.label}

                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {counts[activeView][item.key]}
                </span>
              </Link>
            );
          })}
        </div>

        <JournalsFilterShell
          key={`${activeView}-${activeTab}`}
          journals={journals}
          activeTab={activeTab}
        />
      </div>
    </main>
  );
}
