import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import JournalsClient, { JournalsTableBody } from "./journals-client";

const TABS = [
  { key: "open", label: "Open" },
  { key: "closed", label: "Closed" },
  { key: "cancelled", label: "Cancelled" },
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

function getWeightedTakeProfit(journal) {
  const prices = Array.isArray(journal.take_profit) ? journal.take_profit : [];
  const qtys = Array.isArray(journal.take_profit_qty)
    ? journal.take_profit_qty
    : [];

  if (!prices.length) return 0;

  if (qtys.length === prices.length) {
    let total = 0;
    let totalQty = 0;

    for (let i = 0; i < prices.length; i++) {
      const price = Number(prices[i]);
      const qty = Number(qtys[i]);

      if (Number.isNaN(price) || Number.isNaN(qty) || qty <= 0) continue;

      total += price * qty;
      totalQty += qty;
    }

    if (totalQty > 0) return total / totalQty;
  }

  const validPrices = prices.map(Number).filter((n) => !Number.isNaN(n));
  if (!validPrices.length) return 0;

  return validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
}

function calculatePlannedRR(journal) {
  const direction = norm(journal.direction);
  const entry = Number(journal.entry_price);
  const stop = Number(journal.stop_loss);
  const tp = Number(getWeightedTakeProfit(journal));

  if (!(entry > 0) || !(stop > 0) || !(tp > 0)) return 0;

  if (direction === "BUY") {
    const risk = entry - stop;
    if (risk <= 0) return 0;
    return (tp - entry) / risk;
  }

  if (direction === "SELL") {
    const risk = stop - entry;
    if (risk <= 0) return 0;
    return (entry - tp) / risk;
  }

  return 0;
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function formatRisk(journal) {
  const mode = norm(journal.risk_mode);
  const risk = journal.risk_per_trade;

  if (risk == null) return "—";
  if (mode === "PERCENT") return `${risk}%`;
  if (mode === "AMOUNT") return `$${risk}`;

  return risk;
}

function shortText(value, max = 24) {
  const text = String(value || "—");
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function JournalsTable({ journals, setSelectedJournal }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="relative w-full min-w-[1030px] table-fixed text-sm">
        <thead className="bg-background">
          <tr className="border-b">
            <th className="sticky left-0 z-30 w-[240px] bg-background px-4 py-3 text-left font-medium shadow-[2px_0_5px_rgba(0,0,0,0.08)]">
              Strategy
            </th>
            <th className="w-[120px] bg-background px-4 py-3 text-left font-medium">
              Symbol
            </th>
            <th className="w-[120px] bg-background px-4 py-3 text-left font-medium">
              Direction
            </th>
            <th className="w-[160px] bg-background px-4 py-3 text-left font-medium">
              Trading Style
            </th>
            <th className="w-[140px] bg-background px-4 py-3 text-left font-medium">
              Setup
            </th>
            <th className="w-[120px] bg-background px-4 py-3 text-left font-medium">
              Entry
            </th>
            <th className="w-[120px] bg-background px-4 py-3 text-left font-medium">
              SL
            </th>
            <th className="w-[120px] bg-background px-4 py-3 text-left font-medium">
              Risk
            </th>
            <th className="w-[100px] bg-background px-4 py-3 text-left font-medium">
              RR
            </th>
            <th className="sticky right-[104px] z-30 w-[104px] bg-background px-4 py-3 text-left font-medium shadow-[-2px_0_5px_rgba(0,0,0,0.08)]">
              Edit
            </th>
            <th className="sticky right-0 z-30 w-[104px] bg-background px-4 py-3 text-left font-medium shadow-[-2px_0_5px_rgba(0,0,0,0.08)]">
              Details
            </th>
          </tr>
        </thead>

        <JournalsTableBody
          journals={journals}
          setSelectedJournal={setSelectedJournal}
          calculatePlannedRR={calculatePlannedRR}
          round2={round2}
          formatRisk={formatRisk}
          shortText={shortText}
        />
      </table>
    </div>
  );
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
        is_shared,
        shared_at,
        user_id,
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

  const allJournals = journals || [];

  async function getSignedImageUrls(paths = []) {
    if (!Array.isArray(paths) || paths.length === 0) return [];

    const { data, error } = await supabase.storage
      .from("journal-images")
      .createSignedUrls(paths, 60 * 60); // 1 hour

    if (error) {
      console.log("Signed URL error:", error.message);
      return [];
    }

    return data?.map((x) => x.signedUrl).filter(Boolean) || [];
  }

  const journalsWithImageUrls = await Promise.all(
    allJournals.map(async (journal) => ({
      ...journal,
      setupImageUrls: await getSignedImageUrls(journal.setup_images),
      referenceImageUrls: await getSignedImageUrls(journal.reference_images),
    })),
  );

  const counts = TABS.reduce((acc, tab) => {
    acc[tab.key] = journalsWithImageUrls.filter(
      (j) => getJournalTab(j) === tab.key,
    ).length;
    return acc;
  }, {});

  const filteredJournals = journalsWithImageUrls.filter(
    (j) => getJournalTab(j) === activeTab,
  );

  const journalsByPurpose = PURPOSES.map((purpose) => ({
    purpose,
    data: filteredJournals.filter((j) => norm(j.purpose) === purpose),
  })).filter((group) => group.data.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Journals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {journalsWithImageUrls.length} journals
          </p>
        </div>

        <Link
          href="/app/strategies"
          className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
        >
          Create from Strategy
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 border-b">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <Link
              key={tab.key}
              href={`/app/journals?tab=${tab.key}`}
              className={`border-b-2 px-4 py-3 text-sm font-medium ${
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label} ({counts[tab.key] || 0})
            </Link>
          );
        })}
      </div>

      {filteredJournals.length === 0 ? (
        <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
          No journals in this tab.
        </div>
      ) : (
        <JournalsClient journalsByPurpose={journalsByPurpose} />
      )}
    </div>
  );
}
