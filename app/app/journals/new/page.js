import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewJournalForm from "./journal-form";

const ACTIVE_STATUSES = ["ENTRY PLACED", "ENTRY TRIGGERED", "RUNNING TRADE"];

function needsEndDate(status) {
  const value = String(status || "")
    .trim()
    .toUpperCase();
  return value && !ACTIVE_STATUSES.includes(value);
}

function getFormValue(formData, key) {
  return formData.get(key);
}

async function getSignedImageUrls(supabase, paths = []) {
  if (!Array.isArray(paths) || paths.length === 0) return [];

  const { data, error } = await supabase.storage
    .from("journal-images")
    .createSignedUrls(paths, 60 * 60);

  if (error) {
    console.log("SIGNED URL ERROR:", error.message);
    return [];
  }

  return data?.map((x) => x.signedUrl).filter(Boolean) || [];
}

export default async function NewJournalPage({ searchParams }) {
  const params = await searchParams;

  const strategyId = params?.strategyId;
  const sharedJournalId = params?.sharedJournalId;

  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) redirect("/login");

  let liveStrategies = [];

  if (!strategyId && !sharedJournalId) {
    const { data } = await supabase
      .from("strategies")
      .select(
        `
        id,
        strategy_name,
        strategy_type,
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
      .eq("user_id", user.id)
      .eq("strategy_status", "LIVE")
      .order("updated_at", { ascending: false });

    liveStrategies = data || [];
  }

  let strategy = null;
  let prefillJournal = null;

  if (sharedJournalId) {
    const { data: sharedJournal, error: sharedError } = await supabase
      .from("journals")
      .select(
        `
        id,
        user_id,
        strategy_id,
        trading_account_id,
        symbol_id,
        strategy_snapshot,
        purpose,
        status,
        direction,
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
        setup_images,
        reference_images,
        journal_start_at,
        journal_end_at,
        htf,
        entry_tf,
        is_shared,
        shared_at,
        symbols:symbol_id (
          id,
          symbol_name,
          category
        )
        `,
      )
      .eq("id", sharedJournalId)
      .eq("is_shared", true)
      .neq("user_id", user.id)
      .single();

    if (sharedError || !sharedJournal) {
      return (
        <div className="p-6">
          <h1 className="text-xl font-semibold">Incorporate Journal</h1>
          <p className="mt-3 text-sm text-destructive">
            Shared journal not found.
          </p>
        </div>
      );
    }

    const setupImageUrls = await getSignedImageUrls(
      supabase,
      sharedJournal.setup_images || [],
    );

    const referenceImageUrls = await getSignedImageUrls(
      supabase,
      sharedJournal.reference_images || [],
    );

    prefillJournal = {
      ...sharedJournal,
      setupImageUrls,
      referenceImageUrls,
    };
    strategy = sharedJournal.strategy_snapshot || null;
  }

  if (strategyId) {
    const { data: fetchedStrategy, error: sErr } = await supabase
      .from("strategies")
      .select(
        `
        id,
        strategy_name,
        strategy_type,
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
      .eq("user_id", user.id)
      .single();

    if (sErr || !fetchedStrategy) {
      return (
        <div className="p-6">
          <h1 className="text-xl font-semibold">Create Journal</h1>
          <p className="mt-3 text-sm text-destructive">
            Strategy not found or you don’t have access.
          </p>
        </div>
      );
    }

    strategy = fetchedStrategy;
  }

  if (!strategy && (strategyId || sharedJournalId)) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Create Opportunity</h1>
        <p className="mt-3 text-sm text-destructive">
          Strategy data is missing.
        </p>
      </div>
    );
  }

  const { data: accounts } = await supabase
    .from("trading_accounts")
    .select("id, account_name, account_size, framework")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: symbols } = await supabase
    .from("symbols")
    .select("id, category, symbol_name")
    .order("category", { ascending: true })
    .order("symbol_name", { ascending: true });

  async function createJournal(prevState, formData) {
    "use server";

    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      return { ok: false, message: "Unauthorized." };
    }
    const selected_strategy_id = String(
      getFormValue(formData, "strategy_id") || strategy?.id || "",
    ).trim();

    if (!selected_strategy_id) {
      return { ok: false, message: "Select a LIVE playbook first." };
    }

    let selectedStrategy = strategy;

    if (!selectedStrategy || selectedStrategy.id !== selected_strategy_id) {
      const { data: fetchedStrategy, error: strategyError } = await supabase
        .from("strategies")
        .select(
          `
      id,
      strategy_name,
      strategy_type,
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
        .eq("id", selected_strategy_id)
        .eq("user_id", user.id)
        .eq("strategy_status", "LIVE")
        .single();

      if (strategyError || !fetchedStrategy) {
        return { ok: false, message: "Selected LIVE playbook not found." };
      }

      selectedStrategy = fetchedStrategy;
    }

    const PURPOSES = new Set([
      "TRADE OBSERVATION",
      "TRADE EXECUTION",
      "FORWARD TESTING",
    ]);

    const STATUS_OPTIONS_BY_PURPOSE = {
      "TRADE OBSERVATION": ["ENTRY MISSED", "ENTRY CLOSED"],
      "TRADE EXECUTION": [
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

    const purpose = String(getFormValue(formData, "purpose") || "")
      .trim()
      .toUpperCase();

    if (!PURPOSES.has(purpose)) {
      return { ok: false, message: "Invalid purpose selected." };
    }

    const statusRaw = String(getFormValue(formData, "status") || "")
      .trim()
      .toUpperCase();

    const allowedStatuses =
      STATUS_OPTIONS_BY_PURPOSE[purpose] ||
      STATUS_OPTIONS_BY_PURPOSE["TRADE OBSERVATION"];

    let status = null;

    if (statusRaw) {
      if (!allowedStatuses.includes(statusRaw)) {
        return { ok: false, message: "Select a valid status." };
      }

      status = statusRaw;
    }

    if (purpose !== "TRADE OBSERVATION" && !status) {
      return { ok: false, message: "Select a status." };
    }

    let trading_account_id = String(
      getFormValue(formData, "trading_account_id") || "",
    );

    if (purpose === "TRADE OBSERVATION") trading_account_id = "";

    trading_account_id = trading_account_id ? trading_account_id : null;

    if (purpose !== "TRADE OBSERVATION" && !trading_account_id) {
      return { ok: false, message: "Select a trading account." };
    }

    const symbol_id = String(getFormValue(formData, "symbol_id") || "") || null;

    const directionRaw = String(getFormValue(formData, "direction") || "")
      .trim()
      .toUpperCase();

    const direction =
      directionRaw === "BUY" ? "BUY" : directionRaw === "SELL" ? "SELL" : "";

    if (!direction) {
      return { ok: false, message: "Select direction (BUY or SELL)." };
    }

    const entry_price = Number(getFormValue(formData, "entry_price"));
    const stop_loss = Number(getFormValue(formData, "stop_loss"));
    const quantity = Number(getFormValue(formData, "quantity"));

    const entry_reason = String(
      getFormValue(formData, "entry_reason") || "",
    ).trim();

    const exit_reason_raw = String(
      getFormValue(formData, "exit_reason") || "",
    ).trim();

    const exit_reason = exit_reason_raw ? exit_reason_raw : null;

    const exit_price_raw = String(
      getFormValue(formData, "exit_price") || "",
    ).trim();

    const exit_price = exit_price_raw ? Number(exit_price_raw) : null;

    const risk_mode =
      String(getFormValue(formData, "risk_mode") || "")
        .trim()
        .toUpperCase() || (purpose === "TRADE OBSERVATION" ? "PERCENT" : "");

    const risk_per_trade_raw = String(
      getFormValue(formData, "risk_per_trade") || "",
    ).trim();

    let risk_per_trade = risk_per_trade_raw ? Number(risk_per_trade_raw) : NaN;

    if (purpose === "TRADE OBSERVATION") {
      risk_per_trade = Number(selectedStrategy.risk_per_trade || 0);
    }

    const tpRaw = String(getFormValue(formData, "take_profit_json") || "[]");

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

    const journal_start_at_raw = String(
      getFormValue(formData, "journal_start_at") || "",
    ).trim();

    const journal_end_at_raw = String(
      getFormValue(formData, "journal_end_at") || "",
    ).trim();

    const journal_start_at = journal_start_at_raw
      ? new Date(journal_start_at_raw).toISOString()
      : null;

    const journal_end_at = journal_end_at_raw
      ? new Date(journal_end_at_raw).toISOString()
      : null;

    if (!journal_start_at) {
      return { ok: false, message: "Create date is required." };
    }

    if (needsEndDate(status) && !journal_end_at) {
      return {
        ok: false,
        message: "End date is required for this status.",
      };
    }

    if (!symbol_id) return { ok: false, message: "Select a symbol." };

    if (Number.isNaN(quantity) || quantity <= 0) {
      return { ok: false, message: "Quantity must be a positive number." };
    }

    if (Number.isNaN(entry_price)) {
      return { ok: false, message: "Entry price must be a number." };
    }

    if (Number.isNaN(stop_loss)) {
      return { ok: false, message: "Stop loss must be a number." };
    }

    if (!entry_reason) {
      return { ok: false, message: "Entry reason is required." };
    }

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

    if (!tpItems || tpItems.length === 0) {
      return { ok: false, message: "Add at least one Take Profit." };
    }

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
      if (!(q > 0)) {
        return { ok: false, message: "Each TP quantity must be > 0." };
      }
    }

    const sumQty = take_profit_qty.reduce((a, b) => a + b, 0);

    if (Math.abs(quantity - sumQty) > 0.0001) {
      return {
        ok: false,
        message: "Sum of TP quantities must equal total quantity (lots).",
      };
    }

    let existingSetupImages = [];
    let existingReferenceImages = [];

    try {
      existingSetupImages = JSON.parse(
        String(getFormValue(formData, "existing_setup_images") || "[]"),
      );
      existingReferenceImages = JSON.parse(
        String(getFormValue(formData, "existing_reference_images") || "[]"),
      );

      if (!Array.isArray(existingSetupImages)) existingSetupImages = [];
      if (!Array.isArray(existingReferenceImages)) existingReferenceImages = [];
    } catch {
      existingSetupImages = [];
      existingReferenceImages = [];
    }

    if (existingSetupImages.length > 2) {
      return {
        ok: false,
        message: "Setup images can be maximum 2.",
      };
    }

    if (existingReferenceImages.length > 5) {
      return {
        ok: false,
        message: "Reference images can be maximum 5.",
      };
    }

    let htf = [];
    let entry_tf = [];

    try {
      htf = JSON.parse(String(getFormValue(formData, "htf_json") || "[]"));
      entry_tf = JSON.parse(
        String(getFormValue(formData, "entry_tf_json") || "[]"),
      );
    } catch {
      htf = [];
      entry_tf = [];
    }

    if (!Array.isArray(htf) || htf.length === 0) {
      return {
        ok: false,
        message: "HTF is required. Please select a strategy with HTF.",
      };
    }

    if (!Array.isArray(entry_tf) || entry_tf.length === 0) {
      return {
        ok: false,
        message:
          "Entry TF is required. Please select a strategy with Entry TF.",
      };
    }

    let finalStrategyId = selectedStrategy.id;
    let copied_from_journal_id = null;

    const baseSnapshot = {
      id: selectedStrategy.id,
      strategy_name: selectedStrategy.strategy_name,
      strategy_type: selectedStrategy.strategy_type,
      preparation_status: selectedStrategy.preparation_status,
      strategy_status: selectedStrategy.strategy_status,
      trading_style: selectedStrategy.trading_style,
      setup_type: selectedStrategy.setup_type,
      bias_confluence: selectedStrategy.bias_confluence || [],
      htf: selectedStrategy.htf || [],
      intermediate_tf: selectedStrategy.intermediate_tf || [],
      entry_tf: selectedStrategy.entry_tf || [],
      checklist: selectedStrategy.checklist,
      entry_rules: selectedStrategy.entry_rules,
      exit_rules: selectedStrategy.exit_rules,
      sl_management_rules: selectedStrategy.sl_management_rules,
      risk_per_trade: selectedStrategy.risk_per_trade,
      avg_planned_rr: selectedStrategy.avg_planned_rr,
      planned_r_year: selectedStrategy.planned_r_year,
      snapshotted_at: new Date().toISOString(),
    };

    let strategy_snapshot = baseSnapshot;

    if (sharedJournalId && prefillJournal) {
      const { data: copiedStrategy, error: copiedStrategyError } =
        await supabase
          .from("strategies")
          .insert({
            user_id: user.id,
            strategy_name: selectedStrategy.strategy_name
              ? `${selectedStrategy.strategy_name} (Copied)`
              : "Copied Strategy",
            strategy_type: selectedStrategy.strategy_type,
            trading_style: selectedStrategy.trading_style,
            setup_type: selectedStrategy.setup_type,
            bias_confluence: selectedStrategy.bias_confluence || [],
            htf: selectedStrategy.htf || [],
            intermediate_tf: selectedStrategy.intermediate_tf || [],
            entry_tf: selectedStrategy.entry_tf || [],
            checklist: selectedStrategy.checklist,
            entry_rules: selectedStrategy.entry_rules,
            exit_rules: selectedStrategy.exit_rules,
            sl_management_rules: selectedStrategy.sl_management_rules,
            risk_per_trade: selectedStrategy.risk_per_trade,
            avg_planned_rr: selectedStrategy.avg_planned_rr,
            planned_r_year: selectedStrategy.planned_r_year,
            preparation_status: selectedStrategy.preparation_status || "Active",
            strategy_status:
              selectedStrategy.preparation_status === "Active"
                ? selectedStrategy.strategy_status || "LIVE"
                : null,
            copied_from_strategy_id: prefillJournal.strategy_id || null,
            source_shared_journal_id: prefillJournal.id,
          })
          .select("id")
          .single();

      if (copiedStrategyError) {
        return { ok: false, message: copiedStrategyError.message };
      }

      finalStrategyId = copiedStrategy.id;
      copied_from_journal_id = prefillJournal.id;

      strategy_snapshot = {
        ...baseSnapshot,
        copied_at: new Date().toISOString(),
        copied_from_journal_id: prefillJournal.id,
        copied_from_strategy_id:
          prefillJournal.strategy_id || selectedStrategy.id,
      };
    }

    const { data: insertedJournal, error } = await supabase
      .from("journals")
      .insert({
        user_id: user.id,
        strategy_id: finalStrategyId,
        trading_account_id,
        symbol_id,

        purpose,
        status,
        direction,

        strategy_snapshot,
        htf,
        entry_tf,

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

        setup_images: [],
        reference_images: [],

        journal_start_at,
        journal_end_at: needsEndDate(status) ? journal_end_at : null,

        copied_from_journal_id,
        is_shared: false,
      })
      .select("id")
      .single();

    if (error) return { ok: false, message: error.message };

    return {
      ok: true,
      message: sharedJournalId
        ? "Journal ready. You can now review it in your dashboard."
        : "Journal created.",
      journalId: insertedJournal.id,
      existingSetupImages,
      existingReferenceImages,
    };
  }

  return (
    <NewJournalForm
      action={createJournal}
      strategy={strategy}
      strategies={liveStrategies}
      accounts={accounts || []}
      symbols={symbols || []}
      prefillJournal={prefillJournal}
    />
  );
}
