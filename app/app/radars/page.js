// app/app/radars/page.js

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import JournalsClient from "./journals-client";

const TABS = [
  { key: "open", label: "Open" },
  { key: "active", label: "Active" },
];

const VIEWS = [
  { key: "my", label: "My Opportunities" },
  { key: "incorporated", label: "Incorporated Opportunities" },
];

const OPEN_STATUSES = ["ENTRY PLACED", "ENTRY PLANNED"];
const ACTIVE_STATUSES = ["ENTRY TRIGGERED"];

const PURPOSES = ["TRADE OBSERVATION", "TRADE EXECUTION", "FORWARD TESTING"];

function norm(v) {
  return String(v || "")
    .trim()
    .toUpperCase();
}

function getJournalTab(journal) {
  const status = norm(journal.status);

  if (OPEN_STATUSES.includes(status)) return "open";
  if (ACTIVE_STATUSES.includes(status)) return "active";

  return null;
}

function isOpenOrActiveJournal(journal) {
  return getJournalTab(journal) !== null;
}

export default async function JournalsPage({ searchParams }) {
  const params = await searchParams;

  const activeTab = TABS.some((t) => t.key === params?.tab)
    ? params.tab
    : "open";

  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Opportunities</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please login to see your opportunities.
        </p>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("type")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.type === "admin";

  const { data: journals, error } = await supabase
    .from("journals")
    .select(
      `
      id,
      user_id,
      copied_from_journal_id,
      purpose,
      status,
      is_shared,
      shared_at,
      journal_start_at,
      journal_end_at,
      direction,
      quantity,
      entry_price,
      stop_loss,
      take_profit,
      take_profit_qty,
      risk_mode,
      risk_per_trade,
      entry_reason,
      exit_reason,
      exit_price,
      setup_images,
      reference_images,
      created_at,
      strategy_snapshot,
      owner_note,
      admin_note,
      owner_note_updated_at,
      admin_note_updated_at,
      symbols:symbol_id (
        id,
        symbol_name,
        category
      ),
      trading_accounts:trading_account_id (
        id,
        account_name,
        account_size,
        framework,
        tag
      )
      `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Journals</h1>
        <p className="mt-3 text-sm text-destructive">{error.message}</p>
      </div>
    );
  }

  async function getSignedImageUrls(paths = []) {
    if (!Array.isArray(paths) || paths.length === 0) return [];

    const { data, error } = await supabase.storage
      .from("journal-images")
      .createSignedUrls(paths, 60 * 60);

    if (error) {
      console.log("Signed URL error:", error.message);
      return [];
    }

    return data?.map((x) => x.signedUrl).filter(Boolean) || [];
  }

  const journalsWithImageUrls = await Promise.all(
    (journals || []).map(async (journal) => ({
      ...journal,
      setupImageUrls: await getSignedImageUrls(journal.setup_images),
      referenceImageUrls: await getSignedImageUrls(journal.reference_images),
    })),
  );

  const ownJournalsAll = journalsWithImageUrls.filter(
    (j) => !j.copied_from_journal_id,
  );

  const incorporatedJournalsAll = journalsWithImageUrls.filter(
    (j) => j.copied_from_journal_id,
  );

  const ownEligibleCount = ownJournalsAll.filter(isOpenOrActiveJournal).length;

  const incorporatedEligibleCount = incorporatedJournalsAll.filter(
    isOpenOrActiveJournal,
  ).length;

  const defaultView =
    ownEligibleCount === 0 && incorporatedEligibleCount > 0
      ? "incorporated"
      : "my";

  const activeView = VIEWS.some((v) => v.key === params?.view)
    ? params.view
    : defaultView;

  const activeSource =
    activeView === "incorporated" ? incorporatedJournalsAll : ownJournalsAll;

  const activeJournals = activeSource.filter(
    (j) => getJournalTab(j) === activeTab,
  );

  const counts = VIEWS.reduce((acc, view) => {
    const source =
      view.key === "incorporated" ? incorporatedJournalsAll : ownJournalsAll;

    acc[view.key] = TABS.reduce((tabAcc, tab) => {
      tabAcc[tab.key] = source.filter(
        (j) => getJournalTab(j) === tab.key,
      ).length;

      return tabAcc;
    }, {});

    return acc;
  }, {});

  const activeJournalsByPurpose = PURPOSES.map((purpose) => ({
    purpose,
    data: activeJournals.filter((j) => norm(j.purpose) === purpose),
  })).filter((group) => group.data.length > 0);

  const totalCurrentView =
    activeView === "incorporated"
      ? incorporatedJournalsAll.filter(isOpenOrActiveJournal).length
      : ownJournalsAll.filter(isOpenOrActiveJournal).length;

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6">
        <img
          src="/playbook-bg.png"
          alt=""
          className="absolute right-0 top-0 h-full w-[65%] object-cover opacity-80"
        />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white/80 px-4 py-2 text-sm font-semibold text-sky-600">
              OPPORTUNITIES
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950">
              My <span className="text-sky-500">Opportunities</span>
            </h1>

            <p className="mt-3 text-sm text-slate-500">
              {totalCurrentView}{" "}
              {activeView === "incorporated"
                ? "incorporated opportunities"
                : "my opportunities"}
            </p>
          </div>

          <Link
            href="/app/radars/new"
            className="inline-flex h-12 items-center rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
          >
            + New Opportunity
          </Link>
        </div>
      </div>

      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-3 md:grid-cols-2">
        {VIEWS.map((view) => {
          const active = activeView === view.key;
          const total =
            view.key === "incorporated"
              ? incorporatedJournalsAll.filter(isOpenOrActiveJournal).length
              : ownJournalsAll.filter(isOpenOrActiveJournal).length;

          return (
            <Link
              key={view.key}
              href={`/app/radars?view=${view.key}&tab=${activeTab}`}
              className={`rounded-2xl px-4 py-3 text-center text-sm font-semibold transition ${
                active
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-sky-50 hover:text-sky-600"
              }`}
            >
              {view.label} ({total})
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white p-3">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const count = counts?.[activeView]?.[tab.key] || 0;

          return (
            <Link
              key={tab.key}
              href={`/app/radars?view=${activeView}&tab=${tab.key}`}
              className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-slate-950 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label} ({count})
            </Link>
          );
        })}
      </div>

      {activeJournalsByPurpose.length === 0 ? (
        <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
          No opportunities in this tab.
        </div>
      ) : (
        <JournalsClient
          key={`${activeView}-${activeTab}`}
          journalsByPurpose={activeJournalsByPurpose}
          currentUserId={user.id}
          isAdmin={isAdmin}
          activeView={activeView}
        />
      )}
    </div>
  );
}
