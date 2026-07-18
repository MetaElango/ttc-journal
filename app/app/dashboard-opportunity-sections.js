"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, Star, Target, TrendingUp } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import JournalDetailsModal from "./radars/journal-details-modal";

async function getSignedImageUrl(supabase, path) {
  if (!path) return null;
  if (String(path).startsWith("http")) return path;

  const { data, error } = await supabase.storage
    .from("journal-images")
    .createSignedUrl(path, 60 * 60);

  if (error) {
    console.error("Image signed URL error:", error.message, path);
    return null;
  }

  return data?.signedUrl || null;
}

async function prepareJournalForModal(journal) {
  const supabase = createClient();

  const setupImageUrls = await Promise.all(
    (journal.setup_images || []).map((path) =>
      getSignedImageUrl(supabase, path),
    ),
  );

  const referenceImageUrls = await Promise.all(
    (journal.reference_images || []).map((path) =>
      getSignedImageUrl(supabase, path),
    ),
  );

  return {
    ...journal,
    setupImageUrls: setupImageUrls.filter(Boolean),
    referenceImageUrls: referenceImageUrls.filter(Boolean),
    owner_note: journal.owner_note || null,
    admin_note: journal.admin_note || null,
  };
}

function norm(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function isShortDirection(journal) {
  const direction = norm(journal?.direction);
  return (
    direction.includes("SELL") ||
    direction.includes("SHORT") ||
    direction.includes("BEAR")
  );
}

function getSetupName(journal) {
  return (
    journal?.strategy_snapshot?.strategy_name ||
    journal?.strategy_snapshot?.setup_type ||
    "Unnamed Setup"
  );
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

function EyeButton({ onClick, loading, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer shrink-0 rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 ${className}`}
      title="View details"
    >
      <Eye className="h-4 w-4" />
    </button>
  );
}
function getStatusStyle(status) {
  switch (status) {
    case "ENTRY PLANNED":
      return "bg-slate-100 text-slate-700";

    case "ENTRY PLACED":
      return "bg-blue-100 text-blue-700";

    case "ENTRY TRIGGERED":
    case "RUNNING TRADE":
      return "bg-amber-100 text-amber-700";

    case "TRADE CLOSE WITH PROFIT":
      return "bg-emerald-100 text-emerald-700";

    case "TRADE SL HIT":
      return "bg-red-100 text-red-700";

    case "TRADE EXIT IN MID":
    case "ENTRY CLOSED":
      return "bg-purple-100 text-purple-700";

    case "ENTRY MISSED":
      return "bg-orange-100 text-orange-700";

    case "ENTRY CANCELLED":
      return "bg-gray-100 text-gray-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}
function HariPick({ hariPicks, onOpenJournal, loadingId }) {
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
            <div
              key={pick.id}
              className="rounded-[18px] border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/40"
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

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      isShortDirection(pick)
                        ? "bg-red-50 text-red-600"
                        : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    {isShortDirection(pick) ? "SHORT" : "LONG"}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                      pick.status,
                    )}`}
                  >
                    {pick.status}
                  </span>

                  <EyeButton
                    loading={loadingId === pick.id}
                    onClick={() => onOpenJournal(pick)}
                    className="cursor-pointer shrink-0 rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                {" "}
                <div>
                  <p className="text-slate-400">Timeframe</p>
                  <p className="mt-1 font-semibold text-slate-700">
                    {getTimeframe(pick)}
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
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function OpportunityRow({ journal, onOpenJournal, loadingId }) {
  const isShort = isShortDirection(journal);

  return (
    <div className="grid grid-cols-[1fr_44px_74px_40px] items-center gap-3 rounded-[14px] px-1 py-3">
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

      <span
        className={`rounded-[10px] border px-3 py-1.5 text-center text-xs font-semibold ${
          isShort
            ? "border-red-100 bg-red-50 text-red-600"
            : "border-emerald-100 bg-emerald-50 text-emerald-600"
        }`}
      >
        {isShort ? "SHORT" : "LONG"}
      </span>
      <EyeButton
        loading={loadingId === journal.id}
        onClick={() => onOpenJournal(journal)}
      />
    </div>
  );
}

function PreferableOpportunities({ topSuggestions, onOpenJournal, loadingId }) {
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
              <OpportunityRow
                key={journal.id}
                journal={journal}
                onOpenJournal={onOpenJournal}
                loadingId={loadingId}
              />
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

export default function DashboardOpportunitySections({
  hariPicks,
  topSuggestions,
}) {
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  async function handleOpenJournal(journal) {
    setLoadingId(journal.id);

    const preparedJournal = await prepareJournalForModal(journal);

    setSelectedJournal(preparedJournal);
    setLoadingId(null);
  }

  return (
    <>
      <div className="space-y-4">
        <HariPick
          hariPicks={hariPicks}
          onOpenJournal={handleOpenJournal}
          loadingId={loadingId}
        />

        <PreferableOpportunities
          topSuggestions={topSuggestions}
          onOpenJournal={handleOpenJournal}
          loadingId={loadingId}
        />
      </div>

      <JournalDetailsModal
        journal={selectedJournal}
        onClose={() => setSelectedJournal(null)}
      />
    </>
  );
}
