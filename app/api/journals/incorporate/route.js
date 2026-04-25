import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const { journalId } = await request.json();

    if (!journalId) {
      return NextResponse.json(
        { ok: false, message: "journalId is required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized." },
        { status: 401 },
      );
    }

    const { data: sharedJournal, error: sharedError } = await supabase
      .from("journals")
      .select(
        `
        *,
        strategies:strategy_id (
          id,
          strategy_type
        )
      `,
      )
      .eq("id", journalId)
      .eq("is_shared", true)
      .neq("user_id", user.id)
      .single();

    if (sharedError || !sharedJournal) {
      return NextResponse.json(
        { ok: false, message: "Shared journal not found." },
        { status: 404 },
      );
    }

    const { data: existingCopy } = await supabase
      .from("journal_copies")
      .select("id")
      .eq("original_journal_id", sharedJournal.id)
      .eq("copied_by", user.id)
      .maybeSingle();

    if (existingCopy) {
      return NextResponse.json(
        { ok: false, message: "You already incorporated this journal." },
        { status: 409 },
      );
    }

    const snapshot = sharedJournal.strategy_snapshot || {};

    const strategyType =
      snapshot.strategy_type || sharedJournal.strategies?.strategy_type;

    if (!strategyType) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "This shared journal is missing strategy_type in both snapshot and source strategy.",
        },
        { status: 400 },
      );
    }

    const requiredFields = [
      "strategy_name",
      "trading_style",
      "setup_type",
      "bias_confluence",
      "htf",
      "entry_tf",
      "checklist",
      "entry_rules",
      "exit_rules",
      "sl_management_rules",
      "risk_per_trade",
      "avg_planned_rr",
      "planned_r_year",
      "preparation_status",
    ];

    const missingFields = requiredFields.filter((field) => {
      const value = snapshot[field];

      if (Array.isArray(value)) return value.length === 0;
      return value === undefined || value === null || value === "";
    });

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: `Shared journal is missing strategy fields: ${missingFields.join(
            ", ",
          )}.`,
        },
        { status: 400 },
      );
    }

    if (snapshot.preparation_status === "Active" && !snapshot.strategy_status) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Shared journal has Active preparation_status but missing strategy_status.",
        },
        { status: 400 },
      );
    }

    const { data: copiedStrategy, error: strategyError } = await supabase
      .from("strategies")
      .insert({
        user_id: user.id,

        strategy_name: `${snapshot.strategy_name} (Copied)`,
        strategy_type: strategyType,

        trading_style: snapshot.trading_style,
        setup_type: snapshot.setup_type,
        bias_confluence: snapshot.bias_confluence,
        htf: snapshot.htf,
        intermediate_tf: snapshot.intermediate_tf || null,
        entry_tf: snapshot.entry_tf,

        checklist: snapshot.checklist,
        entry_rules: snapshot.entry_rules,
        exit_rules: snapshot.exit_rules,
        sl_management_rules: snapshot.sl_management_rules,

        risk_per_trade: snapshot.risk_per_trade,
        avg_planned_rr: snapshot.avg_planned_rr,
        planned_r_year: snapshot.planned_r_year,

        preparation_status: snapshot.preparation_status,
        strategy_status:
          snapshot.preparation_status === "Active"
            ? snapshot.strategy_status
            : null,

        copied_from_strategy_id: sharedJournal.strategy_id,
        source_shared_journal_id: sharedJournal.id,
      })
      .select("id")
      .single();

    if (strategyError) {
      return NextResponse.json(
        { ok: false, message: strategyError.message },
        { status: 500 },
      );
    }

    const copiedSnapshot = {
      ...snapshot,
      strategy_type: strategyType,
      copied_from_journal_id: sharedJournal.id,
      copied_from_strategy_id: sharedJournal.strategy_id,
      copied_at: new Date().toISOString(),
    };

    const { data: copiedJournal, error: journalError } = await supabase
      .from("journals")
      .insert({
        user_id: user.id,

        strategy_id: copiedStrategy.id,
        trading_account_id: null,
        symbol_id: sharedJournal.symbol_id,

        purpose: "FOR OBSERVATION",
        status: null,
        direction: sharedJournal.direction,

        quantity: sharedJournal.quantity,
        entry_price: sharedJournal.entry_price,
        stop_loss: sharedJournal.stop_loss,
        take_profit: sharedJournal.take_profit,
        take_profit_qty: sharedJournal.take_profit_qty,

        entry_reason: sharedJournal.entry_reason,
        exit_reason: null,
        exit_price: null,

        risk_mode: sharedJournal.risk_mode,
        risk_per_trade: sharedJournal.risk_per_trade,

        strategy_snapshot: copiedSnapshot,

        setup_images: sharedJournal.setup_images || [],
        reference_images: sharedJournal.reference_images || [],

        copied_from_journal_id: sharedJournal.id,
        is_shared: false,
      })
      .select("id")
      .single();

    if (journalError) {
      return NextResponse.json(
        { ok: false, message: journalError.message },
        { status: 500 },
      );
    }

    const { error: copyError } = await supabase.from("journal_copies").insert({
      original_journal_id: sharedJournal.id,
      copied_journal_id: copiedJournal.id,
      copied_by: user.id,
    });

    if (copyError) {
      return NextResponse.json(
        { ok: false, message: copyError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      copiedJournalId: copiedJournal.id,
      copiedStrategyId: copiedStrategy.id,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error.message || "Something went wrong." },
      { status: 500 },
    );
  }
}
