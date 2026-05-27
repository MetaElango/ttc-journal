// app/app/metrics/_lib/metrics.js

export const CLOSED_STATUSES = [
  "TRADE CLOSE WITH PROFIT",
  "TRADE EXIT IN MID",
  "TRADE SL HIT",
];

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function round1(n) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

export function formatR(n) {
  const v = round2(n);
  return `${v > 0 ? "+" : ""}${v}R`;
}

export function getStrategyName(journal) {
  return journal?.strategy_snapshot?.strategy_name || "—";
}

export function getSetupType(journal) {
  return journal?.strategy_snapshot?.setup_type || "—";
}

export function getWeightedTakeProfit(journal) {
  const prices =
    journal.exit_checkpoint === "MODIFIED_TP" &&
    Array.isArray(journal.modified_tp_price)
      ? journal.modified_tp_price
      : Array.isArray(journal.take_profit)
        ? journal.take_profit
        : [];

  const qtys =
    journal.exit_checkpoint === "MODIFIED_TP" &&
    Array.isArray(journal.modified_tp_qty)
      ? journal.modified_tp_qty
      : Array.isArray(journal.take_profit_qty)
        ? journal.take_profit_qty
        : [];

  if (!prices.length) return 0;

  if (qtys.length === prices.length) {
    let total = 0;
    let totalQty = 0;

    for (let i = 0; i < prices.length; i++) {
      const price = Number(prices[i]);
      const qty = Number(qtys[i]);

      if (!Number.isFinite(price) || !Number.isFinite(qty) || qty <= 0) {
        continue;
      }

      total += price * qty;
      totalQty += qty;
    }

    if (totalQty > 0) return total / totalQty;
  }

  const valid = prices.map(Number).filter(Number.isFinite);
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
}

export function calculatePlannedRR(journal) {
  const direction = String(journal.direction || "").toUpperCase();
  const entry = Number(journal.entry_price);
  const stop = Number(journal.stop_loss);
  const tp = Number(getWeightedTakeProfit(journal));

  if (!(entry > 0) || !(stop > 0) || !(tp > 0)) return 0;

  if (direction === "BUY") {
    const risk = entry - stop;
    if (risk <= 0) return 0;
    return (tp - entry) / risk;
  }

  if (direction === "SELL") {
    const risk = stop - entry;
    if (risk <= 0) return 0;
    return (entry - tp) / risk;
  }

  return 0;
}

export function calculateRMultiple(journal) {
  const status = String(journal.status || "").toUpperCase();
  const direction = String(journal.direction || "").toUpperCase();

  const entry = Number(journal.entry_price);
  const stop = Number(journal.stop_loss);
  const exit = Number(journal.exit_price);

  if (!CLOSED_STATUSES.includes(status)) return 0;
  if (!(entry > 0) || !(stop > 0)) return 0;

  if (status === "TRADE SL HIT") return -1;

  if (!(exit > 0)) return 0;

  if (direction === "BUY") {
    const risk = entry - stop;
    if (risk <= 0) return 0;
    return (exit - entry) / risk;
  }

  if (direction === "SELL") {
    const risk = stop - entry;
    if (risk <= 0) return 0;
    return (entry - exit) / risk;
  }

  return 0;
}

export function movingAverage(data, key = "cumulativeR", period = 10) {
  return data.map((item, index) => {
    const start = Math.max(0, index - period + 1);
    const slice = data.slice(start, index + 1);
    const avg =
      slice.reduce((sum, x) => sum + Number(x[key] || 0), 0) / slice.length;

    return {
      ...item,
      sma10: round2(avg),
    };
  });
}

export function buildEquityCurve(journals) {
  const closed = journals
    .filter((j) =>
      CLOSED_STATUSES.includes(String(j.status || "").toUpperCase()),
    )
    .sort((a, b) => {
      const da = new Date(
        a.journal_end_at || a.updated_at || a.created_at,
      ).getTime();
      const db = new Date(
        b.journal_end_at || b.updated_at || b.created_at,
      ).getTime();
      return da - db;
    });

  let cumulativeR = 0;

  const points = closed.map((journal, index) => {
    const r = round2(calculateRMultiple(journal));
    cumulativeR = round2(cumulativeR + r);

    const d = new Date(
      journal.journal_end_at || journal.updated_at || journal.created_at,
    );

    return {
      index: index + 1,
      date: d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      fullDate: d.toISOString(),
      cumulativeR,
      r,
      journal,
      zero: 0,
      quality: r > 0 ? "good" : r < 0 ? "poor" : "average",
    };
  });

  return movingAverage(points);
}

export function getDrawdowns(curve) {
  let peak = 0;
  let active = null;
  const zones = [];

  curve.forEach((p) => {
    if (p.cumulativeR > peak) {
      if (active) {
        zones.push(active);
        active = null;
      }

      peak = p.cumulativeR;
      return;
    }

    const dd = round2(p.cumulativeR - peak);

    if (dd < 0) {
      if (!active) {
        active = {
          startIndex: p.index,
          endIndex: p.index,
          drawdown: dd,
          trades: 1,
        };
      } else {
        active.endIndex = p.index;
        active.trades += 1;
        if (dd < active.drawdown) active.drawdown = dd;
      }
    }
  });

  if (active) zones.push(active);

  return zones.sort((a, b) => a.drawdown - b.drawdown).slice(0, 3);
}

export function getStats(journals) {
  const closed = journals.filter((j) =>
    CLOSED_STATUSES.includes(String(j.status || "").toUpperCase()),
  );

  const rValues = closed.map(calculateRMultiple);
  const wins = rValues.filter((r) => r > 0);
  const losses = rValues.filter((r) => r < 0);

  const totalR = round2(rValues.reduce((a, b) => a + b, 0));
  const winRate = closed.length
    ? round2((wins.length / closed.length) * 100)
    : 0;
  const expectancy = closed.length ? round2(totalR / closed.length) : 0;
  const grossProfit = round2(wins.reduce((a, b) => a + b, 0));
  const grossLoss = Math.abs(round2(losses.reduce((a, b) => a + b, 0)));
  const profitFactor =
    grossLoss > 0 ? round2(grossProfit / grossLoss) : grossProfit > 0 ? "∞" : 0;

  const avgWin = wins.length
    ? round2(wins.reduce((a, b) => a + b, 0) / wins.length)
    : 0;
  const avgLoss = losses.length
    ? round2(Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length))
    : 0;

  const rEfficiency =
    avgLoss > 0 ? round2(avgWin / avgLoss) : avgWin > 0 ? "∞" : 0;

  return {
    closed,
    totalR,
    totalTrades: closed.length,
    winRate,
    expectancy,
    profitFactor,
    avgWin,
    avgLoss,
    rEfficiency,
    wins: wins.length,
    losses: losses.length,
  };
}
