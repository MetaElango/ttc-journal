// app/app/page.js

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock3,
  Plus,
  Share2,
  Target,
  TrendingUp,
} from "lucide-react";

const ACTIVE_STATUSES = ["ENTRY PLACED", "ENTRY TRIGGERED", "RUNNING TRADE"];

const CLOSED_STATUSES = [
  "TRADE CLOSE WITH PROFIT",
  "TRADE EXIT IN MID",
  "TRADE SL HIT",
];

function Card({ title, value, subtext, icon: Icon }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>

          <h3 className="mt-2 text-3xl font-bold tracking-tight">{value}</h3>

          {subtext ? (
            <p className="mt-2 text-xs text-muted-foreground">{subtext}</p>
          ) : null}
        </div>

        <div className="rounded-xl border bg-background p-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function ActionCard({ title, description, href, icon: Icon, buttonText }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border bg-card p-5 transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="rounded-xl border bg-background p-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>

        <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1" />
      </div>

      <div className="mt-5">
        <h3 className="text-lg font-semibold">{title}</h3>

        <p className="mt-2 text-sm text-muted-foreground">{description}</p>

        <div className="mt-4 text-sm font-medium text-primary">
          {buttonText}
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }) {
  return (
    <span className="inline-flex rounded-full border px-2 py-1 text-xs font-medium">
      {status}
    </span>
  );
}

export default async function AppPage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();

  const user = authData?.user;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  console.log(profile);

  if (!user) redirect("/login");

  const [journalsRes, strategiesRes, sharedRes] = await Promise.all([
    supabase
      .from("journals")
      .select(
        `
        id,
        purpose,
        status,
        direction,
        entry_price,
        created_at,
        strategy_snapshot,
        symbols:symbol_id (
          symbol_name
        )
      `,
      )
      .order("created_at", { ascending: false }),

    supabase.from("strategies").select("id", { count: "exact", head: true }),

    supabase
      .from("journals")
      .select("id", { count: "exact", head: true })
      .eq("is_shared", true),
  ]);

  const journals = journalsRes.data || [];

  const totalStrategies = strategiesRes.count || 0;
  const sharedJournals = sharedRes.count || 0;

  const activeTrades = journals.filter((j) =>
    ACTIVE_STATUSES.includes(String(j.status || "").toUpperCase()),
  );

  const closedTrades = journals.filter((j) =>
    CLOSED_STATUSES.includes(String(j.status || "").toUpperCase()),
  );

  const recentJournals = journals.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile?.full_name?.split(" ")[0] || "Trader"} 👋
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/app/journals/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Journal
          </Link>

          <Link
            href="/app/strategies/new"
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <Target className="h-4 w-4" />
            New Strategy
          </Link>
        </div>
      </div>

      {/* STATS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          title="Total Journals"
          value={journals.length}
          subtext="All journal entries"
          icon={BookOpen}
        />

        <Card
          title="Active Trades"
          value={activeTrades.length}
          subtext="Running / triggered / placed"
          icon={TrendingUp}
        />

        <Card
          title="Closed Trades"
          value={closedTrades.length}
          subtext="Completed trades"
          icon={BarChart3}
        />

        <Card
          title="Shared Journals"
          value={sharedJournals}
          subtext="Visible on social feed"
          icon={Share2}
        />
      </div>

      {/* QUICK ACTIONS */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Quick Access</h2>

          <p className="text-sm text-muted-foreground">
            Jump directly into your workflow
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionCard
            title="Journals"
            description="Manage and review all your trading journals."
            href="/app/journals"
            icon={BookOpen}
            buttonText="Open Journals"
          />

          <ActionCard
            title="Strategies"
            description="View and manage your strategy blueprints."
            href="/app/strategies"
            icon={Target}
            buttonText="Open Strategies"
          />

          <ActionCard
            title="Metrics"
            description="Analyze your trading performance deeply."
            href="/app/metrics"
            icon={BarChart3}
            buttonText="Open Metrics"
          />

          <ActionCard
            title="Social"
            description="Explore journals shared by other traders."
            href="/app/social"
            icon={Share2}
            buttonText="Open Social"
          />
        </div>
      </div>

      {/* ACTIVE TRADES */}
      <div className="rounded-3xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <div className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-muted-foreground" />

            <h2 className="text-lg font-semibold">Active Trades</h2>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Trades that still need attention
          </p>
        </div>

        <div className="p-5">
          {activeTrades.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No active trades right now.
            </div>
          ) : (
            <div className="space-y-3">
              {activeTrades.slice(0, 5).map((journal) => (
                <div
                  key={journal.id}
                  className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">
                        {journal.strategy_snapshot?.strategy_name ||
                          "Unnamed Strategy"}
                      </h3>

                      <StatusBadge status={journal.status} />
                    </div>

                    <div className="mt-2 text-sm text-muted-foreground">
                      {journal.symbols?.symbol_name || "—"} •{" "}
                      {journal.direction || "—"} • Entry:{" "}
                      {journal.entry_price || "—"}
                    </div>
                  </div>

                  <Link
                    href="/app/journals"
                    className="inline-flex items-center text-sm font-medium text-primary"
                  >
                    View Journal
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RECENT JOURNALS */}
      <div className="rounded-3xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Recent Journals</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Your latest activity
          </p>
        </div>

        <div className="p-5">
          {recentJournals.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No journals created yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentJournals.map((journal) => (
                <div
                  key={journal.id}
                  className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">
                        {journal.strategy_snapshot?.strategy_name ||
                          "Unnamed Strategy"}
                      </h3>

                      <StatusBadge status={journal.status || "No status"} />
                    </div>

                    <div className="mt-2 text-sm text-muted-foreground">
                      {journal.symbols?.symbol_name || "—"} •{" "}
                      {journal.direction || "—"} •{" "}
                      {new Date(journal.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <Link
                    href="/app/journals"
                    className="inline-flex items-center text-sm font-medium text-primary"
                  >
                    Open
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
