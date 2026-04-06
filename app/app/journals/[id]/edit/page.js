import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditJournalForm from "./edit-form";

const STATUS_OPTIONS_BY_PURPOSE = {
  "FOR OBSERVATION": ["ENTRY MISSED", "ENTRY CLOSED"],
  "ENTRY PLANNED": [
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
  "ENTRY TRIGGERED",
  "ENTRY PLACED",
];

const EXIT_REQUIRED_STATUSES = ["TRADE CLOSE WITH PROFIT", "TRADE EXIT IN MID"];

function canEditJournal(journal) {
  if (!journal) return false;

  if (journal.purpose === "FOR OBSERVATION") {
    return journal.status == null || journal.status === "";
  }

  if (
    journal.purpose === "ENTRY PLANNED" ||
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
      `
      id,
      purpose,
      status,
      exit_price,
      exit_reason,
      direction,
      entry_price,
      stop_loss,
      entry_reason,
      symbols:symbol_id (
        symbol_name,
        category
      ),
      strategy_snapshot
    `,
    )
    .eq("id", id)
    .single();

  if (error || !journal) notFound();

  const canEdit = canEditJournal(journal);

  if (!canEdit) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-xl font-semibold">Edit Journal</h1>
        <p className="text-sm text-muted-foreground">
          This journal can no longer be edited.
        </p>
        <Link
          href="/app/journals"
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
    STATUS_OPTIONS_BY_PURPOSE["FOR OBSERVATION"];

  async function updateJournal(formData) {
    "use server";

    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) redirect("/login");

    const { data: existing, error: existingError } = await supabase
      .from("journals")
      .select("id, purpose, status")
      .eq("id", id)
      .single();

    if (existingError || !existing) notFound();

    const stillEditable = canEditJournal(existing);

    if (!stillEditable) {
      redirect("/app/journals");
    }

    const statusRaw = String(formData.get("status") || "")
      .trim()
      .toUpperCase();

    const exitReasonRaw = String(formData.get("exit_reason") || "").trim();
    const exit_reason = exitReasonRaw || null;

    const exitPriceRaw = sanitize2dp(formData.get("exit_price") || "");
    const exit_price = exitPriceRaw ? Number(exitPriceRaw) : null;

    const allowedStatuses =
      STATUS_OPTIONS_BY_PURPOSE[existing.purpose] ||
      STATUS_OPTIONS_BY_PURPOSE["FOR OBSERVATION"];

    if (!allowedStatuses.includes(statusRaw)) {
      redirect(`/app/journals/${id}/edit?error=status`);
    }

    if (exitPriceRaw && Number.isNaN(exit_price)) {
      redirect(`/app/journals/${id}/edit?error=exit_price`);
    }

    const exitRequired = EXIT_REQUIRED_STATUSES.includes(statusRaw);

    if (exitRequired && !exit_reason) {
      redirect(`/app/journals/${id}/edit?error=exit_reason_required`);
    }

    if (exitRequired && (exit_price === null || Number.isNaN(exit_price))) {
      redirect(`/app/journals/${id}/edit?error=exit_price_required`);
    }

    const { error: updateError } = await supabase
      .from("journals")
      .update({
        status: statusRaw,
        exit_reason,
        exit_price,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      console.log("UPDATE ERROR:", updateError);
      redirect(
        `/app/journals/${id}/edit?error=${encodeURIComponent(updateError.message)}`,
      );
    }

    redirect("/app/journals");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit Journal</h1>
        <Link
          href="/app/journals"
          className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
        >
          Back
        </Link>
      </div>

      <EditJournalForm
        action={updateJournal}
        journal={journal}
        strategyName={strategyName}
        symbolLabel={symbolLabel}
        statusOptions={statusOptions}
        errorType={errorType}
      />
    </div>
  );
}
