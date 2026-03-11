import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
      {children}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <div className="rounded-md border p-3 text-sm whitespace-pre-wrap">
        {children || <span className="opacity-60">—</span>}
      </div>
    </div>
  );
}

function formatTP(tp = [], qty = []) {
  if (!Array.isArray(tp) || tp.length === 0) return "—";

  // If qty is present and matches length, show: 250.5 (0.5), 260 (0.25)
  if (Array.isArray(qty) && qty.length === tp.length) {
    return tp
      .map((p, i) => {
        const q = qty[i];
        const qStr = typeof q === "number" && !Number.isNaN(q) ? ` (${q})` : "";
        return `${p}${qStr}`;
      })
      .join(", ");
  }

  // else just prices
  return tp.join(", ");
}

export default async function JournalsPage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  // RLS should handle ownership; still ok to require login
  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Journals</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please login to see your journals.
        </p>
      </div>
    );
  }

  const { data: journals, error } = await supabase
    .from("journals")
    .select(
      `
      id,
      purpose,
      status,
      direction,
      entry_price,
      stop_loss,
      take_profit,
      take_profit_qty,
      entry_reason,
      exit_reason,
      created_at,
      strategy_snapshot,
      symbols:symbol_id (
        id,
        symbol_name,
        category
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Journals</h1>
        <p className="mt-3 text-sm text-destructive">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Journals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {journals?.length || 0} journals
          </p>
        </div>

        {/* optional: link to strategies since journals are created from strategy */}
        <Link
          href="/app/strategies"
          className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
        >
          Create from Strategy
        </Link>
      </div>

      {(!journals || journals.length === 0) && (
        <div className="rounded-md border p-6 text-sm">
          <div className="font-medium">No journals yet</div>
          <p className="mt-1 text-muted-foreground">
            Create a journal from a strategy to see it here.
          </p>
          <Link
            href="/app/strategies"
            className="mt-4 inline-block rounded-md border px-4 py-2 text-sm hover:bg-accent"
          >
            Go to Strategies
          </Link>
        </div>
      )}

      <div className="grid gap-6">
        {journals?.map((j) => {
          const strategyName = j?.strategy_snapshot?.strategy_name || "—";

          const symbolLabel = j?.symbols
            ? `${j.symbols.symbol_name} — ${j.symbols.category}`
            : "—";

          const tpText = formatTP(j.take_profit, j.take_profit_qty);

          const canEdit =
            (j.purpose === "FOR OBSERVATION" && !j.status) ||
            ((j.purpose === "ENTRY PLANNED" ||
              j.purpose === "FORWARD TESTING") &&
              ["RUNNING TRADE", "ENTRY TRIGGERED", "ENTRY PLACED"].includes(
                j.status || "",
              ));

          return (
            <div key={j.id} className="rounded-xl border">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
                <div className="space-y-2">
                  <div className="text-lg font-semibold">{strategyName}</div>

                  <div className="flex flex-wrap gap-2">
                    <Pill>Symbol: {symbolLabel}</Pill>
                    <Pill>Direction: {j.direction || "—"}</Pill>
                    <Pill>Purpose: {j.purpose || "—"}</Pill>
                    <Pill>Status: {j.status || "—"}</Pill>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Pill>Entry: {j.entry_price ?? "—"}</Pill>
                    <Pill>SL: {j.stop_loss ?? "—"}</Pill>
                    <Pill>TP: {tpText}</Pill>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="text-xs text-muted-foreground">
                    {j.created_at
                      ? new Date(j.created_at).toLocaleDateString()
                      : "—"}
                  </div>

                  {canEdit ? (
                    <Link
                      href={`/app/journals/${j.id}/edit`}
                      className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                    >
                      Edit
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 p-4 md:grid-cols-2">
                <Section title="Entry Reason">{j.entry_reason}</Section>
                <Section title="Exit Reason">{j.exit_reason}</Section>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
