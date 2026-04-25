import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SocialClient from "./social-client";

async function getSignedImageUrls(supabase, paths = []) {
  if (!Array.isArray(paths) || paths.length === 0) return [];

  const { data, error } = await supabase.storage
    .from("journal-images")
    .createSignedUrls(paths, 60 * 60);

  if (error) return [];

  return data?.map((x) => x.signedUrl).filter(Boolean) || [];
}

export default async function SocialPage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) redirect("/login");

  const { data: journals, error } = await supabase
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
      created_at,
      shared_at,
      strategy_snapshot,
      symbols:symbol_id (
        id,
        symbol_name,
        category
      )
    `,
    )
    .eq("is_shared", true)
    .neq("user_id", user.id)
    .order("shared_at", { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Social</h1>
        <p className="mt-3 text-sm text-destructive">{error.message}</p>
      </div>
    );
  }

  const sharedJournals = await Promise.all(
    (journals || []).map(async (journal) => ({
      ...journal,
      setupImageUrls: await getSignedImageUrls(supabase, journal.setup_images),
      referenceImageUrls: await getSignedImageUrls(
        supabase,
        journal.reference_images,
      ),
    })),
  );

  return <SocialClient journals={sharedJournals} />;
}
