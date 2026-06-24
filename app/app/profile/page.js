import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import ProfileClient from "./profile-client";

function getFormValue(formData, key) {
  for (const [k, value] of formData.entries()) {
    if (k === key || k.endsWith(`_${key}`)) {
      return value;
    }
  }

  return null;
}

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
    .select(
      "id, account_name, account_size, framework, tag, daily_drawdown, max_drawdown, risk_per_trade, max_risk_exposure, is_hidden, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  async function updateProfile(prevState, formData) {
    "use server";

    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) return { ok: false, message: "Unauthorized." };

    const full_name = String(getFormValue(formData, "full_name") || "").trim();
    const country = String(getFormValue(formData, "country") || "").trim();
    const experience_level = String(
      getFormValue(formData, "experience_level") || "",
    ).trim();

    const instagram_handle = String(
      getFormValue(formData, "instagram_handle") || "",
    ).trim();

    const discord_handle = String(
      getFormValue(formData, "discord_handle") || "",
    ).trim();

    if (!full_name || !country || !experience_level) {
      return { ok: false, message: "Please fill all profile fields." };
    }

    let avatar_url = String(
      getFormValue(formData, "existing_avatar_url") || "",
    ).trim();

    const avatarFile = getFormValue(formData, "avatar_file");

    if (avatarFile && typeof avatarFile === "object" && avatarFile.size > 0) {
      if (!avatarFile.type?.startsWith("image/")) {
        return { ok: false, message: "Please upload a valid image file." };
      }

      const ext = avatarFile.name?.split(".").pop() || "png";
      const filePath = `${user.id}/profile-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, {
          upsert: true,
          contentType: avatarFile.type || "image/png",
        });

      if (uploadError) {
        return { ok: false, message: uploadError.message };
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      avatar_url = data.publicUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name,
        country,
        experience_level,
        avatar_url: avatar_url || null,
        instagram_handle: instagram_handle || null,
        discord_handle: discord_handle || null,
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

    if (!user) {
      return {
        ok: false,
        message: "Unauthorized.",
      };
    }

    const account_name = String(formData.get("account_name") || "").trim();

    const framework = String(formData.get("framework") || "").trim();

    const tag = String(formData.get("tag") || "").trim();

    const account_size_preset = String(
      formData.get("account_size_preset") || "",
    ).trim();

    const account_size_custom = String(
      formData.get("account_size_custom") || "",
    ).trim();

    const daily_drawdown = Number(formData.get("daily_drawdown"));

    const max_drawdown = Number(formData.get("max_drawdown"));

    const risk_per_trade = Number(formData.get("risk_per_trade"));

    const max_risk_exposure = Number(formData.get("max_risk_exposure"));

    let account_size = 0;

    if (account_size_preset === "custom") {
      account_size = Number(account_size_custom);
    } else {
      account_size = Number(account_size_preset);
    }

    if (!account_name || !framework || !tag || !(account_size > 0)) {
      return {
        ok: false,
        message:
          "Account name, account type, tag and account size are required.",
      };
    }

    const { error } = await supabase.from("trading_accounts").insert({
      user_id: user.id,

      account_name,

      framework,

      tag,

      account_size,

      daily_drawdown,

      max_drawdown,

      risk_per_trade,

      max_risk_exposure,
    });

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    revalidatePath("/app/profile");

    return {
      ok: true,
      message: "Trading account added.",
    };
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

  async function toggleTradingAccountVisibility(formData) {
    "use server";

    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) redirect("/login");

    const accountId = String(formData.get("account_id") || "");
    const isHidden = String(formData.get("is_hidden") || "") === "true";

    if (!accountId) return;

    await supabase
      .from("trading_accounts")
      .update({
        is_hidden: isHidden,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId)
      .eq("user_id", user.id);

    revalidatePath("/app/profile");
    revalidatePath("/app");
    revalidatePath("/app/journals");
  }
  return (
    <ProfileClient
      user={user}
      profile={profile}
      tradingAccounts={tradingAccounts || []}
      updateProfile={updateProfile}
      createTradingAccount={createTradingAccount}
      deleteTradingAccount={deleteTradingAccount}
      toggleTradingAccountVisibility={toggleTradingAccountVisibility}
    />
  );
}
