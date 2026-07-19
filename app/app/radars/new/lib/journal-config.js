export function norm(value) {
  return String(value || "").trim().toUpperCase();
}

export const TF = [
  "MN", "Week", "2D", "D", "H16", "H14", "H12", "H10", "H8", "H6",
  "H4", "H3", "H2", "H1", "30", "30M", "15M", "10M", "5M", "1M",
];

export const ACTIVE_STATUSES = [
  "ENTRY PLACED",
  "ENTRY TRIGGERED",
  "ENTRY PLANNED",
];

export const CLOSED_STATUSES = [
  "TRADE SL HIT",
  "TRADE CLOSE WITH PROFIT",
  "TRADE EXIT IN MID",
  "ENTRY CLOSED",
];

export const PURPOSE_CONFIG = {
  "TRADE OBSERVATION": {
    disable: { tradingAccount: true, risk: true },
    required: {
      tradingAccount: false,
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
  },
  "TRADE EXECUTION": {
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
  },
  "FORWARD TESTING": {
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
  },
};

export const PURPOSES = [
  "TRADE OBSERVATION",
  "TRADE EXECUTION",
  "FORWARD TESTING",
];

export const STATUS_OPTIONS_BY_PURPOSE = {
  "TRADE OBSERVATION": ["ENTRY MISSED", "ENTRY CLOSED"],
  "TRADE EXECUTION": [
    "ENTRY PLANNED",
    "ENTRY PLACED",
    "ENTRY TRIGGERED",
    "ENTRY CANCELLED",
    "ENTRY MISSED",
    "TRADE SL HIT",
    "TRADE CLOSE WITH PROFIT",
    "TRADE EXIT IN MID",
  ],
  "FORWARD TESTING": [
    "ENTRY PLANNED",
    "ENTRY PLACED",
    "ENTRY TRIGGERED",
    "ENTRY CANCELLED",
    "ENTRY MISSED",
    "TRADE SL HIT",
    "TRADE CLOSE WITH PROFIT",
    "TRADE EXIT IN MID",
  ],
};

export const EDIT_STATUS_TRANSITIONS = {
  "ENTRY PLANNED": [
    "ENTRY PLACED",
    "ENTRY TRIGGERED",
    "ENTRY CANCELLED",
    "ENTRY MISSED",
  ],
  "ENTRY PLACED": ["ENTRY TRIGGERED", "ENTRY CANCELLED", "ENTRY MISSED"],
};

export function getStatusOptions(purpose) {
  return (
    STATUS_OPTIONS_BY_PURPOSE[norm(purpose)] ||
    STATUS_OPTIONS_BY_PURPOSE["TRADE OBSERVATION"]
  );
}

export function isClosedStatus(status) {
  return CLOSED_STATUSES.includes(norm(status));
}

export function needsEndDate(status) {
  const value = norm(status);
  return Boolean(value) && !ACTIVE_STATUSES.includes(value);
}

export function nowLocalDateTimeValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function toDatetimeLocal(value) {
  if (!value) return nowLocalDateTimeValue();

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return nowLocalDateTimeValue();

  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
