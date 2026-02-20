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

  // Load strategy (blueprint)
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

  // Load user trading accounts
  const { data: accounts } = await supabase
    .from("trading_accounts")
    .select("id, account_name, account_size, framework")
    .order("created_at", { ascending: false });

  // Load symbols list
  const { data: symbols } = await supabase
    .from("symbols")
    .select("id, category, symbol_name")
    .order("category", { ascending: true })
    .order("symbol_name", { ascending: true });

  async function createJournal(prevState, formData) {
    "use server";

    const supabase = await createClient();

    const trading_account_id = formData.get("trading_account_id") || null;
    const symbol_id = formData.get("symbol_id") || null;
    const status = formData.get("status") || "FORWARD TESTING";

    const entry_price = Number(formData.get("entry_price"));
    const stop_loss = Number(formData.get("stop_loss"));

    const entry_reason = String(formData.get("entry_reason") || "").trim();
    const exit_reason_raw = String(formData.get("exit_reason") || "").trim();
    const exit_reason = exit_reason_raw ? exit_reason_raw : null;

    const exit_price_raw = String(formData.get("exit_price") || "").trim();
    const exit_price = exit_price_raw ? Number(exit_price_raw) : null;

    const risk_mode = formData.get("risk_mode") || null;
    const risk_per_trade = Number(formData.get("risk_per_trade"));
    const quantity = Number(formData.get("quantity"));

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
    if (!trading_account_id)
      return { ok: false, message: "Select a trading account." };
    if (!symbol_id) return { ok: false, message: "Select a symbol." };

    if (Number.isNaN(entry_price))
      return { ok: false, message: "Entry price must be a number." };
    if (Number.isNaN(stop_loss))
      return { ok: false, message: "Stop loss must be a number." };

    if (!entry_reason)
      return { ok: false, message: "Entry reason is required." };

    if (!risk_mode) return { ok: false, message: "Select risk mode." };
    if (Number.isNaN(risk_per_trade) || risk_per_trade <= 0)
      return {
        ok: false,
        message: "Risk per trade must be a positive number.",
      };

    if (Number.isNaN(quantity) || quantity <= 0)
      return { ok: false, message: "Quantity must be a positive number." };

    // Exit validation
    if (exit_reason && (exit_price === null || Number.isNaN(exit_price)))
      return {
        ok: false,
        message: "Exit price is required when exit reason is provided.",
      };

    if (!exit_reason && exit_price !== null)
      return {
        ok: false,
        message: "Exit reason is required if exit price is provided.",
      };

    // TP validation
    if (!tpItems || tpItems.length === 0)
      return { ok: false, message: "Add at least one Take Profit." };

    if (
      take_profit.length !== tpItems.length ||
      take_profit_qty.length !== tpItems.length
    )
      return {
        ok: false,
        message: "Every TP must have a valid price and quantity.",
      };

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

    // Snapshot the strategy at time of journaling
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
      trading_account_id,
      symbol_id,
      status,
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
