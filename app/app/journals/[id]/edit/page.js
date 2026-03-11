import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
      {children}
    </span>
  );
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

export default async function EditJournalPage({ params }) {
  const { id } = await params;

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

    const { error: updateError } = await supabase
      .from("journals")
      .update({
        status: statusRaw,
        exit_price,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      redirect(`/app/journals/${id}/edit?error=save`);
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

      <div className="rounded-xl border">
        <div className="border-b p-4">
          <div className="text-lg font-semibold">{strategyName}</div>

          <div className="mt-2 flex flex-wrap gap-2">
            <Pill>Symbol: {symbolLabel}</Pill>
            <Pill>Direction: {journal.direction || "—"}</Pill>
            <Pill>Purpose: {journal.purpose || "—"}</Pill>
            <Pill>Status: {journal.status || "—"}</Pill>
            <Pill>Entry: {journal.entry_price ?? "—"}</Pill>
            <Pill>SL: {journal.stop_loss ?? "—"}</Pill>
          </div>
        </div>

        <div className="p-4">
          <form action={updateJournal} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Status <span className="text-destructive">*</span>
                </label>
                <select
                  name="status"
                  defaultValue={journal.status || ""}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  required
                >
                  <option value="" disabled>
                    Select status
                  </option>
                  {statusOptions.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Exit Price{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  name="exit_price"
                  type="text"
                  inputMode="decimal"
                  defaultValue={journal.exit_price ?? ""}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  placeholder="e.g. 245.50"
                />
              </div>
            </div>

            <div className="rounded-md border p-3 text-sm whitespace-pre-wrap">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Entry Reason
              </div>
              {journal.entry_reason || "—"}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Update Journal
              </button>

              <Link
                href="/app/journals"
                className="inline-flex h-10 items-center rounded-md border px-4 text-sm hover:bg-accent"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
