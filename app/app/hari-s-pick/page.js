import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SocialClient from "../circle/social-client";

export default async function HariPickPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: sharedJournals, error: error } = await supabase
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

  return (
    <SocialClient
      journals={sharedJournals || []}
      title="Hari's Pick"
      description="High conviction setups shared by Hari"
    />
  );
}
