// app/app/strategies/new-journal/page.js  (or wherever your page lives)
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewJournalForm from "./journal-form";

export default async function NewJournalPage({ searchParams }) {
  const params = await searchParams;
  const strategyId = params?.strategyId;

  if (!strategyId) redirect("/app/strategies");

  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) redirect("/login");

  const { data: strategy, error: sErr } = await supabase
    .from("strategies")
    .select(
      `
      id,
      strategy_name,
      preparation_status,
      strategy_status,
      trading_style,
      setup_type,
      bias_confluence,
      htf,
      intermediate_tf,
      entry_tf,
      checklist,
      entry_rules,
      exit_rules,
      sl_management_rules,
      risk_per_trade,
      avg_planned_rr,
      planned_r_year
    `,
    )
    .eq("id", strategyId)
    .single();

  if (sErr || !strategy) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Create Journal</h1>
        <p className="mt-3 text-sm text-destructive">
          Strategy not found or you don’t have access.
        </p>
      </div>
    );
  }

  const { data: accounts } = await supabase
    .from("trading_accounts")
    .select("id, account_name, account_size, framework")
    .order("created_at", { ascending: false });

  const { data: symbols } = await supabase
    .from("symbols")
    .select("id, category, symbol_name")
    .order("category", { ascending: true })
    .order("symbol_name", { ascending: true });

  async function createJournal(prevState, formData) {
    "use server";

    const supabase = await createClient();

    const PURPOSES = new Set([
      "FOR OBSERVATION",
      "ENTRY PLANNED",
      "FORWARD TESTING",
    ]);

    const STATUS_OPTIONS_BY_PURPOSE = {
      "FOR OBSERVATION": ["ENTRY MISSED", "ENTRY CLOSED"],
      "ENTRY PLANNED": [
        "ENTRY PLACED",
        "ENTRY TRIGGERED",
        "ENTRY CANCELLED",
        "ENTRY MISSED",
        "RUNNING TRADE",
        "TRADE SL HIT",
        "TRADE CLOSE WITH PROFIT",
        "TRADE EXIT IN MID",
      ],
      "FORWARD TESTING": [
        "ENTRY PLACED",
        "ENTRY TRIGGERED",
        "ENTRY CANCELLED",
        "ENTRY MISSED",
        "RUNNING TRADE",
        "TRADE SL HIT",
        "TRADE CLOSE WITH PROFIT",
        "TRADE EXIT IN MID",
      ],
    };

    const purpose = String(formData.get("purpose") || "")
      .trim()
      .toUpperCase();
    if (!PURPOSES.has(purpose)) {
      return { ok: false, message: "Invalid purpose selected." };
    }

    // ✅ status optional for FOR OBSERVATION
    const statusRaw = String(formData.get("status") || "")
      .trim()
      .toUpperCase();

    const allowedStatuses =
      STATUS_OPTIONS_BY_PURPOSE[purpose] ||
      STATUS_OPTIONS_BY_PURPOSE["FOR OBSERVATION"];

    let status = null;

    if (statusRaw) {
      if (!allowedStatuses.includes(statusRaw)) {
        return { ok: false, message: "Select a valid status." };
      }
      status = statusRaw;
    }

    // status is required only for non-observation purposes
    if (purpose !== "FOR OBSERVATION" && !status) {
      return { ok: false, message: "Select a status." };
    }

    // ✅ FOR OBSERVATION doesn't capture trading_account_id
    let trading_account_id = String(formData.get("trading_account_id") || "");
    if (purpose === "FOR OBSERVATION") trading_account_id = "";
    trading_account_id = trading_account_id ? trading_account_id : null;

    if (purpose !== "FOR OBSERVATION" && !trading_account_id) {
      return { ok: false, message: "Select a trading account." };
    }

    const symbol_id = String(formData.get("symbol_id") || "") || null;

    // ✅ Direction (BUY / SELL)
    const directionRaw = String(formData.get("direction") || "")
      .trim()
      .toUpperCase();
    const direction =
      directionRaw === "BUY" ? "BUY" : directionRaw === "SELL" ? "SELL" : "";
    if (!direction) {
      return { ok: false, message: "Select direction (BUY or SELL)." };
    }

    const entry_price = Number(formData.get("entry_price"));
    const stop_loss = Number(formData.get("stop_loss"));
    const quantity = Number(formData.get("quantity"));

    const entry_reason = String(formData.get("entry_reason") || "").trim();

    // ✅ Exit fields OPTIONAL & independent
    const exit_reason_raw = String(formData.get("exit_reason") || "").trim();
    const exit_reason = exit_reason_raw ? exit_reason_raw : null;

    const exit_price_raw = String(formData.get("exit_price") || "").trim();
    const exit_price = exit_price_raw ? Number(exit_price_raw) : null;

    // Risk fields: for OBSERVATION they are disabled in UI, so fallback
    const risk_mode =
      String(formData.get("risk_mode") || "")
        .trim()
        .toUpperCase() || (purpose === "FOR OBSERVATION" ? "PERCENT" : "");

    let risk_per_trade_raw = String(
      formData.get("risk_per_trade") || "",
    ).trim();
    let risk_per_trade = risk_per_trade_raw ? Number(risk_per_trade_raw) : NaN;

    if (purpose === "FOR OBSERVATION") {
      // You said risk is disabled for observation; we store strategy value
      risk_per_trade = Number(strategy.risk_per_trade);
    }

    // ---- Parse TP JSON (editable price + qty) ----
    const tpRaw = String(formData.get("take_profit_json") || "[]");
    let tpItems = [];
    try {
      const parsed = JSON.parse(tpRaw);
      tpItems = Array.isArray(parsed) ? parsed : [];
    } catch {
      tpItems = [];
    }

    const take_profit = tpItems
      .map((x) => Number(x?.price))
      .filter((n) => !Number.isNaN(n));

    const take_profit_qty = tpItems
      .map((x) => Number(x?.qty))
      .filter((n) => !Number.isNaN(n));

    // ---- Validate ----
    if (!symbol_id) return { ok: false, message: "Select a symbol." };

    if (Number.isNaN(quantity) || quantity <= 0)
      return { ok: false, message: "Quantity must be a positive number." };

    if (Number.isNaN(entry_price))
      return { ok: false, message: "Entry price must be a number." };

    if (Number.isNaN(stop_loss))
      return { ok: false, message: "Stop loss must be a number." };

    if (!entry_reason)
      return { ok: false, message: "Entry reason is required." };

    // Exit price if provided => must be number
    if (exit_price_raw && (exit_price === null || Number.isNaN(exit_price))) {
      return { ok: false, message: "Exit price must be a valid number." };
    }

    if (!risk_mode) return { ok: false, message: "Select risk mode." };
    if (Number.isNaN(risk_per_trade) || risk_per_trade <= 0) {
      return {
        ok: false,
        message: "Risk per trade must be a positive number.",
      };
    }

    // ✅ Direction based SL validation
    if (direction === "BUY" && !(stop_loss < entry_price)) {
      return {
        ok: false,
        message: "For BUY, stop loss must be less than entry price.",
      };
    }
    if (direction === "SELL" && !(stop_loss > entry_price)) {
      return {
        ok: false,
        message: "For SELL, stop loss must be greater than entry price.",
      };
    }

    // TP validation
    if (!tpItems || tpItems.length === 0)
      return { ok: false, message: "Add at least one Take Profit." };

    if (
      take_profit.length !== tpItems.length ||
      take_profit_qty.length !== tpItems.length
    ) {
      return {
        ok: false,
        message: "Every TP must have a valid price and quantity.",
      };
    }

    for (const q of take_profit_qty) {
      if (!(q > 0))
        return { ok: false, message: "Each TP quantity must be > 0." };
    }

    const sumQty = take_profit_qty.reduce((a, b) => a + b, 0);
    if (Math.abs(quantity - sumQty) > 0.0001) {
      return {
        ok: false,
        message: "Sum of TP quantities must equal total quantity (lots).",
      };
    }

    const strategy_snapshot = {
      id: strategy.id,
      strategy_name: strategy.strategy_name,
      preparation_status: strategy.preparation_status,
      strategy_status: strategy.strategy_status,
      trading_style: strategy.trading_style,
      setup_type: strategy.setup_type,
      bias_confluence: strategy.bias_confluence,
      htf: strategy.htf,
      intermediate_tf: strategy.intermediate_tf,
      entry_tf: strategy.entry_tf,
      checklist: strategy.checklist,
      entry_rules: strategy.entry_rules,
      exit_rules: strategy.exit_rules,
      sl_management_rules: strategy.sl_management_rules,
      risk_per_trade: strategy.risk_per_trade,
      avg_planned_rr: strategy.avg_planned_rr,
      planned_r_year: strategy.planned_r_year,
      snapshotted_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("journals").insert({
      user_id: user.id,
      strategy_id: strategy.id,

      trading_account_id, // null for FOR OBSERVATION
      symbol_id,

      purpose,
      status,
      direction,

      strategy_snapshot,

      quantity,
      entry_price,
      stop_loss,

      take_profit,
      take_profit_qty,

      entry_reason,
      exit_reason,
      exit_price,

      risk_mode,
      risk_per_trade,
    });

    if (error) return { ok: false, message: error.message };

    redirect("/app/journals");
  }

  return (
    <NewJournalForm
      action={createJournal}
      strategy={strategy}
      accounts={accounts || []}
      symbols={symbols || []}
    />
  );
}
