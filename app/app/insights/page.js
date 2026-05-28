// app/app/insights/page.js

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MetricsDashboard from "./_components/metrics-dashboard";

export default async function MetricsPage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) redirect("/login");

  const { data: journals, error } = await supabase
    .from("journals")
    .select(
      `
      *,
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
    .eq("user_id", user.id)
    .order("journal_end_at", { ascending: true });

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-600">
        {error.message}
      </div>
    );
  }

  const { data: accounts } = await supabase
    .from("trading_accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const { data: strategies } = await supabase
    .from("strategies")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <MetricsDashboard
      journals={journals || []}
      accounts={accounts || []}
      strategies={strategies || []}
    />
  );
}
