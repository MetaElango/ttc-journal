// app/app/profile/page.js

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import ProfileClient from "./profile-client";

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: tradingAccounts } = await supabase
    .from("trading_accounts")
    .select("id, account_name, account_size, framework, tag, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  async function updateProfile(prevState, formData) {
    "use server";

    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) return { ok: false, message: "Unauthorized." };

    const full_name = String(formData.get("full_name") || "").trim();
    const country = String(formData.get("country") || "").trim();
    const experience_level = String(
      formData.get("experience_level") || "",
    ).trim();

    if (!full_name || !country || !experience_level) {
      return { ok: false, message: "Please fill all profile fields." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name,
        country,
        experience_level,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) return { ok: false, message: error.message };

    revalidatePath("/app/profile");
    revalidatePath("/app");

    return { ok: true, message: "Profile updated." };
  }

  async function createTradingAccount(prevState, formData) {
    "use server";

    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) return { ok: false, message: "Unauthorized." };

    const account_name = String(formData.get("account_name") || "").trim();
    const framework = String(formData.get("framework") || "").trim();
    const tag = String(formData.get("tag") || "").trim();
    const account_size = Number(formData.get("account_size"));

    if (!account_name || !framework || !(account_size > 0)) {
      return {
        ok: false,
        message: "Account name, framework and account size are required.",
      };
    }

    const { error } = await supabase.from("trading_accounts").insert({
      user_id: user.id,
      account_name,
      framework,
      tag: tag || null,
      account_size,
    });

    if (error) return { ok: false, message: error.message };

    revalidatePath("/app/profile");

    return { ok: true, message: "Trading account added." };
  }

  async function deleteTradingAccount(formData) {
    "use server";

    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) redirect("/login");

    const accountId = String(formData.get("account_id") || "");

    if (!accountId) return;

    await supabase
      .from("trading_accounts")
      .delete()
      .eq("id", accountId)
      .eq("user_id", user.id);

    revalidatePath("/app/profile");
  }

  return (
    <ProfileClient
      user={user}
      profile={profile}
      tradingAccounts={tradingAccounts || []}
      updateProfile={updateProfile}
      createTradingAccount={createTradingAccount}
      deleteTradingAccount={deleteTradingAccount}
    />
  );
}
