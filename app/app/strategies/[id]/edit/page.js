import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StrategyForm from "../../strategy-form";

function parseJsonArray(value, fallback = []) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export default async function EditStrategyPage({ params }) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) redirect("/login");

  const { data: strategy, error } = await supabase
    .from("strategies")
    .select(
      `
      id,
      user_id,
      strategy_name,
      strategy_type,
      trading_style,
      setup_type,
      bias_confluence,
      htf,
      intermediate_tf,
      entry_tf,
      checklist,
      entry_rules,
      exit_rules,
      sl_management_rules,
      risk_per_trade,
      avg_planned_rr,
      planned_r_year,
      preparation_status,
      strategy_status,
      strategy_images,
      copied_from_strategy_id,
      source_shared_journal_id
      `,
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !strategy) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Edit Strategy</h1>
        <p className="mt-3 text-sm text-destructive">
          Strategy not found or you don’t have access.
        </p>
      </div>
    );
  }

  async function getSignedStrategyImageUrls(paths = []) {
    if (!Array.isArray(paths) || paths.length === 0) return [];

    const { data, error } = await supabase.storage
      .from("strategy-images")
      .createSignedUrls(paths, 60 * 60);

    if (error) {
      console.log("Strategy image signed URL error:", error.message);
      return [];
    }

    return data?.map((x) => x.signedUrl).filter(Boolean) || [];
  }

  const strategyImageUrls = await getSignedStrategyImageUrls(
    strategy.strategy_images,
  );

  const strategyWithImageUrls = {
    ...strategy,
    strategyImageUrls,
  };

  async function updateStrategy(prevState, formData) {
    "use server";

    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) return { ok: false, message: "Unauthorized." };

    const strategy_name = String(formData.get("strategy_name") || "").trim();
    const strategy_type = String(formData.get("strategy_type") || "").trim();
    const trading_style = String(formData.get("trading_style") || "").trim();
    const setup_type = String(formData.get("setup_type") || "").trim();

    const bias_confluence = parseJsonArray(formData.get("bias_confluence"));
    const htf = parseJsonArray(formData.get("htf"));
    const intermediate_tf = parseJsonArray(formData.get("intermediate_tf"));
    const entry_tf = parseJsonArray(formData.get("entry_tf"));
    const existing_strategy_images = parseJsonArray(
      formData.get("existing_strategy_images"),
    );

    const checklist = String(formData.get("checklist") || "").trim();
    const entry_rules = String(formData.get("entry_rules") || "").trim();
    const exit_rules = String(formData.get("exit_rules") || "").trim();
    const sl_management_rules = String(
      formData.get("sl_management_rules") || "",
    ).trim();

    const risk_per_trade = Number(formData.get("risk_per_trade"));
    const avg_planned_rr = String(formData.get("avg_planned_rr") || "").trim();
    const planned_r_year = Number(formData.get("planned_r_year"));

    const preparation_status = String(
      formData.get("preparation_status") || "",
    ).trim();

    const raw_strategy_status = String(
      formData.get("strategy_status") || "",
    ).trim();

    const strategy_status =
      preparation_status === "Active" ? raw_strategy_status : null;

    if (!strategy_name)
      return { ok: false, message: "Strategy name is required." };
    if (!strategy_type)
      return { ok: false, message: "Strategy type is required." };
    if (!trading_style)
      return { ok: false, message: "Trading style is required." };
    if (!setup_type) return { ok: false, message: "Setup type is required." };

    if (bias_confluence.length === 0) {
      return { ok: false, message: "Select at least one bias/confluence." };
    }

    if (htf.length === 0) {
      return { ok: false, message: "Select at least one HTF." };
    }

    if (entry_tf.length === 0) {
      return { ok: false, message: "Select at least one Entry TF." };
    }

    if (!checklist) return { ok: false, message: "Checklist is required." };
    if (!entry_rules)
      return { ok: false, message: "Entry rules are required." };
    if (!exit_rules) return { ok: false, message: "Exit rules are required." };
    if (!sl_management_rules) {
      return { ok: false, message: "SL management rules are required." };
    }

    if (!(risk_per_trade > 0)) {
      return { ok: false, message: "Risk per trade must be greater than 0." };
    }

    if (!/^[0-9]+:[0-9]+$/.test(avg_planned_rr)) {
      return { ok: false, message: "AVG Planned R:R must be like 1:2." };
    }

    if (!Number.isInteger(planned_r_year) || planned_r_year < 0) {
      return { ok: false, message: "Planned R/Year must be 0 or more." };
    }

    if (preparation_status === "Active" && !strategy_status) {
      return { ok: false, message: "Strategy status is required when Active." };
    }

    const { error: updateError } = await supabase
      .from("strategies")
      .update({
        strategy_name,
        strategy_type,
        trading_style,
        setup_type,
        bias_confluence,
        htf,
        intermediate_tf: intermediate_tf.length ? intermediate_tf : null,
        entry_tf,
        checklist,
        entry_rules,
        exit_rules,
        sl_management_rules,
        risk_per_trade,
        avg_planned_rr,
        planned_r_year,
        preparation_status,
        strategy_status,
        strategy_images: existing_strategy_images,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) return { ok: false, message: updateError.message };

    return {
      ok: true,
      message: "Strategy updated.",
      strategyId: id,
      redirectTo: "/app/strategies",
      existingStrategyImages: existing_strategy_images,
    };
  }

  return (
    <StrategyForm
      action={updateStrategy}
      strategy={strategyWithImageUrls}
      mode="edit"
    />
  );
}
