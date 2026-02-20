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

export default async function StrategiesPage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  const { data: strategies, error } = await supabase
    .from("strategies")
    .select(
      `
      id,
      strategy_name,
      preparation_status,
      strategy_status,
      trading_style,
      setup_type,
      bias_confluence,
      checklist,
      entry_rules,
      exit_rules,
      created_at
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Strategies</h1>
        <p className="mt-3 text-sm text-destructive">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Strategies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {strategies?.length || 0} strategies
          </p>
        </div>

        <Link
          href="/app/strategies/new"
          className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
        >
          New Strategy
        </Link>
      </div>

      {(!strategies || strategies.length === 0) && (
        <div className="rounded-md border p-6 text-sm">
          <div className="font-medium">No strategies yet</div>
          <p className="mt-1 text-muted-foreground">
            Create your first strategy to see it here.
          </p>
          <Link
            href="/app/strategies/new"
            className="mt-4 inline-block rounded-md border px-4 py-2 text-sm hover:bg-accent"
          >
            Create Strategy
          </Link>
        </div>
      )}

      <div className="grid gap-6">
        {strategies?.map((s) => (
          <div key={s.id} className="rounded-xl border">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
              <div className="space-y-2">
                <div className="text-lg font-semibold">{s.strategy_name}</div>

                <div className="flex flex-wrap gap-2">
                  <Pill>Prep: {s.preparation_status}</Pill>
                  <Pill>
                    Status: {s.strategy_status ? s.strategy_status : "—"}
                  </Pill>
                  <Pill>Trading style: {s.trading_style}</Pill>
                  <Pill>Setup: {s.setup_type}</Pill>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(s.bias_confluence || []).map((b) => (
                    <Pill key={b}>{b}</Pill>
                  ))}
                </div>
              </div>

              {/* later we can add Edit button here */}
              <div className="flex items-center gap-3">
                {s.preparation_status === "Active" &&
                s.strategy_status === "LIVE" ? (
                  <Link
                    href={`/app/journals/new?strategyId=${encodeURIComponent(s.id)}`}
                  >
                    Create Journal
                  </Link>
                ) : null}

                <div className="text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-4 md:grid-cols-2">
              <Section title="Checklist">{s.checklist}</Section>
              <Section title="Entry Rules">{s.entry_rules}</Section>
              <Section title="Exit Rules">{s.exit_rules}</Section>
              <Section title="Notes">{/* reserved */}</Section>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
