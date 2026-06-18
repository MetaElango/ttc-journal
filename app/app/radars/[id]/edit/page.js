import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditJournalForm from "./edit-form";
import NewJournalForm from "../../new/journal-form";

const STATUS_OPTIONS_BY_PURPOSE = {
  "TRADE OBSERVATION": ["ENTRY MISSED", "ENTRY CLOSED"],
  "TRADE EXECUTION": [
    "ENTRY PLANNED",
    "ENTRY PLACED",
    "ENTRY TRIGGERED",
    "ENTRY CANCELLED",
    "ENTRY MISSED",
    "RUNNING TRADE",
    "TRADE SL HIT",
    "TRADE CLOSE WITH PROFIT",
    "TRADE EXIT IN MID",
  ],
  "FORWARD TESTING": [
    "ENTRY PLANNED",
    "ENTRY PLACED",
    "ENTRY TRIGGERED",
    "ENTRY CANCELLED",
    "ENTRY MISSED",
    "RUNNING TRADE",
    "TRADE SL HIT",
    "TRADE CLOSE WITH PROFIT",
    "TRADE EXIT IN MID",
  ],
};

const EDITABLE_ACTIVE_STATUSES = [
  "RUNNING TRADE",
  "ENTRY PLANNED",
  "ENTRY TRIGGERED",
  "ENTRY PLACED",
];

const EXIT_REQUIRED_STATUSES = ["TRADE CLOSE WITH PROFIT", "TRADE EXIT IN MID"];

const ACTIVE_STATUSES = [
  "ENTRY PLANNED",
  "ENTRY PLACED",
  "ENTRY TRIGGERED",
  "RUNNING TRADE",
];

const FULL_EDIT_STATUSES = ["ENTRY PLANNED", "ENTRY PLACED"];

function needsEndDate(status) {
  const value = String(status || "")
    .trim()
    .toUpperCase();
  return value && !ACTIVE_STATUSES.includes(value);
}

function canEditJournal(journal) {
  if (!journal) return false;

  if (journal.purpose === "TRADE OBSERVATION") {
    return journal.status == null || journal.status === "";
  }

  if (
    journal.purpose === "TRADE EXECUTION" ||
    journal.purpose === "FORWARD TESTING"
  ) {
    return EDITABLE_ACTIVE_STATUSES.includes(journal.status || "");
  }

  return false;
}

function sanitize2dp(raw) {
  const s = String(raw ?? "");
  let out = s.replace(/[^\d.]/g, "");
  const firstDot = out.indexOf(".");

  if (firstDot !== -1) {
    out =
      out.slice(0, firstDot + 1) + out.slice(firstDot + 1).replace(/\./g, "");
  }

  if (firstDot !== -1) {
    const [a, b] = out.split(".");
    out = a + "." + (b || "").slice(0, 2);
  }

  return out;
}

function sanitize6dp(raw) {
  const s = String(raw ?? "");
  let out = s.replace(/[^\d.]/g, "");

  const firstDot = out.indexOf(".");

  if (firstDot !== -1) {
    out =
      out.slice(0, firstDot + 1) + out.slice(firstDot + 1).replace(/\./g, "");
  }

  if (firstDot !== -1) {
    const [a, b] = out.split(".");
    out = a + "." + (b || "").slice(0, 6);
  }

  return out;
}

function getFormValue(formData, key) {
  for (const [k, value] of formData.entries()) {
    if (k === key || k.endsWith(`_${key}`)) {
      return value;
    }
  }

  return null;
}

export default async function EditJournalPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const errorType = sp?.error || "";

  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) redirect("/login");

  const { data: journal, error } = await supabase
    .from("journals")
    .select(
      `*,
  symbols:symbol_id (
    id,
    symbol_name,
    category
  )
`,
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !journal) notFound();

  const canEdit = canEditJournal(journal);
  const canFullEdit = FULL_EDIT_STATUSES.includes(journal.status);

  if (!canEdit) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-xl font-semibold">Edit Journal</h1>
        <p className="text-sm text-muted-foreground">
          This journal can no longer be edited.
        </p>

        <Link
          href="/app/radars"
          className="inline-flex rounded-md border px-4 py-2 text-sm hover:bg-accent"
        >
          Back to Journals
        </Link>
      </div>
    );
  }

  const strategyName = journal?.strategy_snapshot?.strategy_name || "—";

  const symbolLabel = journal?.symbols
    ? `${journal.symbols.symbol_name} — ${journal.symbols.category}`
    : "—";

  const statusOptions =
    STATUS_OPTIONS_BY_PURPOSE[journal.purpose] ||
    STATUS_OPTIONS_BY_PURPOSE["TRADE OBSERVATION"];

  async function updateJournal(formData) {
    "use server";

    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) redirect("/login");

    const { data: existing, error: existingError } = await supabase
      .from("journals")
      .select(
        `
      id,
      purpose,
      status,
      quantity,
      entry_price,
      stop_loss,
      take_profit,
take_profit_qty,
modified_sl_price,
modified_tp_price,
modified_tp_qty
    `,
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (existingError || !existing) notFound();

    if (!canEditJournal(existing)) {
      redirect("/app/radars");
    }

    const statusRaw = String(getFormValue(formData, "status") || "")
      .trim()
      .toUpperCase();

    const journalStartAtRaw = String(
      getFormValue(formData, "journal_start_at") || "",
    ).trim();

    const journalEndAtRaw = String(
      getFormValue(formData, "journal_end_at") || "",
    ).trim();

    const journal_start_at = journalStartAtRaw
      ? new Date(journalStartAtRaw).toISOString()
      : null;

    const journal_end_at = journalEndAtRaw
      ? new Date(journalEndAtRaw).toISOString()
      : null;

    const exit_reason =
      String(getFormValue(formData, "exit_reason") || "").trim() || null;

    const exit_checkpoint =
      String(getFormValue(formData, "exit_checkpoint") || "")
        .trim()
        .toUpperCase() || null;

    const exitPriceRaw = sanitize6dp(
      getFormValue(formData, "exit_price") || "",
    );
    const exit_price = exitPriceRaw ? Number(exitPriceRaw) : null;

    const modifiedSlRaw = sanitize6dp(
      getFormValue(formData, "modified_sl_price") || "",
    );

    const modified_sl_price = modifiedSlRaw ? Number(modifiedSlRaw) : null;

    const modified_tp_price = formData
      .getAll("modified_tp_price")
      .map((x) => sanitize6dp(x))
      .filter(Boolean)
      .map(Number);

    const modified_tp_qty = formData
      .getAll("modified_tp_qty")
      .map((x) => sanitize2dp(x))
      .filter(Boolean)
      .map(Number);

    const allowedStatuses =
      STATUS_OPTIONS_BY_PURPOSE[existing.purpose] ||
      STATUS_OPTIONS_BY_PURPOSE["TRADE OBSERVATION"];

    if (!allowedStatuses.includes(statusRaw)) {
      redirect(`/app/radars/${id}/edit?error=status`);
    }

    if (!journal_start_at) {
      redirect(
        `/app/radars/${id}/edit?error=${encodeURIComponent(
          "Journal start date is required.",
        )}`,
      );
    }

    if (needsEndDate(statusRaw) && !journal_end_at) {
      redirect(
        `/app/radars/${id}/edit?error=${encodeURIComponent(
          "Journal end date is required for this status.",
        )}`,
      );
    }

    const needsExitReason = [
      "ENTRY CANCELLED",
      "ENTRY MISSED",
      "TRADE SL HIT",
      "TRADE CLOSE WITH PROFIT",
      "TRADE EXIT IN MID",
    ].includes(statusRaw);

    if (needsExitReason && !exit_reason) {
      redirect(`/app/radars/${id}/edit?error=exit_reason_required`);
    }

    if (
      ["TRADE CLOSE WITH PROFIT", "TRADE SL HIT"].includes(statusRaw) &&
      !exit_checkpoint
    ) {
      redirect(`/app/radars/${id}/edit?error=exit_checkpoint_required`);
    }

    if (exit_checkpoint === "MODIFIED_SL" && modified_sl_price === null) {
      redirect(`/app/radars/${id}/edit?error=modified_sl_required`);
    }

    if (exit_checkpoint === "MODIFIED_TP") {
      if (!modified_tp_price.length || !modified_tp_qty.length) {
        redirect(`/app/radars/${id}/edit?error=modified_tp_required`);
      }

      if (modified_tp_price.length !== modified_tp_qty.length) {
        redirect(`/app/radars/${id}/edit?error=modified_tp_qty_mismatch`);
      }
    }

    if (statusRaw === "TRADE EXIT IN MID" && exit_price === null) {
      redirect(`/app/radars/${id}/edit?error=exit_price_required`);
    }

    let finalExitPrice = exit_price;

    if (statusRaw === "TRADE CLOSE WITH PROFIT") {
      if (exit_checkpoint === "ACTUAL_TP") {
        finalExitPrice = Array.isArray(existing.take_profit)
          ? Number(existing.take_profit[0])
          : null;
      }

      if (exit_checkpoint === "MODIFIED_TP") {
        finalExitPrice =
          modified_tp_price[0] ?? Number(existing.take_profit?.[0] || null);
      }

      if (exit_checkpoint === "TP_BREAKEVEN") {
        finalExitPrice = Number(existing.entry_price);
      }
    }

    if (statusRaw === "TRADE SL HIT") {
      if (exit_checkpoint === "ACTUAL_SL") {
        finalExitPrice = Number(existing.stop_loss);
      }

      if (exit_checkpoint === "MODIFIED_SL") {
        finalExitPrice = modified_sl_price;
      }

      if (exit_checkpoint === "SL_BREAKEVEN") {
        finalExitPrice = Number(existing.entry_price);
      }
    }

    const { error: updateError } = await supabase
      .from("journals")
      .update({
        status: statusRaw,
        journal_start_at,
        journal_end_at: needsEndDate(statusRaw) ? journal_end_at : null,
        exit_reason,
        exit_price: finalExitPrice,
        exit_checkpoint,
        modified_sl_price:
          getFormValue(formData, "modified_sl_price") !== null
            ? modified_sl_price
            : existing.modified_sl_price,

        modified_tp_price: formData.getAll("modified_tp_price").length
          ? modified_tp_price
          : existing.modified_tp_price,

        modified_tp_qty: formData.getAll("modified_tp_qty").length
          ? modified_tp_qty
          : existing.modified_tp_qty,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      redirect(
        `/app/radars/${id}/edit?error=${encodeURIComponent(
          updateError.message,
        )}`,
      );
    }

    redirect("/app/radars");
  }
  async function updateFullJournal(prevState, formData) {
    "use server";

    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) redirect("/login");

    const { data: existing, error: existingError } = await supabase
      .from("journals")
      .select("id, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (existingError || !existing) notFound();

    if (!FULL_EDIT_STATUSES.includes(existing.status)) {
      redirect("/app/radars");
    }

    const tpItems = JSON.parse(
      getFormValue(formData, "take_profit_json") || "[]",
    );
    const existingSetupImages = JSON.parse(
      getFormValue(formData, "existing_setup_images") || "[]",
    );
    const existingReferenceImages = JSON.parse(
      getFormValue(formData, "existing_reference_images") || "[]",
    );
    const htf = JSON.parse(getFormValue(formData, "htf_json") || "[]");
    const entry_tf = JSON.parse(
      getFormValue(formData, "entry_tf_json") || "[]",
    );

    const statusRaw = String(getFormValue(formData, "status") || "")
      .trim()
      .toUpperCase();

    const journalStartAtRaw = String(
      getFormValue(formData, "journal_start_at") || "",
    ).trim();

    const journalEndAtRaw = String(
      getFormValue(formData, "journal_end_at") || "",
    ).trim();

    const payload = {
      purpose: String(getFormValue(formData, "purpose") || "").trim(),
      trading_account_id: getFormValue(formData, "trading_account_id") || null,
      symbol_id: getFormValue(formData, "symbol_id") || null,
      status: statusRaw,
      direction: String(getFormValue(formData, "direction") || "")
        .trim()
        .toUpperCase(),
      quantity: getFormValue(formData, "quantity") || null,
      entry_price: getFormValue(formData, "entry_price") || null,
      stop_loss: getFormValue(formData, "stop_loss") || null,
      take_profit: tpItems.map((x) => x.price).filter(Boolean),
      take_profit_qty: tpItems.map((x) => x.qty).filter(Boolean),
      risk_mode: String(getFormValue(formData, "risk_mode") || "").trim(),
      risk_per_trade: getFormValue(formData, "risk_per_trade") || null,
      entry_reason:
        String(getFormValue(formData, "entry_reason") || "").trim() || null,
      exit_reason:
        String(getFormValue(formData, "exit_reason") || "").trim() || null,
      exit_price: getFormValue(formData, "exit_price") || null,
      journal_start_at: journalStartAtRaw
        ? new Date(journalStartAtRaw).toISOString()
        : null,
      journal_end_at:
        needsEndDate(statusRaw) && journalEndAtRaw
          ? new Date(journalEndAtRaw).toISOString()
          : null,
      htf,
      entry_tf,
      setup_images: existingSetupImages,
      reference_images: existingReferenceImages,
    };

    const { error: updateError } = await supabase
      .from("journals")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      return {
        ok: false,
        message: updateError.message,
      };
    }

    return {
      ok: true,
      message: "Opportunity updated successfully.",
      journalId: id,
      existingSetupImages,
      existingReferenceImages,
    };
  }

  const { data: accounts } = await supabase
    .from("trading_accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("account_name");

  const { data: symbols } = await supabase
    .from("symbols")
    .select("*")
    .order("symbol_name");

  if (canFullEdit) {
    return (
      <NewJournalForm
        action={updateFullJournal}
        strategy={journal.strategy_snapshot}
        accounts={accounts || []}
        symbols={symbols || []}
        prefillJournal={journal}
      />
    );
  }

  return (
    <EditJournalForm
      action={updateJournal}
      journal={journal}
      strategyName={strategyName}
      symbolLabel={symbolLabel}
      statusOptions={statusOptions}
      errorType={errorType}
    />
  );
}
