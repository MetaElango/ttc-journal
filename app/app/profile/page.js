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
      "id, account_name, account_size, framework, tag, daily_drawdown, max_drawdown, risk_per_trade, max_risk_exposure, is_hidden, created_at, target_mode, profit_target_percentage, r_collection_target, max_open_positions",
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
      return { ok: false, message: "Unauthorized." };
    }

    const account_id = String(formData.get("account_id") || "").trim();

    const account_name = String(formData.get("account_name") || "").trim();
    const tag = String(formData.get("tag") || "").trim();

    const daily_drawdown = Number(formData.get("daily_drawdown"));
    const max_drawdown = Number(formData.get("max_drawdown"));
    const risk_per_trade = Number(formData.get("risk_per_trade"));
    const max_risk_exposure = Number(formData.get("max_risk_exposure"));

    const target_mode = String(formData.get("target_mode") || "PROFIT_TARGET")
      .trim()
      .toUpperCase();

    const profit_target_percentage =
      target_mode === "PROFIT_TARGET"
        ? Number(formData.get("profit_target_percentage"))
        : null;

    const r_collection_target =
      target_mode === "R_COLLECTION"
        ? Number(formData.get("r_collection_target"))
        : null;

    const max_open_positions = Number(formData.get("max_open_positions"));

    if (!account_name || !tag) {
      return {
        ok: false,
        message: "Account name and tag are required.",
      };
    }

    if (Number.isNaN(daily_drawdown) || daily_drawdown < 0) {
      return { ok: false, message: "Daily drawdown is required." };
    }

    if (Number.isNaN(max_drawdown) || max_drawdown < 0) {
      return { ok: false, message: "Max drawdown is required." };
    }

    if (Number.isNaN(risk_per_trade) || risk_per_trade < 0) {
      return { ok: false, message: "Risk per trade is required." };
    }

    if (Number.isNaN(max_risk_exposure) || max_risk_exposure < 0) {
      return { ok: false, message: "Max risk exposure is required." };
    }

    if (!["PROFIT_TARGET", "R_COLLECTION"].includes(target_mode)) {
      return { ok: false, message: "Select a valid target type." };
    }

    if (
      target_mode === "PROFIT_TARGET" &&
      (Number.isNaN(profit_target_percentage) || profit_target_percentage < 0)
    ) {
      return { ok: false, message: "Profit target percentage is required." };
    }

    if (
      target_mode === "R_COLLECTION" &&
      (Number.isNaN(r_collection_target) || r_collection_target < 0)
    ) {
      return { ok: false, message: "R collection target is required." };
    }

    if (Number.isNaN(max_open_positions) || max_open_positions <= 0) {
      return { ok: false, message: "Max open positions is required." };
    }

    const editablePayload = {
      account_name,
      tag,
      daily_drawdown,
      max_drawdown,
      risk_per_trade,
      max_risk_exposure,
      target_mode,
      profit_target_percentage,
      r_collection_target,
      max_open_positions,
      updated_at: new Date().toISOString(),
    };

    if (account_id) {
      const { error } = await supabase
        .from("trading_accounts")
        .update(editablePayload)
        .eq("id", account_id)
        .eq("user_id", user.id);

      if (error) return { ok: false, message: error.message };

      revalidatePath("/app/profile");
      revalidatePath("/app");
      revalidatePath("/app/journals");

      return { ok: true, message: "Trading account updated." };
    }

    const framework = String(formData.get("framework") || "").trim();

    const account_size_preset = String(
      formData.get("account_size_preset") || "",
    ).trim();

    const account_size_custom = String(
      formData.get("account_size_custom") || "",
    ).trim();

    const account_size =
      account_size_preset === "custom"
        ? Number(account_size_custom)
        : Number(account_size_preset);

    if (!framework || !(account_size > 0)) {
      return {
        ok: false,
        message: "Account type and account size are required.",
      };
    }

    const { error } = await supabase.from("trading_accounts").insert({
      user_id: user.id,
      framework,
      account_size,
      ...editablePayload,
    });

    if (error) return { ok: false, message: error.message };

    revalidatePath("/app/profile");
    revalidatePath("/app");
    revalidatePath("/app/journals");

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
