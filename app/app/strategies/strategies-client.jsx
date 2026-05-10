"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Target,
  Activity,
  BookOpen,
  Pencil,
  CalendarPlus,
  Filter,
} from "lucide-react";

function Pill({ children, tone = "default" }) {
  const tones = {
    default: "border-border bg-background text-muted-foreground",
    live: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    draft:
      "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    muted: "border-border bg-muted/50 text-muted-foreground",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border bg-background p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <div className="text-2xl font-semibold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}

function PreviewBox({ title, children }) {
  return (
    <div className="rounded-xl border bg-background/60 p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="line-clamp-4 text-sm leading-6 text-muted-foreground whitespace-pre-wrap">
        {children || "—"}
      </div>
    </div>
  );
}

function getStatusTone(strategy) {
  if (
    strategy.preparation_status === "Active" &&
    strategy.strategy_status === "LIVE"
  ) {
    return "live";
  }

  if (strategy.preparation_status === "Draft") {
    return "draft";
  }

  return "muted";
}

export default function StrategiesClient({ strategies }) {
  const [query, setQuery] = useState("");

  const [filter, setFilter] = useState("ALL");

  const [mounted, setMounted] = useState(false);

  const stats = useMemo(() => {
    const total = strategies.length;

    const live = strategies.filter(
      (s) => s.preparation_status === "Active" && s.strategy_status === "LIVE",
    ).length;

    const draft = strategies.filter(
      (s) => s.preparation_status === "Draft",
    ).length;

    const preparing = strategies.filter(
      (s) => s.preparation_status === "Preparing",
    ).length;

    return { total, live, draft, preparing };
  }, [strategies]);

  const filteredStrategies = useMemo(() => {
    const q = query.trim().toLowerCase();

    return strategies.filter((s) => {
      const matchesQuery =
        !q ||
        [
          s.strategy_name,

          s.trading_style,

          s.setup_type,

          s.preparation_status,

          s.strategy_status,

          ...(s.bias_confluence || []),
        ]

          .filter(Boolean)

          .join(" ")

          .toLowerCase()

          .includes(q);

      const matchesFilter =
        filter === "ALL" ||
        (filter === "LIVE" &&
          s.preparation_status === "Active" &&
          s.strategy_status === "LIVE") ||
        filter === s.preparation_status?.toUpperCase();

      return matchesQuery && matchesFilter;
    });
  }, [strategies, query, filter]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-gradient-to-br from-card to-muted/30 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              Trading Playbook
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
              Strategies
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Build, refine, and launch your trading strategies into journals.
            </p>
          </div>

          <Link
            href="/app/strategies/new"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Strategy
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Total Strategies"
          value={stats.total}
        />
        <StatCard icon={Activity} label="Live" value={stats.live} />
        <StatCard icon={Filter} label="Draft" value={stats.draft} />
        <StatCard icon={Target} label="Preparing" value={stats.preparing} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search strategy, setup, style, confluence..."
            className="h-11 w-full rounded-xl border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {["ALL", "LIVE", "DRAFT", "PREPARING"].map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => setFilter(x)}
              className={[
                "h-10 rounded-xl border px-3 text-xs font-medium transition",
                filter === x
                  ? "bg-foreground text-background"
                  : "bg-background text-muted-foreground hover:bg-accent",
              ].join(" ")}
            >
              {x}
            </button>
          ))}
        </div>
      </div>

      {strategies.length === 0 ? (
        <div className="rounded-3xl border border-dashed p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted">
            <Target className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">No strategies yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first strategy to start journaling trades.
          </p>
          <Link
            href="/app/strategies/new"
            className="mt-5 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Create Strategy
          </Link>
        </div>
      ) : filteredStrategies.length === 0 ? (
        <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">
          No strategies match your search/filter.
        </div>
      ) : (
        <div className="grid gap-5">
          {filteredStrategies.map((s) => {
            const isLive =
              s.preparation_status === "Active" && s.strategy_status === "LIVE";

            return (
              <article
                key={s.id}
                className="group overflow-hidden rounded-3xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="border-b bg-muted/20 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-3">
                      <div>
                        <h2 className="text-xl font-semibold tracking-tight">
                          {s.strategy_name}
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Created{" "}
                          {s.created_at
                            ? new Date(s.created_at).toLocaleDateString(
                                undefined,
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                },
                              )
                            : "—"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Pill tone={getStatusTone(s)}>
                          Prep: {s.preparation_status}
                        </Pill>
                        <Pill tone={isLive ? "live" : "muted"}>
                          Status: {s.strategy_status || "—"}
                        </Pill>
                        <Pill>Style: {s.trading_style}</Pill>
                        <Pill>Setup: {s.setup_type}</Pill>
                      </div>

                      {s.bias_confluence?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {s.bias_confluence.map((b) => (
                            <Pill key={b}>{b}</Pill>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/app/strategies/${s.id}/edit`}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border bg-background px-3 text-sm hover:bg-accent"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Link>

                      {isLive ? (
                        <Link
                          href={`/app/journals/new?strategyId=${encodeURIComponent(s.id)}`}
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
                        >
                          <CalendarPlus className="h-4 w-4" />
                          Create Journal
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-5 md:grid-cols-3">
                  <PreviewBox title="Checklist">{s.checklist}</PreviewBox>
                  <PreviewBox title="Entry Rules">{s.entry_rules}</PreviewBox>
                  <PreviewBox title="Exit Rules">{s.exit_rules}</PreviewBox>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
