import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SocialClient from "./social-client";

const SAFE_EMPTY_ID = "00000000-0000-0000-0000-000000000000";

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

function getJournalChanges(oldSnapshot, currentJournal) {
  if (!oldSnapshot || !currentJournal) return [];

  const fields = [
    ["status", "Status"],
    ["entry_price", "Entry Price"],
    ["stop_loss", "Stop Loss"],
    ["take_profit", "Take Profit"],
    ["take_profit_qty", "TP Quantity"],
    ["entry_reason", "Entry Reason"],
    ["exit_reason", "Exit Reason"],
    ["exit_price", "Exit Price"],
    ["risk_per_trade", "Risk Per Trade"],
    ["risk_mode", "Risk Mode"],
    ["htf", "HTF"],
    ["entry_tf", "Entry TF"],
    ["quantity", "Quantity"],
    ["direction", "Direction"],
  ];

  return fields
    .map(([key, label]) => {
      const oldValue = oldSnapshot?.[key] ?? null;
      const newValue = currentJournal?.[key] ?? null;

      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return null;

      return { key, label, oldValue, newValue };
    })
    .filter(Boolean);
}

export default async function SocialPage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) redirect("/login");

  const { data: adminProfiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("type", "admin");

  const adminIds = (adminProfiles || []).map((p) => p.id);

  let query = supabase
    .from("journals")
    .select(
      `
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
      risk_mode,
      risk_per_trade,
      entry_reason,
      exit_reason,
      exit_price,
      setup_images,
      reference_images,
      journal_start_at,
      journal_end_at,
      created_at,
      updated_at,
      shared_at,
      strategy_snapshot,
      owner_note,
      admin_note,
      owner_note_updated_at,
      admin_note_updated_at,
      htf,
      entry_tf,

      profiles:user_id (
        id,
        full_name,
        username
      ),

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
  tag,
  is_hidden
)
      `,
    )
    .eq("is_shared", true)
    .neq("user_id", user.id);

  if (adminIds.length > 0) {
    query = query.not("user_id", "in", `(${adminIds.join(",")})`);
  }

  const { data: journals, error } = await query.order("updated_at", {
    descending: true,
  });

  const visibleJournals = (journals || []).filter(
    (journal) => !journal.trading_accounts?.is_hidden,
  );

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Community Picks</h1>
        <p className="mt-3 text-sm text-destructive">{error.message}</p>
      </div>
    );
  }

  const journalIds = visibleJournals.map((j) => j.id);
  const idsForQuery = journalIds.length ? journalIds : [SAFE_EMPTY_ID];

  const { data: allCopies, error: allCopiesError } = await supabase
    .from("journal_copies")
    .select("original_journal_id, copied_journal_id, copied_by, copied_at")
    .in("original_journal_id", idsForQuery);

  if (allCopiesError) console.log("ALL COPIES ERROR:", allCopiesError.message);

  const { data: myCopies, error: myCopiesError } = await supabase
    .from("journal_copies")
    .select(
      `
      original_journal_id,
      copied_journal_id,
      copied_by,
      copied_at,
      original_snapshot,
      original_updated_at,
      copied_journal_snapshot,
      original_share_version,
      copied_share_version
      `,
    )
    .eq("copied_by", user.id)
    .in("original_journal_id", idsForQuery);

  if (myCopiesError) console.log("MY COPIES ERROR:", myCopiesError.message);

  const { data: fallbackCopiedJournals, error: fallbackError } = await supabase
    .from("journals")
    .select("id, user_id, copied_from_journal_id, created_at")
    .in("copied_from_journal_id", idsForQuery);

  if (fallbackError) {
    console.log("FALLBACK COPIED JOURNALS ERROR:", fallbackError.message);
  }

  const { data: myReactions, error: reactionsError } = await supabase
    .from("journal_reactions")
    .select("journal_id, reaction")
    .eq("user_id", user.id)
    .in("journal_id", idsForQuery);

  if (reactionsError) console.log("REACTIONS ERROR:", reactionsError.message);

  const reactionMap = new Map();
  (myReactions || []).forEach((r) => {
    reactionMap.set(r.journal_id, r.reaction);
  });

  const copyMap = new Map();

  (myCopies || []).forEach((copy) => {
    const latestJournal = visibleJournals.find(
      (j) => j.id === copy.original_journal_id,
    );

    copyMap.set(copy.original_journal_id, {
      copiedJournalId: copy.copied_journal_id,
      copiedAt: copy.copied_at,
      source: "journal_copies",
      originalSnapshot: copy.original_snapshot,
      originalUpdatedAt: copy.original_updated_at,
      copiedJournalSnapshot: copy.copied_journal_snapshot,
      originalShareVersion: copy.original_share_version || 1,
      copiedShareVersion: copy.copied_share_version || 1,
      updatedFields: getJournalChanges(copy.original_snapshot, latestJournal),
    });
  });

  (fallbackCopiedJournals || [])
    .filter((journal) => journal.user_id === user.id)
    .forEach((journal) => {
      if (!journal.copied_from_journal_id) return;

      const existing = copyMap.get(journal.copied_from_journal_id);

      if (existing?.source === "journal_copies") return;

      copyMap.set(journal.copied_from_journal_id, {
        copiedJournalId: journal.id,
        copiedAt: journal.created_at,
        source: "journals_fallback",
        originalSnapshot: null,
        originalUpdatedAt: null,
        copiedJournalSnapshot: null,
        originalShareVersion: 1,
        copiedShareVersion: 1,
        updatedFields: [],
      });
    });

  const incorporatedUserMap = new Map();

  (allCopies || []).forEach((copy) => {
    if (!copy.original_journal_id || !copy.copied_by) return;

    if (!incorporatedUserMap.has(copy.original_journal_id)) {
      incorporatedUserMap.set(copy.original_journal_id, new Set());
    }

    incorporatedUserMap.get(copy.original_journal_id).add(copy.copied_by);
  });

  (fallbackCopiedJournals || []).forEach((journal) => {
    if (!journal.copied_from_journal_id || !journal.user_id) return;

    if (!incorporatedUserMap.has(journal.copied_from_journal_id)) {
      incorporatedUserMap.set(journal.copied_from_journal_id, new Set());
    }

    incorporatedUserMap
      .get(journal.copied_from_journal_id)
      .add(journal.user_id);
  });

  const sharedJournals = await Promise.all(
    visibleJournals.map(async (journal) => {
      const copy = copyMap.get(journal.id);

      const authorUpdatedAt = journal.updated_at
        ? new Date(journal.updated_at).getTime()
        : 0;

      const copiedAt = copy?.copiedAt ? new Date(copy.copiedAt).getTime() : 0;

      return {
        ...journal,

        setupImageUrls: await getSignedImageUrls(
          supabase,
          journal.setup_images,
        ),

        referenceImageUrls: await getSignedImageUrls(
          supabase,
          journal.reference_images,
        ),

        myReaction: reactionMap.get(journal.id) || null,

        copyStatus: {
          incorporated: !!copy,
          copiedJournalId: copy?.copiedJournalId || null,
          copiedAt: copy?.copiedAt || null,
          authorUpdatedAfterCopy: !!copy && authorUpdatedAt > copiedAt,
          source: copy?.source || null,
          originalSnapshot: copy?.originalSnapshot || null,
          originalUpdatedAt: copy?.originalUpdatedAt || null,
          copiedJournalSnapshot: copy?.copiedJournalSnapshot || null,
          originalShareVersion: copy?.originalShareVersion || 1,
          copiedShareVersion: copy?.copiedShareVersion || 1,
          updatedFields: copy?.updatedFields || [],
        },

        incorporatedCount: incorporatedUserMap.get(journal.id)?.size || 0,
      };
    }),
  );

  return (
    <SocialClient
      journals={sharedJournals}
      title="Community Picks"
      description="Explore shared trade ideas, review other traders’ setups, and incorporate useful opportunities into your own journal."
    />
  );
}
