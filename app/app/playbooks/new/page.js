import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewStrategyForm from "../strategy-form";

export default async function NewStrategyPage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) redirect("/login");

  async function createStrategy(prevState, formData) {
    "use server";

    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      return { ok: false, message: "Unauthorized." };
    }

    const parseJsonArray = (key) => {
      const raw = formData.get(key);

      if (!raw) return [];

      try {
        const value = JSON.parse(raw);
        return Array.isArray(value) ? value : [];
      } catch {
        return [];
      }
    };

    const strategy_name = String(formData.get("strategy_name") || "").trim();
    const strategy_type = String(formData.get("strategy_type") || "").trim();
    const trading_style = String(formData.get("trading_style") || "").trim();
    const setup_type = String(formData.get("setup_type") || "").trim();

    const bias_confluence = parseJsonArray("bias_confluence");
    const htf = parseJsonArray("htf");
    const intermediate_tf = parseJsonArray("intermediate_tf");
    const entry_tf = parseJsonArray("entry_tf");

    const checklist = String(formData.get("checklist") || "").trim();
    const entry_rules = String(formData.get("entry_rules") || "").trim();
    const exit_rules = String(formData.get("exit_rules") || "").trim();
    const sl_management_rules = String(
      formData.get("sl_management_rules") || "",
    ).trim();

    const risk_per_trade = Number(
      String(formData.get("risk_per_trade") || "").trim(),
    );

    const avg_planned_rr = String(formData.get("avg_planned_rr") || "").trim();

    const planned_r_year = Number(
      String(formData.get("planned_r_year") || "").trim(),
    );

    const preparation_status = String(
      formData.get("preparation_status") || "",
    ).trim();

    const strategy_status =
      preparation_status === "Active"
        ? String(formData.get("strategy_status") || "").trim()
        : null;

    if (
      !strategy_name ||
      !strategy_type ||
      !trading_style ||
      !setup_type ||
      !checklist ||
      !entry_rules ||
      !exit_rules ||
      !sl_management_rules ||
      !avg_planned_rr ||
      !preparation_status
    ) {
      return { ok: false, message: "Please fill all required fields." };
    }

    if (bias_confluence.length === 0) {
      return { ok: false, message: "Select at least one bias/confluence." };
    }

    if (htf.length === 0) {
      return { ok: false, message: "Select at least one HTF." };
    }

    if (entry_tf.length === 0) {
      return { ok: false, message: "Select at least one Entry TF." };
    }

    if (!(risk_per_trade > 0)) {
      return {
        ok: false,
        message: "Risk Per Trade must be a positive number.",
      };
    }

    if (!/^[0-9]+:[0-9]+$/.test(avg_planned_rr)) {
      return {
        ok: false,
        message: "AVG Planned R:R must be like 1:2.",
      };
    }

    if (!Number.isInteger(planned_r_year) || planned_r_year < 0) {
      return {
        ok: false,
        message: "Planned R/Year must be a whole number.",
      };
    }

    if (preparation_status === "Active" && !strategy_status) {
      return {
        ok: false,
        message: "Strategy Status is required when preparation is Active.",
      };
    }

    const { data: insertedStrategy, error } = await supabase
      .from("strategies")
      .insert({
        user_id: user.id,
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
        strategy_images: [],
      })
      .select("id")
      .single();

    if (error) return { ok: false, message: error.message };

    return {
      ok: true,
      message: "Strategy created.",
      strategyId: insertedStrategy.id,
      redirectTo: "/app/playbooks",
    };
  }

  return <NewStrategyForm action={createStrategy} mode="create" />;
}
