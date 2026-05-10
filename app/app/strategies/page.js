import { createClient } from "@/lib/supabase/server";
import StrategiesClient from "./strategies-client";

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
      preparation_status,
      strategy_status,
      trading_style,
      setup_type,
      bias_confluence,
      checklist,
      entry_rules,
      exit_rules,
      created_at,
      copied_from_strategy_id,
      source_shared_journal_id
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

  return <StrategiesClient strategies={strategies || []} />;
}
