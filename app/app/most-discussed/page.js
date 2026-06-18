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
    symbol_name,
    category
  )
`;

async function withSignedImageUrls(supabase, journals = []) {
  return Promise.all(
    journals.map(async (journal) => {
      const setupImageUrls = await Promise.all(
        (journal.setup_images || []).map(async (path) => {
          const { data } = await supabase.storage
            .from("journal-images")
            .createSignedUrl(path, 60 * 60);

          return data?.signedUrl || null;
        }),
      );

      const referenceImageUrls = await Promise.all(
        (journal.reference_images || []).map(async (path) => {
          const { data } = await supabase.storage
            .from("journal-images")
            .createSignedUrl(path, 60 * 60);

          return data?.signedUrl || null;
        }),
      );

      return {
        ...journal,
        setupImageUrls: setupImageUrls.filter(Boolean),
        referenceImageUrls: referenceImageUrls.filter(Boolean),
      };
    }),
  );
}

export default async function MostDiscussedPage() {
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

    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Most Discussed Setups</h1>
        <p className="mt-3 text-sm text-destructive">{error.message}</p>
      </div>
    );
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

  const journalsWithImages = await withSignedImageUrls(
    supabase,
    sortedJournals,
  );

  return (
    <SocialClient
      journals={journalsWithImages}
      title="Most Discussed Setups"
      description="Shared trade setups ranked by community discussion and recent activity."
    />
  );
}
