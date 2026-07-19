import { norm } from "./journal-config";

export function numeric(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function round2(value) {
  return Math.round((numeric(value) + Number.EPSILON) * 100) / 100;
}

export function round8(value) {
  return Math.round((numeric(value) + Number.EPSILON) * 100000000) / 100000000;
}

export function formatNumber(value, maximumFractionDigits = 8) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(parsed);
}

export function formatMoney(value, currency = "USD") {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "—";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parsed);
  } catch {
    return `${currency || "USD"} ${parsed.toFixed(2)}`;
  }
}

export function sanitizeDecimal(raw, decimalPlaces = 8) {
  let output = String(raw ?? "").replace(/[^\d.]/g, "");
  const firstDot = output.indexOf(".");

  if (firstDot !== -1) {
    output =
      output.slice(0, firstDot + 1) +
      output.slice(firstDot + 1).replace(/\./g, "");
    const [whole, fraction = ""] = output.split(".");
    output = `${whole}.${fraction.slice(0, decimalPlaces)}`;
  }

  return output;
}

export const sanitize2dp = (raw) => sanitizeDecimal(raw, 2);

export function getCalculationCurrency(symbol) {
  const assetClass = norm(symbol?.asset_class);
  if (assetClass === "FOREX") return norm(symbol?.quote_currency || "USD");
  return norm(symbol?.profit_currency || symbol?.quote_currency || "USD");
}

export function convertToUsd(amount, conversionRate) {
  const parsedAmount = numeric(amount);
  const rate = numeric(conversionRate);
  if (rate <= 0) return 0;
  return parsedAmount * rate;
}

export function getSymbolMultiplier(symbol) {
  return numeric(symbol?.contract_size, 1) * numeric(symbol?.price_multiplier, 1);
}

export function calculateMoneyAtPrice({ direction, entryPrice, targetPrice, lots, symbol }) {
  const entry = numeric(entryPrice);
  const target = numeric(targetPrice);
  const quantity = numeric(lots);
  const multiplier = getSymbolMultiplier(symbol);

  if (entry <= 0 || target <= 0 || quantity <= 0 || multiplier <= 0) return 0;

  const priceMove = norm(direction) === "SELL" ? entry - target : target - entry;
  return priceMove * quantity * multiplier;
}

export function calculateAllowedRisk({ account, riskMode, riskPerTrade }) {
  const configuredRisk = numeric(riskPerTrade);
  if (configuredRisk <= 0) return 0;
  if (norm(riskMode) === "AMOUNT") return configuredRisk;

  const accountSize = numeric(account?.account_size);
  if (accountSize <= 0) return 0;
  return (accountSize * configuredRisk) / 100;
}

export function snapQuantityToSymbol(quantity, symbol) {
  const rawQuantity = numeric(quantity);
  if (rawQuantity <= 0) return 0;

  const step = numeric(symbol?.lot_step, 0.01);
  const minLot = numeric(symbol?.min_lot, step);
  if (step <= 0) return round8(Math.max(rawQuantity, minLot));

  const stepped = Math.floor((rawQuantity + 1e-12) / step) * step;
  const precision = Math.min(8, Math.max(0, String(step).split(".")[1]?.length || 0));
  return Number(Math.max(stepped, minLot).toFixed(precision));
}

export function calculateSuggestedQuantity({
  direction,
  entryPrice,
  stopLoss,
  allowedRisk,
  symbol,
  conversionRate = 1,
}) {
  const entry = numeric(entryPrice);
  const stop = numeric(stopLoss);
  const multiplier = getSymbolMultiplier(symbol);
  const rate = numeric(conversionRate);

  if (entry <= 0 || stop <= 0 || allowedRisk <= 0 || multiplier <= 0 || rate <= 0 || entry === stop) {
    return 0;
  }

  if (norm(direction) === "BUY" && stop >= entry) return 0;
  if (norm(direction) === "SELL" && stop <= entry) return 0;

  const lossPerLotUsd = Math.abs(entry - stop) * multiplier * rate;
  if (lossPerLotUsd <= 0) return 0;
  return snapQuantityToSymbol(allowedRisk / lossPerLotUsd, symbol);
}

export function defaultSplitWeights(count) {
  if (count <= 0) return [];
  if (count === 1) return [1];

  const weights = [];
  let remaining = 1;

  for (let index = 0; index < count; index++) {
    if (index === count - 1) {
      weights.push(remaining);
      break;
    }
    const next = index === 0 ? 0.5 : weights[index - 1] / 2;
    weights.push(next);
    remaining -= next;
  }

  return weights;
}

export function splitTpQuantity(items, totalLots) {
  const total = numeric(totalLots);
  if (total <= 0 || items.length === 0) return items;

  const weights = defaultSplitWeights(items.length);
  const next = items.map((item, index) => ({
    ...item,
    qty: round8(weights[index] * total),
  }));

  const sum = next.reduce((acc, item) => acc + numeric(item.qty), 0);
  const difference = round8(total - sum);

  if (difference !== 0) {
    const lastIndex = next.length - 1;
    next[lastIndex] = {
      ...next[lastIndex],
      qty: round8(numeric(next[lastIndex].qty) + difference),
    };
  }

  return next;
}
