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
  owner_note,
  admin_note,
  setup_images,
  reference_images,
  symbols:symbol_id (
    id,
    symbol_name
  )
`;

export default async function MostDiscussedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: journals, error } = await supabase
    .from("journals")
    .select(
      `
      ${journalSelect},
      profiles:user_id!inner (
        id,
        type,
        full_name,
        username,
        avatar_url
      ),
      journal_comments (
        id
      )
    `,
    )
    .eq("is_shared", true)
    .eq("profiles.type", "user");

  if (error) {
    console.error("Most Discussed Error:", error);
  }

  const sortedJournals = (journals || [])
    .map((journal) => ({
      ...journal,
      total_comments: journal.journal_comments?.length || 0,
    }))
    .sort((a, b) => {
      if (b.total_comments !== a.total_comments) {
        return b.total_comments - a.total_comments;
      }

      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });

  return (
    <SocialClient journals={sortedJournals} title="Most Discussed Setups" />
  );
}
