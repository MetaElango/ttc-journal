// app/api/journals/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getPublicImageUrls(supabase, paths = []) {
  if (!Array.isArray(paths) || paths.length === 0) return [];

  return paths.map((path) => {
    const { data } = supabase.storage.from("journal-images").getPublicUrl(path);

    return data?.publicUrl || "";
  });
}

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
    setup_images,
    reference_images,
    journal_start_at,
    journal_end_at,
    is_shared,
    shared_at,
    copied_from_journal_id,
    created_at,
    updated_at,
    symbols:symbol_id (
      id,
      symbol_name,
      category
    ),
    trading_accounts!inner (
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
      .eq("trading_accounts.is_hidden", false)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 },
      );
    }

    const journals = await Promise.all(
      (data || []).map(async (journal) => ({
        ...journal,
        setupImageUrls: await getPublicImageUrls(
          supabase,
          journal.setup_images || [],
        ),
        referenceImageUrls: await getPublicImageUrls(
          supabase,
          journal.reference_images || [],
        ),
      })),
    );

    return NextResponse.json({
      ok: true,
      count: journals.length,
      journals,
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
