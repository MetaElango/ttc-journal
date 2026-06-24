import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CircleDot,
  Flame,
  Radio,
  ShieldCheck,
  Star,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import PerformanceOverview from "./performance-overview";
import DashboardOpportunitySections from "./dashboard-opportunity-sections";

const CLOSED_STATUSES = [
  "TRADE CLOSE WITH PROFIT",
  "TRADE EXIT IN MID",
  "TRADE SL HIT",
];

const WIN_STATUSES = ["TRADE CLOSE WITH PROFIT"];
const LOSS_STATUSES = ["TRADE SL HIT"];

const ACTIVE_STATUSES = [
  "ENTRY PLANNED",
  "ENTRY PLACED",
  "ENTRY TRIGGERED",
  "RUNNING TRADE",
];

function norm(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function getFirstName(name) {
  return name?.split(" ")?.[0] || "Trader";
}

function isToday(date) {
  if (!date) return false;

  const d = new Date(date);
  const now = new Date();

  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isThisWeek(date) {
  if (!date) return false;

  const d = new Date(date);
  const now = new Date();

  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return d >= start && d < end;
}

function formatDateLabel(date) {
  if (!date) return "—";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function getSetupName(journal) {
  return (
    journal?.strategy_snapshot?.strategy_name ||
    journal?.strategy_snapshot?.setup_type ||
    "Unnamed Setup"
  );
}

function getSetupType(journal) {
  return journal?.strategy_snapshot?.setup_type || getSetupName(journal);
}

function getTimeframe(journal) {
  return (
    journal?.entry_tf?.[0] ||
    journal?.htf?.[0] ||
    journal?.strategy_snapshot?.entry_tf?.[0] ||
    journal?.strategy_snapshot?.htf?.[0] ||
    "H1"
  );
}

function getConfidence(journal) {
  if (journal?.mentor_pick_priority) {
    return Math.max(60, 100 - Number(journal.mentor_pick_priority) * 5);
  }

  return 70;
}

function getRR(journal) {
  return (
    journal?.strategy_snapshot?.avg_planned_rr ||
    journal?.strategy_snapshot?.planned_rr ||
    journal?.strategy_snapshot?.planned_risk_reward ||
    "1:2"
  );
}

function getDescription(journal) {
  return (
    journal?.entry_reason ||
    journal?.owner_note ||
    journal?.strategy_snapshot?.entry_rules ||
    "No setup description added yet."
  );
}

function isShortDirection(journal) {
  const direction = norm(journal?.direction);
  return (
    direction.includes("SELL") ||
    direction.includes("SHORT") ||
    direction.includes("BEAR")
  );
}

function MiniSparkline({ seed = 1 }) {
  const points = Array.from({ length: 12 }).map((_, index) => {
    const x = 2 + index * 11;
    const y = 10 + ((index * 7 + seed * 5) % 14);
    return `${index === 0 ? "M" : "L"} ${x} ${y}`;
  });

  return (
    <svg viewBox="0 0 130 28" className="mt-4 h-7 w-full text-blue-500">
      <path
        d={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatCard({ title, value, subtext, icon: Icon, seed }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-[14px] bg-blue-50 p-2.5">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
        <CircleDot className="h-4 w-4 text-slate-400" />
      </div>

      <p className="mt-3 text-[13px] font-medium text-slate-700">{title}</p>

      <h3 className="mt-2 text-[34px] font-semibold leading-none text-slate-950">
        {value}
      </h3>

      <p className="mt-2 text-[11px] text-slate-500">{subtext}</p>

      <MiniSparkline seed={seed} />
    </div>
  );
}

function Panel({ children, className = "" }) {
  return (
    <div
      className={`rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05)] ${className}`}
    >
      {children}
    </div>
  );
}

function PanelHeader({ icon: Icon, title, href }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-blue-600" />
        <h2 className="text-[17px] font-semibold text-slate-950">{title}</h2>
      </div>

      {href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
        >
          View All
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function getTradeR(journal) {
  const status = norm(journal.status);

  if (WIN_STATUSES.includes(status)) {
    const entry = Number(journal.entry_price);
    const stop = Number(journal.stop_loss);
    const exit = Number(journal.exit_price || journal.take_profit?.[0]);

    if (!entry || !stop || !exit || entry === stop) return 1;

    const risk = Math.abs(entry - stop);
    const reward = isShortDirection(journal) ? entry - exit : exit - entry;

    return Number((reward / risk).toFixed(2));
  }

  if (LOSS_STATUSES.includes(status)) return -1;

  if (status === "TRADE EXIT IN MID") {
    const entry = Number(journal.entry_price);
    const stop = Number(journal.stop_loss);
    const exit = Number(journal.exit_price);

    if (!entry || !stop || !exit || entry === stop) return 0;

    const risk = Math.abs(entry - stop);
    const result = isShortDirection(journal) ? entry - exit : exit - entry;

    return Number((result / risk).toFixed(2));
  }

  return 0;
}

function HariPick({ hariPicks }) {
  return (
    <Panel className="p-5">
      <PanelHeader icon={Star} title="Hari's Pick" href="/app/hari-s-pick" />

      {hariPicks.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          No Hari's picks yet.
        </div>
      ) : (
        <div className="space-y-3">
          {hariPicks.map((pick) => (
            <Link
              key={pick.id}
              href={`/app/journals/${pick.id}`}
              className="block rounded-[18px] border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-950">
                    {pick.symbols?.symbol_name || "—"}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {getSetupName(pick)}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    isShortDirection(pick)
                      ? "bg-red-50 text-red-600"
                      : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {isShortDirection(pick) ? "SHORT" : "LONG"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-slate-400">Timeframe</p>
                  <p className="mt-1 font-semibold text-slate-700">
                    {getTimeframe(pick)}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400">Confidence</p>
                  <p className="mt-1 font-semibold text-slate-700">
                    {getConfidence(pick)}%
                  </p>
                </div>

                <div>
                  <p className="text-slate-400">RR</p>
                  <p className="mt-1 font-semibold text-blue-600">
                    {getRR(pick)}
                  </p>
                </div>
              </div>

              <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">
                {getDescription(pick)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}

function OpportunityRow({ journal }) {
  const isShort = isShortDirection(journal);

  return (
    <div className="grid grid-cols-[1fr_44px_48px_74px] items-center gap-3 rounded-[14px] px-1 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="rounded-[10px] border border-blue-100 bg-blue-50 p-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">
            {journal.symbols?.symbol_name || "—"}
          </p>
          <p className="truncate text-xs text-slate-500">
            {getSetupName(journal)}
          </p>
        </div>
      </div>

      <p className="text-xs font-semibold text-slate-700">
        {getTimeframe(journal)}
      </p>

      <p className="text-xs font-semibold text-slate-700">
        {getConfidence(journal)}%
      </p>

      <span
        className={`rounded-[10px] border px-3 py-1.5 text-center text-xs font-semibold ${
          isShort
            ? "border-red-100 bg-red-50 text-red-600"
            : "border-emerald-100 bg-emerald-50 text-emerald-600"
        }`}
      >
        {isShort ? "SHORT" : "LONG"}
      </span>
    </div>
  );
}

function PreferableOpportunities({ topSuggestions }) {
  return (
    <Panel className="p-5">
      <PanelHeader
        icon={Target}
        title="Preferable Opportunities"
        href="/app/preferable-opportunities"
      />

      <div className="divide-y divide-slate-100">
        {topSuggestions.length === 0 ? (
          <div className="rounded-[18px] border border-dashed p-10 text-center text-sm text-slate-500">
            No preferable opportunities yet.
          </div>
        ) : (
          topSuggestions
            .slice(0, 5)
            .map((journal) => (
              <OpportunityRow key={journal.id} journal={journal} />
            ))
        )}
      </div>

      <Link
        href="/app/preferable-opportunities"
        className="mt-4 flex items-center justify-center gap-2 rounded-[16px] py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50"
      >
        View all preferable opportunities
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Panel>
  );
}

function UpcomingSessions() {
  return (
    <Panel className="p-5">
      <PanelHeader icon={Radio} title="Upcoming Live Sessions" href="#" />

      <div className="space-y-3">
        {[
          ["Weekly Outlook", "With Hari", "Today", "11:00 PM"],
          ["Live Market Review", "With Mentors", "Tomorrow", "08:30 PM"],
        ].map((item) => (
          <div
            key={item[0]}
            className="flex items-center justify-between rounded-[16px] p-2"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-[10px] border border-blue-100 bg-blue-50 p-2">
                <CalendarDays className="h-4 w-4 text-blue-600" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {item[0]}
                </p>
                <p className="text-xs text-slate-500">{item[1]}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-500">{item[2]}</p>
              <p className="text-sm font-semibold text-blue-600">{item[3]}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CommunityFocus({ journals }) {
  return (
    <Panel className="p-5">
      <PanelHeader
        icon={Users}
        title="Community Focus"
        href="/app/most-discussed"
      />

      {journals.length === 0 ? (
        <div className="rounded-[18px] border border-dashed p-8 text-center text-sm text-slate-500">
          No community focus yet.
        </div>
      ) : (
        <div className="space-y-3">
          {journals.map((journal, index) => (
            <div
              key={journal.id}
              className="flex items-center justify-between rounded-[16px] p-2"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Flame className="h-4 w-4 shrink-0 text-blue-600" />

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {journal.symbols?.symbol_name || "Setup"} —{" "}
                    {getSetupName(journal)}
                  </p>

                  <p className="text-xs text-slate-500">
                    #{index + 1} • {journal.total_comments} comments
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
                {journal.total_comments}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function RiskOverview({ journals }) {
  const closed = journals.filter((j) =>
    CLOSED_STATUSES.includes(norm(j.status)),
  );

  const wins = closed.filter((j) => WIN_STATUSES.includes(norm(j.status)));
  const losses = closed.filter((j) => LOSS_STATUSES.includes(norm(j.status)));

  const winRate = closed.length
    ? Math.round((wins.length / closed.length) * 100)
    : 0;
  const lossRate = closed.length
    ? Math.round((losses.length / closed.length) * 100)
    : 0;

  const avgRR = closed.length > 0 ? getRR(closed[0]) : "—";

  return (
    <Panel className="p-5">
      <PanelHeader icon={ShieldCheck} title="Risk Overview" />

      <div className="flex items-center gap-5">
        <div className="relative h-[132px] w-[132px] shrink-0">
          <div
            className="h-full w-full rounded-full"
            style={{
              background: `conic-gradient(#2563eb 0 ${winRate}%, #ef4444 ${winRate}% ${
                winRate + lossRate
              }%, #e2e8f0 ${winRate + lossRate}% 100%)`,
            }}
          />

          <div className="absolute inset-[15px] flex flex-col items-center justify-center rounded-full bg-white">
            <p className="text-[24px] font-semibold text-slate-950">{avgRR}</p>
            <p className="text-[10px] text-slate-500">Risk:Reward</p>
          </div>
        </div>

        <div className="min-w-0 flex-1 rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Win Rate</span>
              <span className="font-semibold text-emerald-600">{winRate}%</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Loss Rate</span>
              <span className="font-semibold text-red-600">{lossRate}%</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Closed</span>
              <span className="font-semibold text-blue-600">
                {closed.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export default async function AppPage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, type")
    .eq("id", user.id)
    .single();

  const journalSelect = `
  id,
  user_id,
  purpose,
  status,
  direction,
  quantity,
  entry_price,
  stop_loss,
  take_profit,
  take_profit_qty,
  entry_reason,
  exit_reason,
  exit_price,
  risk_mode,
  risk_per_trade,
  created_at,
  updated_at,
  shared_at,
  is_shared,
  mentor_pick_priority,
  htf,
  entry_tf,
  strategy_snapshot,
  setup_images,
  reference_images,
  owner_note,
  admin_note,
  trading_accounts (
  id,
  account_name,
  is_hidden
),
  symbols:symbol_id (
    id,
    symbol_name,
    category
  )
`;

  const [
    journalsRes,
    strategiesRes,
    allSharedRes,
    hariPicksRes,
    topSuggestionsRes,
    topCommentsRes,
  ] = await Promise.all([
    supabase
      .from("journals")
      .select(journalSelect)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    supabase.from("strategies").select("id", {
      count: "exact",
      head: true,
    }),

    supabase
      .from("journals")
      .select(journalSelect)
      .eq("is_shared", true)
      .order("shared_at", { ascending: false })
      .limit(200),

    supabase
      .from("journals")
      .select(
        `
      ${journalSelect},
      profiles:user_id!inner (
        id,
        type
      )
    `,
      )
      .eq("is_shared", true)
      .eq("profiles.type", "admin")
      .order("updated_at", { ascending: false })
      .limit(3),

    supabase
      .from("journals")
      .select(
        `
    ${journalSelect},
    profiles:user_id!inner (
      id,
      type
    )
  `,
      )
      .eq("is_shared", true)
      .eq("profiles.type", "user")
      .not("mentor_pick_priority", "is", null)
      .order("mentor_pick_priority", {
        ascending: true,
      })
      .order("updated_at", {
        ascending: false,
      })
      .limit(20),

    supabase
      .from("journals")
      .select(
        `
    ${journalSelect},
    profiles:user_id!inner (
      id,
      type
    ),
    journal_comments (
      id
    )
  `,
      )
      .eq("is_shared", true)
      .eq("profiles.type", "user"),
  ]);

  const journals = journalsRes.data || [];
  const allShared = allSharedRes.data || [];
  const hariPicks = hariPicksRes.data || [];
  const topSuggestions = topSuggestionsRes.data || [];
  const topComments = topCommentsRes.data || [];

  const communityFocus = topComments
    .map((journal) => ({
      ...journal,
      total_comments: journal.journal_comments?.length || 0,
    }))
    .sort((a, b) => b.total_comments - a.total_comments)
    .slice(0, 5);

  const totalStrategies = strategiesRes.count || 0;

  const todaySharedSetups = allShared.filter((journal) =>
    isToday(journal.shared_at || journal.created_at),
  );

  const thisWeekSetups = allShared.filter((journal) =>
    isThisWeek(journal.shared_at || journal.created_at),
  );

  const activeSetups = journals.filter((journal) =>
    ACTIVE_STATUSES.includes(norm(journal.status)),
  );

  const validOpportunities = topSuggestions.filter((journal) => {
    const status = norm(journal.status);
    return ACTIVE_STATUSES.includes(status);
  });

  console.log("TOP SUGGESTIONS", topSuggestions.length);
  console.log(topSuggestions);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto max-w-8xl space-y-4 px-4 py-4">
        <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <div className="space-y-4">
            <div className="relative h-[185px] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
              <Image
                src="/playbook-bg.png"
                alt="Playbook background"
                fill
                priority
                className="object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/70 to-white/10" />

              <div className="relative z-10 flex h-full flex-col justify-center px-8">
                <h1 className="text-[34px] font-bold tracking-[-0.03em] text-slate-950">
                  Welcome back,{" "}
                  <span className="text-blue-600">
                    {getFirstName(profile?.full_name)}
                  </span>
                </h1>

                <p className="mt-2 text-[15px] text-slate-600">
                  Discipline compounds silently.
                </p>

                <div className="mt-5 w-fit rounded-full border border-blue-100 bg-white/90 px-4 py-2 text-xs font-semibold text-blue-600 shadow-sm">
                  Stay consistent, stay profitable.
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Today Shared Setups"
                value={todaySharedSetups.length}
                subtext="Community + Mentor"
                icon={Users}
                seed={1}
              />

              <StatCard
                title="This Week Setups"
                value={thisWeekSetups.length}
                subtext={`${totalStrategies} total playbooks`}
                icon={BookOpen}
                seed={2}
              />

              <StatCard
                title="Active Setups"
                value={activeSetups.length}
                subtext="Currently valid"
                icon={Zap}
                seed={3}
              />

              <StatCard
                title="Valid Opportunities"
                value={validOpportunities.length}
                subtext="High-conviction focus"
                icon={Target}
                seed={4}
              />
            </div>

            <PerformanceOverview journals={journals} />
          </div>

          <DashboardOpportunitySections
            hariPicks={hariPicks}
            topSuggestions={topSuggestions}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <UpcomingSessions />
          <CommunityFocus journals={communityFocus} />
          <RiskOverview journals={journals} />
        </div>
      </div>
    </div>
  );
}
