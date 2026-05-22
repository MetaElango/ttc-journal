"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Calendar,
  Eye,
  Pencil,
  Share2,
  TrendingDown,
  TrendingUp,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  MessageSquareText,
  Save,
  Underline,
  Images,
  StickyNote,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import JournalDetailsModal from "./journal-details-modal";
import CommentsSection from "../social/comments-section";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapUnderline from "@tiptap/extension-underline";
import TiptapLink from "@tiptap/extension-link";

const EDITABLE_ACTIVE_STATUSES = [
  "RUNNING TRADE",
  "ENTRY TRIGGERED",
  "ENTRY PLACED",
];

function norm(v) {
  return String(v || "")
    .trim()
    .toUpperCase();
}

function canEditJournal(journal) {
  const purpose = norm(journal.purpose);
  const status = norm(journal.status);

  if (purpose === "FOR OBSERVATION") return !status;

  if (purpose === "ENTRY PLANNED" || purpose === "FORWARD TESTING") {
    return EDITABLE_ACTIVE_STATUSES.includes(status);
  }

  return false;
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
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

function formatRisk(journal) {
  const mode = norm(journal.risk_mode);
  const risk = journal.risk_per_trade;

  if (risk == null) return "—";
  if (mode === "PERCENT") return `${risk}%`;
  if (mode === "AMOUNT") return `$${risk}`;

  return risk;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getStatusStyle(status) {
  const s = norm(status);

  if (["ENTRY PLACED", "ENTRY TRIGGERED", "RUNNING TRADE"].includes(s)) {
    return {
      border: "border-l-emerald-500",
      badge:
        "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      label: status || "Open",
    };
  }

  if (["TRADE CLOSE WITH PROFIT"].includes(s)) {
    return {
      border: "border-l-blue-500",
      badge:
        "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300",
      label: status,
    };
  }

  if (["TRADE SL HIT"].includes(s)) {
    return {
      border: "border-l-red-500",
      badge: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
      label: status,
    };
  }

  if (["ENTRY CANCELLED", "ENTRY MISSED"].includes(s)) {
    return {
      border: "border-l-muted-foreground/40",
      badge: "border-border bg-muted text-muted-foreground",
      label: status,
    };
  }

  return {
    border: "border-l-border",
    badge: "border-border bg-background text-muted-foreground",
    label: status || "No status",
  };
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border bg-background/70 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value ?? "—"}</div>
    </div>
  );
}

function ImageStrip({ journal }) {
  const images = [
    ...(journal.setupImageUrls || []),
    ...(journal.referenceImageUrls || []),
  ];

  if (!images.length) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
        No images uploaded.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {images.map((url, index) => (
        <div
          key={`${url}-${index}`}
          className="h-24 w-32 overflow-hidden rounded-2xl border bg-muted"
        >
          <img
            src={url}
            alt={`Journal image ${index + 1}`}
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapUnderline,
      TiptapLink.configure({
        openOnClick: false,
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "note-content prose prose-sm dark:prose-invert max-w-none min-h-[180px] px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  function addLink() {
    const previousUrl = editor.getAttributes("link").href || "";
    const url = window.prompt("Enter URL", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({
        href: url.startsWith("http") ? url : `https://${url}`,
      })
      .run();
  }

  const buttonClass =
    "flex h-9 w-9 items-center justify-center rounded-xl border bg-background transition hover:bg-accent";

  return (
    <div className="overflow-hidden rounded-2xl border bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 p-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={buttonClass}
        >
          <Bold className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={buttonClass}
        >
          <Italic className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={buttonClass}
        >
          <Underline className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={buttonClass}
        >
          <List className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={buttonClass}
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <button type="button" onClick={addLink} className={buttonClass}>
          <Link2 className="h-4 w-4" />
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

function NoteBox({ title, value, canEdit, onSave, saving, updatedAt }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  return (
    <div className="rounded-2xl border bg-background/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
            {title}
          </div>

          {updatedAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Updated {formatDate(updatedAt)}
            </p>
          ) : null}
        </div>

        {canEdit ? (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="rounded-xl border px-3 py-1.5 text-xs hover:bg-accent"
          >
            {editing ? "Cancel" : value ? "Edit" : "Add"}
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="space-y-3">
          <RichTextEditor value={draft} onChange={setDraft} />

          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              await onSave(draft);
              setEditing(false);
            }}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save Note"}
          </button>
        </div>
      ) : value ? (
        <div
          className="note-content prose prose-sm max-w-none text-sm dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: value }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No note added yet.</p>
      )}
    </div>
  );
}

function NotesSection({ journal, currentUserId, isAdmin, onNoteUpdated }) {
  const [savingType, setSavingType] = useState("");

  const isOwner = journal.user_id === currentUserId;

  async function saveNote(type, note) {
    setSavingType(type);

    const res = await fetch("/api/journals/notes", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        journalId: journal.id,
        type,
        note,
      }),
    });

    const json = await res.json();

    setSavingType("");

    if (!json.ok) {
      alert(json.message || "Failed to save note.");
      return;
    }

    onNoteUpdated(journal.id, type, json.note);
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <NoteBox
        title="Trader Note"
        value={journal.owner_note}
        updatedAt={journal.owner_note_updated_at}
        canEdit={isOwner}
        saving={savingType === "owner"}
        onSave={(note) => saveNote("owner", note)}
      />

      <NoteBox
        title="Admin Note"
        value={journal.admin_note}
        updatedAt={journal.admin_note_updated_at}
        canEdit={isAdmin}
        saving={savingType === "admin"}
        onSave={(note) => saveNote("admin", note)}
      />
    </div>
  );
}

function JournalTabs({ journal, activeTab, setActiveTab, commentCount }) {
  const imageCount =
    (journal.setupImageUrls || []).length +
    (journal.referenceImageUrls || []).length;

  const hasNotes = Boolean(journal.owner_note || journal.admin_note);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setActiveTab("images")}
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
          activeTab === "images"
            ? "bg-primary text-primary-foreground"
            : "bg-background hover:bg-accent"
        }`}
      >
        <Images className="h-3.5 w-3.5" />
        Images
        <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] dark:bg-white/10">
          {imageCount}
        </span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab("notes")}
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
          activeTab === "notes"
            ? "bg-primary text-primary-foreground"
            : "bg-background hover:bg-accent"
        }`}
      >
        <StickyNote className="h-3.5 w-3.5" />
        Notes
        {hasNotes ? (
          <span
            className={`h-2 w-2 rounded-full ${
              activeTab === "notes" ? "bg-primary-foreground" : "bg-emerald-500"
            }`}
          />
        ) : null}
      </button>

      {journal.is_shared ? (
        <button
          type="button"
          onClick={() => setActiveTab("comments")}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
            activeTab === "comments"
              ? "bg-primary text-primary-foreground"
              : "bg-background hover:bg-accent"
          }`}
        >
          <MessageSquareText className="h-3.5 w-3.5" />
          Comments
          <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] dark:bg-white/10">
            {commentCount}
          </span>
        </button>
      ) : null}
    </div>
  );
}

function JournalCard({
  journal,
  index,
  setSelectedJournal,
  currentUserId,
  isAdmin,
  onNoteUpdated,
  expanded,
  toggleExpand,
}) {
  const [activeTab, setActiveTab] = useState("images");
  const [commentCount, setCommentCount] = useState(0);

  const strategyName = journal?.strategy_snapshot?.strategy_name || "—";
  const tradingStyle = journal?.strategy_snapshot?.trading_style || "—";
  const setup = journal?.strategy_snapshot?.setup_type || "—";
  const symbol = journal?.symbols?.symbol_name || "—";
  const rr = calculatePlannedRR(journal);
  const statusStyle = getStatusStyle(journal.status);
  const isBuy = norm(journal.direction) === "BUY";

  async function shareJournal() {
    const res = await fetch("/api/journals/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ journalId: journal.id }),
    });

    const json = await res.json();

    if (!json.ok) {
      alert(json.message || "Failed to share opportunity.");
      return;
    }

    window.location.reload();
  }

  return (
    <article
      className={[
        "group overflow-hidden rounded-3xl border border-l-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        statusStyle.border,
        index % 2 === 0 ? "bg-card" : "bg-muted/20",
      ].join(" ")}
    >
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-semibold tracking-tight">
                  {strategyName}
                </h3>

                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyle.badge}`}
                >
                  {statusStyle.label}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{journal.purpose || "—"}</span>
                <span>•</span>
                <span>{tradingStyle}</span>
                <span>•</span>
                <span>{setup}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-medium">
                {isBuy ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                )}
                {journal.direction || "—"}
              </span>

              <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium">
                {symbol}
              </span>

              <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium">
                RR: {rr > 0 ? `1:${round2(rr)}` : "—"}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(journal.journal_start_at || journal.created_at)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={journal.is_shared}
              onClick={shareJournal}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 text-xs font-medium text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300"
            >
              <Share2 className="h-3.5 w-3.5" />
              {journal.is_shared ? "Shared" : "Share"}
            </button>

            {canEditJournal(journal) ? (
              <Link
                href={`/app/journals/${journal.id}/edit`}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-300"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Link>
            ) : null}

            <button
              type="button"
              onClick={() => setSelectedJournal(journal)}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300"
            >
              <Eye className="h-3.5 w-3.5" />
              Details
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => toggleExpand(journal.id)}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Expand
                </>
              )}
            </button>
          </div>
        </div>

        {expanded ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <MiniStat label="Entry" value={journal.entry_price} />
              <MiniStat label="SL" value={journal.stop_loss} />
              <MiniStat
                label="TP"
                value={
                  Array.isArray(journal.take_profit) &&
                  journal.take_profit.length
                    ? journal.take_profit.join(", ")
                    : "—"
                }
              />
              <MiniStat label="Risk" value={formatRisk(journal)} />
              <MiniStat label="Qty" value={journal.quantity} />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="text-xs text-muted-foreground">
                End: {formatDate(journal.journal_end_at)}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {expanded ? (
        <div className="px-5 pb-5">
          <JournalTabs
            journal={journal}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            commentCount={commentCount}
          />

          {activeTab === "images" ? (
            <div className="pt-4">
              <ImageStrip journal={journal} />
            </div>
          ) : null}

          {activeTab === "notes" ? (
            <div className="pt-4">
              <NotesSection
                journal={journal}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onNoteUpdated={onNoteUpdated}
              />
            </div>
          ) : null}

          {activeTab === "comments" && journal.is_shared ? (
            <div className="pt-4">
              <CommentsSection
                journalId={journal.id}
                onParentCountChange={setCommentCount}
              />
            </div>
          ) : null}

          {journal.is_shared && activeTab !== "comments" ? (
            <CommentsSection
              journalId={journal.id}
              onParentCountChange={setCommentCount}
              hidden
            />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function JournalsGrid({
  journals,
  setSelectedJournal,
  currentUserId,
  isAdmin,
  onNoteUpdated,
  expandedRows,
  toggleExpand,
}) {
  return (
    <div className="grid gap-4">
      {journals.map((journal, index) => (
        <JournalCard
          key={journal.id}
          journal={journal}
          index={index}
          setSelectedJournal={setSelectedJournal}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onNoteUpdated={onNoteUpdated}
          expanded={!!expandedRows[journal.id]}
          toggleExpand={toggleExpand}
        />
      ))}
    </div>
  );
}

export default function JournalsClient({
  journalsByPurpose,
  currentUserId,
  isAdmin,
}) {
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [groups, setGroups] = useState(journalsByPurpose);

  const initialExpanded = {};

  journalsByPurpose.forEach((group) => {
    if (group.data?.length) {
      initialExpanded[group.data[0].id] = true;
    }
  });

  const [expandedRows, setExpandedRows] = useState(initialExpanded);

  function toggleExpand(id) {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function handleNoteUpdated(journalId, type, note) {
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        data: group.data.map((journal) => {
          if (journal.id !== journalId) return journal;

          if (type === "owner") {
            return {
              ...journal,
              owner_note: note,
              owner_note_updated_at: new Date().toISOString(),
            };
          }

          return {
            ...journal,
            admin_note: note,
            admin_note_updated_at: new Date().toISOString(),
          };
        }),
      })),
    );
  }

  return (
    <>
      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.purpose} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {group.purpose}
              </h2>

              <span className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                {group.data.length}
              </span>
            </div>

            <JournalsGrid
              journals={group.data}
              setSelectedJournal={setSelectedJournal}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onNoteUpdated={handleNoteUpdated}
              expandedRows={expandedRows}
              toggleExpand={toggleExpand}
            />
          </section>
        ))}
      </div>

      <JournalDetailsModal
        journal={selectedJournal}
        onClose={() => setSelectedJournal(null)}
      />
    </>
  );
}
