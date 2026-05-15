// app/app/journals/page.js

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import JournalsClient from "./journals-client";

const TABS = [
  { key: "open", label: "Open" },
  { key: "closed", label: "Closed" },
  { key: "cancelled", label: "Cancelled" },
];

const VIEWS = [
  { key: "my", label: "My Journals" },
  { key: "incorporated", label: "Incorporated Journals" },
];

const PURPOSES = ["FOR OBSERVATION", "ENTRY PLANNED", "FORWARD TESTING"];

const OPEN_STATUSES = ["ENTRY PLACED", "ENTRY TRIGGERED", "RUNNING TRADE"];

const CLOSED_STATUSES = [
  "TRADE SL HIT",
  "TRADE CLOSE WITH PROFIT",
  "TRADE EXIT IN MID",
  "ENTRY CLOSED",
];

const CANCELLED_STATUSES = ["ENTRY CANCELLED", "ENTRY MISSED"];

function norm(v) {
  return String(v || "")
    .trim()
    .toUpperCase();
}

function getJournalTab(journal) {
  const status = norm(journal.status);

  if (OPEN_STATUSES.includes(status)) return "open";
  if (CLOSED_STATUSES.includes(status)) return "closed";
  if (CANCELLED_STATUSES.includes(status)) return "cancelled";

  return null;
}

export default async function JournalsPage({ searchParams }) {
  const params = await searchParams;

  const activeTab = TABS.some((t) => t.key === params?.tab)
    ? params.tab
    : "open";

  const activeView = VIEWS.some((v) => v.key === params?.view)
    ? params.view
    : "my";

  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  const { data: profile } = await supabase
    .from("profiles")
    .select("type")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.type === "admin";

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
      ? incorporatedJournalsAll.length
      : ownJournalsAll.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Journals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalCurrentView}{" "}
            {activeView === "incorporated"
              ? "incorporated journals"
              : "my journals"}
          </p>
        </div>

        <Link
          href="/app/strategies"
          className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
        >
          Create from Strategy
        </Link>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-card p-3 md:grid-cols-2">
        {VIEWS.map((view) => {
          const active = activeView === view.key;
          const total =
            view.key === "incorporated"
              ? incorporatedJournalsAll.length
              : ownJournalsAll.length;

          return (
            <Link
              key={view.key}
              href={`/app/journals?view=${view.key}&tab=${activeTab}`}
              className={`rounded-xl px-4 py-3 text-center text-sm font-medium transition ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {view.label} ({total})
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 border-b">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const count = counts?.[activeView]?.[tab.key] || 0;

          return (
            <Link
              key={tab.key}
              href={`/app/journals?view=${activeView}&tab=${tab.key}`}
              className={`border-b-2 px-4 py-3 text-sm font-medium ${
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label} ({count})
            </Link>
          );
        })}
      </div>

      {activeJournalsByPurpose.length === 0 ? (
        <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
          No journals in this tab.
        </div>
      ) : (
        <JournalsClient
          journalsByPurpose={activeJournalsByPurpose}
          currentUserId={user.id}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
