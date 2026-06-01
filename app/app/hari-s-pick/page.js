import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SocialClient from "../circle/social-client";

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

export default async function HariPickPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: sharedJournals, error } = await supabase
    .from("journals")
    .select(
      `
      *,
      profiles:user_id!inner (
        id,
        full_name,
        type
      ),
      symbols:symbol_id (
        id,
        symbol_name
      )
    `,
    )
    .eq("is_shared", true)
    .eq("profiles.type", "admin")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
  }

  const journalsWithImages = await withSignedImageUrls(
    supabase,
    sharedJournals || [],
  );

  return (
    <SocialClient
      journals={journalsWithImages}
      title="Hari's Pick"
      description="High conviction setups shared by Hari"
    />
  );
}
