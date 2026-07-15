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

const ACTIVE_STATUSES = [
  "ENTRY PLANNED",
  "ENTRY PLACED",
  "ENTRY TRIGGERED",
  "RUNNING TRADE",
];

const EDITABLE_ACTIVE_STATUSES = [...ACTIVE_STATUSES];

const FULL_EDIT_STATUSES = ["ENTRY PLANNED", "ENTRY PLACED"];

const STATUS_TRANSITIONS = {
  "ENTRY PLANNED": [
    "ENTRY PLACED",
    "ENTRY TRIGGERED",
    "ENTRY CANCELLED",
    "ENTRY MISSED",
  ],

  "ENTRY PLACED": ["ENTRY TRIGGERED", "ENTRY CANCELLED", "ENTRY MISSED"],

  "ENTRY TRIGGERED": [
    "TRADE SL HIT",
    "TRADE CLOSE WITH PROFIT",
    "TRADE EXIT IN MID",
  ],

  "RUNNING TRADE": [
    "TRADE SL HIT",
    "TRADE CLOSE WITH PROFIT",
    "TRADE EXIT IN MID",
  ],
};

function normalize(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function needsEndDate(status) {
  const value = normalize(status);
  return Boolean(value) && !ACTIVE_STATUSES.includes(value);
}

function canEditJournal(journal) {
  if (!journal) return false;

  const purpose = normalize(journal.purpose);
  const status = normalize(journal.status);

  if (purpose === "TRADE OBSERVATION") {
    return !status;
  }

  if (purpose === "TRADE EXECUTION" || purpose === "FORWARD TESTING") {
    return EDITABLE_ACTIVE_STATUSES.includes(status);
  }

  return false;
}

function sanitize2dp(raw) {
  const value = String(raw ?? "");
  let output = value.replace(/[^\d.]/g, "");

  const firstDot = output.indexOf(".");

  if (firstDot !== -1) {
    output =
      output.slice(0, firstDot + 1) +
      output.slice(firstDot + 1).replace(/\./g, "");

    const [whole, decimal] = output.split(".");
    output = `${whole}.${(decimal || "").slice(0, 2)}`;
  }

  return output;
}

function sanitize6dp(raw) {
  const value = String(raw ?? "");
  let output = value.replace(/[^\d.]/g, "");

  const firstDot = output.indexOf(".");

  if (firstDot !== -1) {
    output =
      output.slice(0, firstDot + 1) +
      output.slice(firstDot + 1).replace(/\./g, "");

    const [whole, decimal] = output.split(".");
    output = `${whole}.${(decimal || "").slice(0, 6)}`;
  }

  return output;
}

function getFormValue(formData, key) {
  for (const [formKey, value] of formData.entries()) {
    if (formKey === key || formKey.endsWith(`_${key}`)) {
      return value;
    }
  }

  return null;
}

function getAllFormValues(formData, key) {
  const values = [];

  for (const [formKey, value] of formData.entries()) {
    if (formKey === key || formKey.endsWith(`_${key}`)) {
      values.push(value);
    }
  }

  return values;
}

function parseJsonFormValue(formData, key, fallback = []) {
  try {
    const raw = getFormValue(formData, key);

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(String(raw));
    return parsed;
  } catch {
    return fallback;
  }
}

function validateStatusTransition(currentStatus, submittedStatus) {
  if (!submittedStatus) {
    return {
      valid: true,
      status: currentStatus,
    };
  }

  const allowedNextStatuses = STATUS_TRANSITIONS[currentStatus] || [];
  const isKeepingCurrentStatus = submittedStatus === currentStatus;
  const isAllowedTransition = allowedNextStatuses.includes(submittedStatus);

  return {
    valid: isKeepingCurrentStatus || isAllowedTransition,
    status: submittedStatus,
  };
}

export default async function EditJournalPage({ params, searchParams }) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const errorType = resolvedSearchParams?.error || "";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: journal, error } = await supabase
    .from("journals")
    .select(
      `
        *,
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

  if (error || !journal) {
    notFound();
  }

  const canEdit = canEditJournal(journal);
  const canFullEdit = FULL_EDIT_STATUSES.includes(normalize(journal.status));

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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

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
          modified_tp_qty,
          sl_tp_adjustment_reason
        `,
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (existingError || !existing) {
      notFound();
    }

    if (!canEditJournal(existing)) {
      redirect("/app/radars");
    }

    const currentStatus = normalize(existing.status);

    const submittedStatus = normalize(getFormValue(formData, "status"));

    const transition = validateStatusTransition(currentStatus, submittedStatus);

    if (!transition.valid) {
      return {
        ok: false,
        message: `Invalid status update from ${currentStatus} to ${submittedStatus}.`,
      };
    }

    const statusRaw = transition.status || currentStatus;

    const allowedStatuses =
      STATUS_OPTIONS_BY_PURPOSE[existing.purpose] ||
      STATUS_OPTIONS_BY_PURPOSE["TRADE OBSERVATION"];

    if (!allowedStatuses.includes(statusRaw)) {
      redirect(
        `/app/radars/${id}/edit?error=${encodeURIComponent("Invalid status.")}`,
      );
    }

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

    const exit_reason =
      String(getFormValue(formData, "exit_reason") || "").trim() || null;

    const exit_checkpoint =
      normalize(getFormValue(formData, "exit_checkpoint")) || null;

    const exitPriceRaw = sanitize6dp(
      getFormValue(formData, "exit_price") || "",
    );

    const exit_price = exitPriceRaw !== "" ? Number(exitPriceRaw) : null;

    const modifiedSlFormValue = getFormValue(formData, "modified_sl_price");

    const modifiedSlRaw = sanitize6dp(modifiedSlFormValue || "");

    const submittedModifiedSlPrice =
      modifiedSlRaw !== "" ? Number(modifiedSlRaw) : null;

    const modifiedTpPriceValues = getAllFormValues(
      formData,
      "modified_tp_price",
    );

    const modifiedTpQtyValues = getAllFormValues(formData, "modified_tp_qty");

    const submittedModifiedTpPrice = modifiedTpPriceValues
      .map((value) => sanitize6dp(value))
      .filter((value) => value !== "")
      .map(Number);

    const submittedModifiedTpQty = modifiedTpQtyValues
      .map((value) => sanitize2dp(value))
      .filter((value) => value !== "")
      .map(Number);

    const hasSubmittedModifiedSl =
      modifiedSlFormValue !== null && modifiedSlRaw !== "";

    const hasSubmittedModifiedTp =
      submittedModifiedTpPrice.length > 0 || submittedModifiedTpQty.length > 0;

    const sl_tp_adjustment_reason =
      String(getFormValue(formData, "sl_tp_adjustment_reason") || "").trim() ||
      null;

    if (
      (hasSubmittedModifiedSl || hasSubmittedModifiedTp) &&
      !sl_tp_adjustment_reason
    ) {
      redirect(`/app/radars/${id}/edit?error=adjustment_reason_required`);
    }

    if (
      hasSubmittedModifiedTp &&
      submittedModifiedTpPrice.length !== submittedModifiedTpQty.length
    ) {
      redirect(`/app/radars/${id}/edit?error=modified_tp_qty_mismatch`);
    }

    const resolvedModifiedSlPrice = hasSubmittedModifiedSl
      ? submittedModifiedSlPrice
      : existing.modified_sl_price != null
        ? Number(existing.modified_sl_price)
        : null;

    const resolvedModifiedTpPrice =
      submittedModifiedTpPrice.length > 0
        ? submittedModifiedTpPrice
        : Array.isArray(existing.modified_tp_price)
          ? existing.modified_tp_price.map(Number)
          : [];

    const resolvedModifiedTpQty =
      submittedModifiedTpQty.length > 0
        ? submittedModifiedTpQty
        : Array.isArray(existing.modified_tp_qty)
          ? existing.modified_tp_qty.map(Number)
          : [];

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

    const needsExitCheckpoint = [
      "TRADE CLOSE WITH PROFIT",
      "TRADE SL HIT",
    ].includes(statusRaw);

    if (needsExitCheckpoint && !exit_checkpoint) {
      redirect(`/app/radars/${id}/edit?error=exit_checkpoint_required`);
    }

    if (exit_checkpoint === "MODIFIED_SL" && resolvedModifiedSlPrice === null) {
      redirect(`/app/radars/${id}/edit?error=modified_sl_required`);
    }

    if (exit_checkpoint === "MODIFIED_TP") {
      if (!resolvedModifiedTpPrice.length || !resolvedModifiedTpQty.length) {
        redirect(`/app/radars/${id}/edit?error=modified_tp_required`);
      }

      if (resolvedModifiedTpPrice.length !== resolvedModifiedTpQty.length) {
        redirect(`/app/radars/${id}/edit?error=modified_tp_qty_mismatch`);
      }
    }

    if (statusRaw === "TRADE EXIT IN MID" && exit_price === null) {
      redirect(`/app/radars/${id}/edit?error=exit_price_required`);
    }

    let finalExitPrice = exit_price;

    if (statusRaw === "TRADE CLOSE WITH PROFIT") {
      if (exit_checkpoint === "ACTUAL_TP") {
        finalExitPrice =
          Array.isArray(existing.take_profit) && existing.take_profit.length > 0
            ? Number(existing.take_profit[0])
            : null;
      }

      if (exit_checkpoint === "MODIFIED_TP") {
        finalExitPrice =
          resolvedModifiedTpPrice[0] ??
          (Array.isArray(existing.take_profit) &&
          existing.take_profit.length > 0
            ? Number(existing.take_profit[0])
            : null);
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
        finalExitPrice = resolvedModifiedSlPrice;
      }

      if (exit_checkpoint === "SL_BREAKEVEN") {
        finalExitPrice = Number(existing.entry_price);
      }
    }

    const isActiveStatus = ACTIVE_STATUSES.includes(statusRaw);

    const storedJournalEndAt = isActiveStatus ? null : journal_end_at;

    const storedExitReason = isActiveStatus ? null : exit_reason;

    const storedExitPrice = isActiveStatus ? null : finalExitPrice;

    const storedExitCheckpoint = isActiveStatus ? null : exit_checkpoint;

    const nextModifiedSlPrice = hasSubmittedModifiedSl
      ? submittedModifiedSlPrice
      : existing.modified_sl_price;

    const nextModifiedTpPrice =
      submittedModifiedTpPrice.length > 0
        ? submittedModifiedTpPrice
        : existing.modified_tp_price;

    const nextModifiedTpQty =
      submittedModifiedTpQty.length > 0
        ? submittedModifiedTpQty
        : existing.modified_tp_qty;

    const nextAdjustmentReason =
      getFormValue(formData, "sl_tp_adjustment_reason") !== null
        ? sl_tp_adjustment_reason
        : existing.sl_tp_adjustment_reason;

    const { error: updateError } = await supabase
      .from("journals")
      .update({
        status: statusRaw,
        journal_start_at,
        journal_end_at: storedJournalEndAt,

        exit_reason: storedExitReason,
        exit_price: storedExitPrice,
        exit_checkpoint: storedExitCheckpoint,

        modified_sl_price: nextModifiedSlPrice,
        modified_tp_price: nextModifiedTpPrice,
        modified_tp_qty: nextModifiedTpQty,
        sl_tp_adjustment_reason: nextAdjustmentReason,
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: existing, error: existingError } = await supabase
      .from("journals")
      .select("id, purpose, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (existingError || !existing) {
      notFound();
    }

    const currentStatus = normalize(existing.status);

    if (!FULL_EDIT_STATUSES.includes(currentStatus)) {
      redirect("/app/radars");
    }

    const submittedStatus = normalize(getFormValue(formData, "status"));

    const transition = validateStatusTransition(currentStatus, submittedStatus);

    if (!transition.valid) {
      return {
        ok: false,
        message: `Invalid status update from ${currentStatus} to ${submittedStatus}.`,
      };
    }

    const statusRaw = transition.status || currentStatus;

    const allowedStatuses =
      STATUS_OPTIONS_BY_PURPOSE[existing.purpose] ||
      STATUS_OPTIONS_BY_PURPOSE["TRADE OBSERVATION"];

    if (!allowedStatuses.includes(statusRaw)) {
      return {
        ok: false,
        message: "Invalid status.",
      };
    }

    const tpItems = parseJsonFormValue(formData, "take_profit_json", []);

    const existingSetupImages = parseJsonFormValue(
      formData,
      "existing_setup_images",
      [],
    );

    const existingReferenceImages = parseJsonFormValue(
      formData,
      "existing_reference_images",
      [],
    );

    const htf = parseJsonFormValue(formData, "htf_json", []);

    const entry_tf = parseJsonFormValue(formData, "entry_tf_json", []);

    const journalStartAtRaw = String(
      getFormValue(formData, "journal_start_at") || "",
    ).trim();

    const journalEndAtRaw = String(
      getFormValue(formData, "journal_end_at") || "",
    ).trim();

    const journal_start_at = journalStartAtRaw
      ? new Date(journalStartAtRaw).toISOString()
      : null;

    const journal_end_at =
      needsEndDate(statusRaw) && journalEndAtRaw
        ? new Date(journalEndAtRaw).toISOString()
        : null;

    if (!journal_start_at) {
      return {
        ok: false,
        message: "Journal start date is required.",
      };
    }

    if (needsEndDate(statusRaw) && !journal_end_at) {
      return {
        ok: false,
        message: "Journal end date is required for this status.",
      };
    }

    const isActiveStatus = ACTIVE_STATUSES.includes(statusRaw);

    const payload = {
      purpose: String(getFormValue(formData, "purpose") || "").trim(),

      trading_account_id: getFormValue(formData, "trading_account_id") || null,

      symbol_id: getFormValue(formData, "symbol_id") || null,

      status: statusRaw,

      direction: normalize(getFormValue(formData, "direction")),

      quantity: getFormValue(formData, "quantity") || null,

      entry_price: getFormValue(formData, "entry_price") || null,

      stop_loss: getFormValue(formData, "stop_loss") || null,

      take_profit: Array.isArray(tpItems)
        ? tpItems.map((item) => item.price).filter(Boolean)
        : [],

      take_profit_qty: Array.isArray(tpItems)
        ? tpItems.map((item) => item.qty).filter(Boolean)
        : [],

      risk_mode: String(getFormValue(formData, "risk_mode") || "").trim(),

      risk_per_trade: getFormValue(formData, "risk_per_trade") || null,

      entry_reason:
        String(getFormValue(formData, "entry_reason") || "").trim() || null,

      exit_reason: isActiveStatus
        ? null
        : String(getFormValue(formData, "exit_reason") || "").trim() || null,

      exit_price: isActiveStatus
        ? null
        : getFormValue(formData, "exit_price") || null,

      exit_checkpoint: isActiveStatus
        ? null
        : normalize(getFormValue(formData, "exit_checkpoint")) || null,

      journal_start_at,
      journal_end_at: isActiveStatus ? null : journal_end_at,

      htf: Array.isArray(htf) ? htf : [],
      entry_tf: Array.isArray(entry_tf) ? entry_tf : [],

      setup_images: Array.isArray(existingSetupImages)
        ? existingSetupImages
        : [],

      reference_images: Array.isArray(existingReferenceImages)
        ? existingReferenceImages
        : [],
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
      existingSetupImages: payload.setup_images,
      existingReferenceImages: payload.reference_images,
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
