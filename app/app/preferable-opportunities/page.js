import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SocialClient from "../circle/social-client";

const journalSelect = `
  id,
  user_id,
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
  created_at,
  updated_at,
  shared_at,
  is_shared,
  mentor_pick_priority,
  htf,
  entry_tf,
  strategy_snapshot,
  symbols:symbol_id (
    id,
    symbol_name
  )
`;

export default async function PreferableOpportunitiesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: journals, error } = await supabase
    .from("journals")
    .select(
      `
      ${journalSelect},
      profiles:user_id!inner (
        id,
        type
      )
    `,
    )
    .eq("is_shared", true)
    .eq("profiles.type", "user")
    .not("mentor_pick_priority", "is", null)
    .order("mentor_pick_priority", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
  }

  return (
    <SocialClient journals={journals || []} title="Preferable Opportunities" />
  );
}
