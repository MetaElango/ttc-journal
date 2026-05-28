// app/app/playbooks/page.js

import { createClient } from "@/lib/supabase/server";
import StrategiesClient from "./strategies-client";

async function getSignedImageUrls(supabase, paths = []) {
  if (!Array.isArray(paths) || paths.length === 0) return [];

  const { data, error } = await supabase.storage
    .from("strategy-images") // change bucket name if your strategy images use another bucket
    .createSignedUrls(paths, 60 * 60);

  if (error) {
    console.log("STRATEGY IMAGE SIGNED URL ERROR:", error.message);
    return [];
  }

  return data?.map((x) => x.signedUrl).filter(Boolean) || [];
}

export default async function StrategiesPage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Strategies</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please login to see your strategies.
        </p>
      </div>
    );
  }

  const { data: strategies, error } = await supabase
    .from("strategies")
    .select(
      `
      id,
      user_id,
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
      planned_r_year,
      created_at,
      updated_at,
      copied_from_strategy_id,
      source_shared_journal_id,
      strategy_type,
      sl_management_rules,
      risk_per_trade,
      avg_planned_rr,
      planned_r_year,
      strategy_images,
      updated_at
      `,
    )
    .eq("user_id", user.id)
    .is("copied_from_strategy_id", null)
    .is("source_shared_journal_id", null)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Strategies</h1>
        <p className="mt-3 text-sm text-destructive">{error.message}</p>
      </div>
    );
  }
  const strategiesWithImages = await Promise.all(
    (strategies || []).map(async (strategy) => ({
      ...strategy,
      strategyImageUrls: await getSignedImageUrls(
        supabase,
        strategy.strategy_images || [],
      ),
    })),
  );

  return <StrategiesClient strategies={strategiesWithImages} />;

  return <StrategiesClient strategies={strategies || []} />;
}
