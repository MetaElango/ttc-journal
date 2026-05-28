import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Share2,
  Star,
  Target,
  TrendingUp,
} from "lucide-react";

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

function StatusBadge({ status }) {
  return (
    <span className="inline-flex rounded-full border px-2 py-1 text-xs font-medium">
      {status || "No status"}
    </span>
  );
}

function JournalCard({ journal, badge, showIncorporate = false }) {
  return (
    <div className="relative rounded-3xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {journal.mentor_pick_priority ? (
        <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          #{journal.mentor_pick_priority}
        </div>
      ) : badge ? (
        <div className="absolute right-4 top-4 rounded-full border bg-background px-3 py-1 text-xs font-medium">
          {badge}
        </div>
      ) : null}

      <div className="pr-14">
        <h3 className="text-lg font-semibold">
          {journal.strategy_snapshot?.strategy_name || "Unnamed Strategy"}
        </h3>

        <div className="mt-2 flex flex-wrap gap-2">
          <StatusBadge status={journal.status} />
          <span className="rounded-full border px-2 py-1 text-xs font-medium">
            {journal.direction || "—"}
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Symbol</span>
          <span className="font-medium">
            {journal.symbols?.symbol_name || "—"}
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Entry</span>
          <span className="font-medium">{journal.entry_price || "—"}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/app/circle"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium hover:bg-accent"
        >
          View
          <ArrowRight className="h-4 w-4" />
        </Link>

        {showIncorporate ? (
          <Link
            href={`/app/radars/new?sharedJournalId=${journal.id}`}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Incorporate
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, description, children }) {
  return (
    <div className="rounded-3xl border bg-card shadow-sm">
      <div className="border-b p-5">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="p-5">{children}</div>
    </div>
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

  const { data: adminProfiles, error: adminProfilesError } = await supabase
    .from("profiles")
    .select("id, type")
    .eq("type", "admin");

  console.log("ADMIN PROFILES:", adminProfiles, adminProfilesError);

  const adminIds = (adminProfiles || []).map((p) => p.id);

  const [
    journalsRes,
    strategiesRes,
    sharedRes,
    hariPicksRes,
    topSuggestionsRes,
  ] = await Promise.all([
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
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    supabase.from("strategies").select("id", {
      count: "exact",
      head: true,
    }),

    supabase
      .from("journals")
      .select("id", { count: "exact", head: true })
      .eq("is_shared", true),

    adminIds.length > 0
      ? supabase
          .from("journals")
          .select(
            `
              id,
              user_id,
              purpose,
              status,
              direction,
              entry_price,
              shared_at,
              mentor_pick_priority,
              strategy_snapshot,
              symbols:symbol_id (
                symbol_name
              )
            `,
          )
          .eq("is_shared", true)
          .in("user_id", adminIds)
          .order("shared_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] }),

    supabase
      .from("journals")
      .select(
        `
          id,
          user_id,
          purpose,
          status,
          direction,
          entry_price,
          shared_at,
          mentor_pick_priority,
          strategy_snapshot,
          symbols:symbol_id (
            symbol_name
          )
        `,
      )
      .eq("is_shared", true)
      .not("mentor_pick_priority", "is", null)
      .order("mentor_pick_priority", { ascending: true })
      .order("shared_at", { ascending: false })
      .limit(20),
  ]);

  const journals = journalsRes.data || [];
  const hariPicks = hariPicksRes.data || [];
  const topSuggestions = topSuggestionsRes.data || [];

  const totalStrategies = strategiesRes.count || 0;
  const sharedJournals = sharedRes.count || 0;

  const closedTrades = journals.filter((j) =>
    CLOSED_STATUSES.includes(String(j.status || "").toUpperCase()),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile?.full_name?.split(" ")[0] || "Trader"}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Curated playbooks, mentor picks, and your journal progress.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          title="Total Setups"
          value={journals.length}
          subtext="Your journal entries"
          icon={BookOpen}
        />

        <Card
          title="Strategies"
          value={totalStrategies}
          subtext="Strategy blueprints"
          icon={Target}
        />

        <Card
          title="Closed Trades"
          value={closedTrades.length}
          subtext="Completed trades"
          icon={BarChart3}
        />

        <Card
          title="Shared Playbooks"
          value={sharedJournals}
          subtext="Visible on social feed"
          icon={Share2}
        />
      </div>

      <Section
        icon={Star}
        title="Hari's Pick"
        description="Shared journals from admin traders."
      >
        {hariPicks.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No Hari's picks yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {hariPicks.map((journal) => (
              <JournalCard
                key={journal.id}
                journal={journal}
                badge="Admin"
                showIncorporate
              />
            ))}
          </div>
        )}
      </Section>

      <Section
        icon={TrendingUp}
        title="Top Suggestions"
        description="Mentor-picked journals ordered by priority."
      >
        {topSuggestions.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No top suggestions yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topSuggestions.map((journal) => (
              <JournalCard key={journal.id} journal={journal} showIncorporate />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
