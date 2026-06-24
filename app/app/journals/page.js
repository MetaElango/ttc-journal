import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Target } from "lucide-react";
import JournalsTableClient from "./journals-table-client";
import JournalIntelligencePanel from "./journal-intelligence-panel";

const VIEWS = [
  { key: "my", label: "My Journals" },
  { key: "incorporated", label: "Incorporated Journals" },
];

const TABS = [
  { key: "closed", label: "Closed" },
  { key: "missed", label: "Missed" },
  { key: "cancelled", label: "Cancelled" },
];

const CLOSED_STATUSES = [
  "TRADE SL HIT",
  "TRADE CLOSE WITH PROFIT",
  "TRADE EXIT IN MID",
];

const MISSED_STATUSES = ["ENTRY MISSED"];

const CANCELLED_STATUSES = ["ENTRY CANCELLED"];

function norm(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function getJournalTab(journal) {
  const status = norm(journal.status);

  if (CLOSED_STATUSES.includes(status)) return "closed";
  if (MISSED_STATUSES.includes(status)) return "missed";
  if (CANCELLED_STATUSES.includes(status)) return "cancelled";

  return null;
}

async function getSignedImageUrls(supabase, paths = []) {
  if (!Array.isArray(paths) || paths.length === 0) return [];

  const { data, error } = await supabase.storage
    .from("journal-images")
    .createSignedUrls(paths, 60 * 60);

  if (error) return [];

  return data?.map((item) => item.signedUrl).filter(Boolean) || [];
}

async function attachImageUrls(supabase, journals = []) {
  return Promise.all(
    journals.map(async (journal) => {
      const setupImageUrls = await getSignedImageUrls(
        supabase,
        journal.setup_images || [],
      );

      const referenceImageUrls = await getSignedImageUrls(
        supabase,
        journal.reference_images || [],
      );

      return {
        ...journal,
        setupImageUrls,
        referenceImageUrls,
      };
    }),
  );
}

export default async function JournalsPage({ searchParams }) {
  const params = await searchParams;

  const view = params?.view || "my";
  const tab = params?.tab || "closed";

  const activeView = VIEWS.some((item) => item.key === view) ? view : "my";
  const activeTab = TABS.some((item) => item.key === tab) ? tab : "closed";

  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("journals")
    .select(
      `
      id,
      user_id,
      copied_from_journal_id,
      strategy_id,
      trading_account_id,
      symbol_id,
      strategy_snapshot,
      purpose,
      status,
      direction,
      quantity,
      risk_mode,
      risk_per_trade,
      entry_price,
      stop_loss,
      take_profit,
      take_profit_qty,
      entry_reason,
      exit_reason,
      exit_price,
      journal_start_at,
      journal_end_at,
      htf,
      entry_tf,
      setup_images,
      reference_images,
      owner_note,
      owner_note_updated_at,
      admin_note,
      admin_note_updated_at,
      is_shared,
      shared_at,
      created_at,
      updated_at,
      aftermath_result,
      aftermath_date,
      aftermath_user_note,
      aftermath_mentor_note,
      aftermath_updated_at,
      symbols:symbol_id (
        id,
        symbol_name,
        category
      ),
      trading_accounts!inner (
  id,
  account_name,
  account_size,
  framework,
  is_hidden
)
      `,
    )
    .eq("user_id", user.id)
    .eq("trading_accounts.is_hidden", false)
    .order("journal_end_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const allJournals = await attachImageUrls(supabase, data || []);

  const counts = {
    my: {
      closed: allJournals.filter(
        (journal) =>
          journal.copied_from_journal_id === null &&
          getJournalTab(journal) === "closed",
      ).length,
      missed: allJournals.filter(
        (journal) =>
          journal.copied_from_journal_id === null &&
          getJournalTab(journal) === "missed",
      ).length,
      cancelled: allJournals.filter(
        (journal) =>
          journal.copied_from_journal_id === null &&
          getJournalTab(journal) === "cancelled",
      ).length,
    },
    incorporated: {
      closed: allJournals.filter(
        (journal) =>
          journal.copied_from_journal_id !== null &&
          getJournalTab(journal) === "closed",
      ).length,
      missed: allJournals.filter(
        (journal) =>
          journal.copied_from_journal_id !== null &&
          getJournalTab(journal) === "missed",
      ).length,
      cancelled: allJournals.filter(
        (journal) =>
          journal.copied_from_journal_id !== null &&
          getJournalTab(journal) === "cancelled",
      ).length,
    },
  };

  const filteredByView = allJournals.filter((journal) => {
    if (activeView === "incorporated") {
      return journal.copied_from_journal_id !== null;
    }

    return journal.copied_from_journal_id === null;
  });

  const journals = filteredByView.filter(
    (journal) => getJournalTab(journal) === activeTab,
  );

  return (
    <main className="min-h-screen bg-[#f6f9fd] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-8xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-sm backdrop-blur-xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-600">
                <Target className="h-3.5 w-3.5" />
                Trade History
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Journals
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Review closed, missed and cancelled opportunities.
              </p>
            </div>

            <Link
              href="/app/radars/new"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-sky-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700"
            >
              New Opportunity
            </Link>
          </div>
        </section>

        <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-2 shadow-sm backdrop-blur-xl">
          <div className="grid gap-2 md:grid-cols-2">
            {VIEWS.map((item) => {
              const active = activeView === item.key;

              const totalCount =
                counts[item.key].closed +
                counts[item.key].missed +
                counts[item.key].cancelled;

              return (
                <Link
                  key={item.key}
                  href={`/app/journals?view=${item.key}&tab=${activeTab}`}
                  className={`rounded-2xl px-4 py-3 text-center text-sm font-bold transition ${
                    active
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {totalCount}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => {
            const active = activeTab === item.key;

            return (
              <Link
                key={item.key}
                href={`/app/journals?view=${activeView}&tab=${item.key}`}
                className={`rounded-2xl border px-5 py-2.5 text-sm font-bold transition ${
                  active
                    ? "border-sky-600 bg-sky-600 text-white shadow-sm"
                    : "border-slate-200 bg-white/85 text-slate-500 hover:text-slate-900"
                }`}
              >
                {item.label}
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {counts[activeView][item.key]}
                </span>
              </Link>
            );
          })}
        </div>

        <JournalsTableClient
          key={`${activeView}-${activeTab}`}
          journals={journals}
          activeTab={activeTab}
        />
        <JournalIntelligencePanel journals={journals} />
      </div>
    </main>
  );
}
