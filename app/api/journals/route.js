// app/api/journals/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      return NextResponse.json(
        { ok: false, message: authError.message },
        { status: 401 },
      );
    }

    const user = authData?.user;
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data, error } = await supabase
      .from("journals")
      .select(
        `
        id,
        user_id,
        strategy_id,
        trading_account_id,
        symbol_id,
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
        strategy_snapshot,
        created_at,
        updated_at,
        symbols:symbol_id (
          id,
          symbol_name,
          category
        ),
        trading_accounts:trading_account_id (
          id,
          account_name,
          account_size,
          framework,
          tag
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      count: data?.length || 0,
      journals: data || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error?.message || "Something went wrong",
      },
      { status: 500 },
    );
  }
}
