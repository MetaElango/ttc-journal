import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewStrategyForm from "./strategy-form";

export default async function NewStrategyPage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) redirect("/login");

  async function createStrategy(prevState, formData) {
    "use server";

    const supabase = await createClient();

    // helper to parse JSON arrays coming from hidden inputs
    const parseJsonArray = (key) => {
      const raw = formData.get(key);
      if (!raw) return [];
      try {
        const v = JSON.parse(raw);
        return Array.isArray(v) ? v : [];
      } catch {
        return [];
      }
    };

    const strategy_name = String(formData.get("strategy_name") || "").trim();
    const strategy_type = formData.get("strategy_type") || null;
    const trading_style = formData.get("trading_style") || null;
    const setup_type = formData.get("setup_type") || null;

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

    // Risk per trade: allow user to type "1" meaning 1% OR "0.01" meaning fraction
    const risk_raw = String(formData.get("risk_per_trade") || "").trim();
    const risk_per_trade = Number(risk_raw);

    if (Number.isNaN(risk_per_trade) || risk_per_trade <= 0) {
      return {
        ok: false,
        message: "Risk Per Trade must be a positive number.",
      };
    }

    const avg_planned_rr = String(formData.get("avg_planned_rr") || "").trim(); // e.g. "1:2"
    const planned_r_year = Number(
      String(formData.get("planned_r_year") || "").trim(),
    );

    const preparation_status = formData.get("preparation_status") || null;
    const strategy_status =
      preparation_status === "Active"
        ? formData.get("strategy_status") || null
        : null;

    // Basic required checks before hitting DB constraints
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

    if (!bias_confluence.length || !htf.length || !entry_tf.length) {
      return {
        ok: false,
        message: "Please select required multi-select fields.",
      };
    }

    if (Number.isNaN(risk_per_trade)) {
      return { ok: false, message: "Risk Per Trade must be a number." };
    }

    if (!Number.isInteger(planned_r_year) || planned_r_year < 0) {
      return {
        ok: false,
        message: "Planned R/Year must be a whole number (0 or more).",
      };
    }

    const { error } = await supabase.from("strategies").insert({
      user_id: user.id, // RLS check ensures only self
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
    });

    if (error) return { ok: false, message: error.message };

    redirect("/app/strategies");
  }

  return <NewStrategyForm action={createStrategy} />;
}
