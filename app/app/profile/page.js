import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import ProfileClient from "./profile-client";

function getFormValue(formData, key) {
  for (const [formKey, value] of formData.entries()) {
    if (formKey === key || formKey.endsWith(`_${key}`)) {
      return value;
    }
  }

  return null;
}

function toOptionalPositiveNumber(value) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return NaN;
  }

  return parsed;
}

function toOptionalPositiveInteger(value) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return NaN;
  }

  return parsed;
}

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    profileResult,
    tradingAccountsResult,
    symbolsResult,
    accountSymbolSettingsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),

    supabase
      .from("trading_accounts")
      .select(
        `
          id,
          account_name,
          account_size,
          framework,
          tag,
          daily_drawdown,
          max_drawdown,
          risk_per_trade,
          max_risk_exposure,
          is_hidden,
          created_at,
          target_mode,
          profit_target_percentage,
          r_collection_target,
          max_open_positions
        `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("symbols")
      .select(
        `
          id,
          symbol_name,
          full_name,
          category,
          asset_class,
          contract_size,
          leverage,
          tick_size,
          decimal_places,
          min_lot,
          lot_step,
          is_active
        `,
      )
      .eq("is_active", true)
      .order("category")
      .order("symbol_name"),

    supabase
      .from("trading_account_symbol_settings")
      .select(
        `
          id,
          user_id,
          trading_account_id,
          symbol_id,
          contract_size,
          leverage,
          created_at,
          updated_at,
          symbols:symbol_id (
            id,
            symbol_name,
            full_name,
            category,
            asset_class,
            contract_size,
            leverage,
            tick_size,
            decimal_places
          )
        `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const profile = profileResult.data;
  const tradingAccounts = tradingAccountsResult.data || [];
  const symbols = symbolsResult.data || [];
  const accountSymbolSettings = accountSymbolSettingsResult.data || [];

  async function updateProfile(prevState, formData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ok: false,
        message: "Unauthorized.",
      };
    }

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
      return {
        ok: false,
        message: "Please fill all profile fields.",
      };
    }

    let avatar_url = String(
      getFormValue(formData, "existing_avatar_url") || "",
    ).trim();

    const avatarFile = getFormValue(formData, "avatar_file");

    if (avatarFile && typeof avatarFile === "object" && avatarFile.size > 0) {
      if (!avatarFile.type?.startsWith("image/")) {
        return {
          ok: false,
          message: "Please upload a valid image file.",
        };
      }

      const extension =
        avatarFile.name?.split(".").pop()?.toLowerCase() || "png";

      const filePath = `${user.id}/profile-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, {
          upsert: true,
          contentType: avatarFile.type || "image/png",
        });

      if (uploadError) {
        return {
          ok: false,
          message: uploadError.message,
        };
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

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    revalidatePath("/app/profile");
    revalidatePath("/app");

    return {
      ok: true,
      message: "Profile updated.",
    };
  }

  async function createTradingAccount(prevState, formData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ok: false,
        message: "Unauthorized.",
      };
    }

    const account_id = String(
      getFormValue(formData, "account_id") || "",
    ).trim();

    const account_name = String(
      getFormValue(formData, "account_name") || "",
    ).trim();

    const tag = String(getFormValue(formData, "tag") || "").trim();

    const daily_drawdown = Number(getFormValue(formData, "daily_drawdown"));

    const max_drawdown = Number(getFormValue(formData, "max_drawdown"));

    const risk_per_trade = Number(getFormValue(formData, "risk_per_trade"));

    const max_risk_exposure = Number(
      getFormValue(formData, "max_risk_exposure"),
    );

    const target_mode = String(
      getFormValue(formData, "target_mode") || "PROFIT_TARGET",
    )
      .trim()
      .toUpperCase();

    const profit_target_percentage =
      target_mode === "PROFIT_TARGET"
        ? Number(getFormValue(formData, "profit_target_percentage"))
        : null;

    const r_collection_target =
      target_mode === "R_COLLECTION"
        ? Number(getFormValue(formData, "r_collection_target"))
        : null;

    const max_open_positions = Number(
      getFormValue(formData, "max_open_positions"),
    );

    if (!account_name || !tag) {
      return {
        ok: false,
        message: "Account name and tag are required.",
      };
    }

    if (!Number.isFinite(daily_drawdown) || daily_drawdown < 0) {
      return {
        ok: false,
        message: "Daily drawdown is required.",
      };
    }

    if (!Number.isFinite(max_drawdown) || max_drawdown < 0) {
      return {
        ok: false,
        message: "Max drawdown is required.",
      };
    }

    if (!Number.isFinite(risk_per_trade) || risk_per_trade < 0) {
      return {
        ok: false,
        message: "Risk per trade is required.",
      };
    }

    if (!Number.isFinite(max_risk_exposure) || max_risk_exposure < 0) {
      return {
        ok: false,
        message: "Max risk exposure is required.",
      };
    }

    if (!["PROFIT_TARGET", "R_COLLECTION"].includes(target_mode)) {
      return {
        ok: false,
        message: "Select a valid target type.",
      };
    }

    if (
      target_mode === "PROFIT_TARGET" &&
      (!Number.isFinite(profit_target_percentage) ||
        profit_target_percentage < 0)
    ) {
      return {
        ok: false,
        message: "Profit target percentage is required.",
      };
    }

    if (
      target_mode === "R_COLLECTION" &&
      (!Number.isFinite(r_collection_target) || r_collection_target < 0)
    ) {
      return {
        ok: false,
        message: "R collection target is required.",
      };
    }

    if (!Number.isInteger(max_open_positions) || max_open_positions <= 0) {
      return {
        ok: false,
        message: "Max open positions is required.",
      };
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
      const { data: existingAccount, error: existingAccountError } =
        await supabase
          .from("trading_accounts")
          .select("id")
          .eq("id", account_id)
          .eq("user_id", user.id)
          .single();

      if (existingAccountError || !existingAccount) {
        return {
          ok: false,
          message: "Trading account not found.",
        };
      }

      const { error } = await supabase
        .from("trading_accounts")
        .update(editablePayload)
        .eq("id", account_id)
        .eq("user_id", user.id);

      if (error) {
        return {
          ok: false,
          message: error.message,
        };
      }

      revalidatePath("/app/profile");
      revalidatePath("/app");
      revalidatePath("/app/journals");
      revalidatePath("/app/radars");

      return {
        ok: true,
        message: "Trading account updated.",
      };
    }

    const framework = String(getFormValue(formData, "framework") || "").trim();

    const account_size_preset = String(
      getFormValue(formData, "account_size_preset") || "",
    ).trim();

    const account_size_custom = String(
      getFormValue(formData, "account_size_custom") || "",
    ).trim();

    const account_size =
      account_size_preset === "custom"
        ? Number(account_size_custom)
        : Number(account_size_preset);

    if (!framework || !Number.isFinite(account_size) || account_size <= 0) {
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

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    revalidatePath("/app/profile");
    revalidatePath("/app");
    revalidatePath("/app/journals");
    revalidatePath("/app/radars");

    return {
      ok: true,
      message: "Trading account added.",
    };
  }

  async function deleteTradingAccount(formData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const accountId = String(getFormValue(formData, "account_id") || "").trim();

    if (!accountId) {
      return;
    }

    const { error } = await supabase
      .from("trading_accounts")
      .delete()
      .eq("id", accountId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to delete trading account:", error);
      return;
    }

    revalidatePath("/app/profile");
    revalidatePath("/app");
    revalidatePath("/app/journals");
    revalidatePath("/app/radars");
  }

  async function toggleTradingAccountVisibility(formData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const accountId = String(getFormValue(formData, "account_id") || "").trim();

    const isHidden =
      String(getFormValue(formData, "is_hidden") || "").trim() === "true";

    if (!accountId) {
      return;
    }

    const { error } = await supabase
      .from("trading_accounts")
      .update({
        is_hidden: isHidden,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to update trading account visibility:", error);
      return;
    }

    revalidatePath("/app/profile");
    revalidatePath("/app");
    revalidatePath("/app/journals");
    revalidatePath("/app/radars");
  }

  async function saveAccountSymbolSetting(prevState, formData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ok: false,
        message: "Unauthorized.",
      };
    }

    const tradingAccountId = String(
      getFormValue(formData, "trading_account_id") || "",
    ).trim();

    const symbolId = String(getFormValue(formData, "symbol_id") || "").trim();

    const contractSize = toOptionalPositiveNumber(
      getFormValue(formData, "contract_size"),
    );

    const leverage = toOptionalPositiveInteger(
      getFormValue(formData, "leverage"),
    );

    if (!tradingAccountId || !symbolId) {
      return {
        ok: false,
        message: "Trading account and symbol are required.",
      };
    }

    if (Number.isNaN(contractSize)) {
      return {
        ok: false,
        message: "Contract size must be greater than zero.",
      };
    }

    if (Number.isNaN(leverage)) {
      return {
        ok: false,
        message: "Leverage must be a positive whole number.",
      };
    }

    const { data: account, error: accountError } = await supabase
      .from("trading_accounts")
      .select("id")
      .eq("id", tradingAccountId)
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      return {
        ok: false,
        message: "Trading account not found.",
      };
    }

    const { data: symbol, error: symbolError } = await supabase
      .from("symbols")
      .select("id")
      .eq("id", symbolId)
      .eq("is_active", true)
      .single();

    if (symbolError || !symbol) {
      return {
        ok: false,
        message: "Symbol not found.",
      };
    }

    /*
      When both values are empty, there is no reason to retain an override.
      Delete the existing row and fall back to the master symbol values.
    */
    if (contractSize === null && leverage === null) {
      const { error: deleteError } = await supabase
        .from("trading_account_symbol_settings")
        .delete()
        .eq("user_id", user.id)
        .eq("trading_account_id", tradingAccountId)
        .eq("symbol_id", symbolId);

      if (deleteError) {
        return {
          ok: false,
          message: deleteError.message,
        };
      }

      revalidatePath("/app/profile");
      revalidatePath("/app");
      revalidatePath("/app/journals");
      revalidatePath("/app/radars");

      return {
        ok: true,
        message: "Symbol override removed. Master settings will be used.",
      };
    }

    const { error } = await supabase
      .from("trading_account_symbol_settings")
      .upsert(
        {
          user_id: user.id,
          trading_account_id: tradingAccountId,
          symbol_id: symbolId,
          contract_size: contractSize,
          leverage,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "trading_account_id,symbol_id",
        },
      );

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    revalidatePath("/app/profile");
    revalidatePath("/app");
    revalidatePath("/app/journals");
    revalidatePath("/app/radars");

    return {
      ok: true,
      message: "Symbol settings saved.",
    };
  }

  async function deleteAccountSymbolSetting(formData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const settingId = String(getFormValue(formData, "setting_id") || "").trim();

    if (!settingId) {
      return;
    }

    const { error } = await supabase
      .from("trading_account_symbol_settings")
      .delete()
      .eq("id", settingId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to remove symbol override:", error);
      return;
    }

    revalidatePath("/app/profile");
    revalidatePath("/app");
    revalidatePath("/app/journals");
    revalidatePath("/app/radars");
  }

  return (
    <ProfileClient
      user={user}
      profile={profile}
      tradingAccounts={tradingAccounts}
      symbols={symbols}
      accountSymbolSettings={accountSymbolSettings}
      updateProfile={updateProfile}
      createTradingAccount={createTradingAccount}
      deleteTradingAccount={deleteTradingAccount}
      toggleTradingAccountVisibility={toggleTradingAccountVisibility}
      saveAccountSymbolSetting={saveAccountSymbolSetting}
      deleteAccountSymbolSetting={deleteAccountSymbolSetting}
    />
  );
}
