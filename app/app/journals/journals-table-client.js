// app/app/journals/journals-table-client.jsx

"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownUp,
  BookOpen,
  CircleDashed,
  Eye,
  FilePenLine,
  Save,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import JournalDetailsModal from "../radars/journal-details-modal";

function norm(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function ClientDate({ value }) {
  const [text, setText] = useState("—");

  useEffect(() => {
    if (!value) {
      setText("—");
      return;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      setText("—");
      return;
    }

    setText(
      new Intl.DateTimeFormat(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date),
    );
  }, [value]);

  return <span suppressHydrationWarning>{text}</span>;
}

function toDatetimeLocal(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function firstTp(value) {
  if (!Array.isArray(value) || value.length === 0) return "—";
  return value[0];
}

function formatRisk(journal) {
  const mode = norm(journal.risk_mode);
  const risk = journal.risk_per_trade;

  if (risk == null) return "—";
  if (mode === "AMOUNT") return `$${risk}`;

  return `${risk}%`;
}

function getTradeStatusBadge(status) {
  const s = norm(status);

  if (s === "TRADE CLOSE WITH PROFIT") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (s === "TRADE SL HIT") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (s === "TRADE EXIT IN MID" || s === "ENTRY CLOSED") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (s === "ENTRY MISSED" || s === "ENTRY CANCELLED") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
}

function getAftermathLabel(value) {
  const v = norm(value);

  if (v === "OPTIMAL_TRADE_CLOSE") return "Optimal Trade Close";
  if (v === "ACTUAL_TP_HIT") return "Actual TP Hit";
  if (v === "ACTUAL_SL_NOT_HIT") return "Actual SL Not Hit";
  if (v === "NA") return "N/A";

  return "Not added";
}

function AftermathDetails({ journal }) {
  const hasAftermath =
    journal.aftermath_result ||
    journal.aftermath_date ||
    journal.aftermath_user_note ||
    journal.aftermath_mentor_note;

  if (!hasAftermath) return null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 text-sm font-bold text-slate-950">Aftermath</div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Status
          </div>
          <div className="mt-2 text-sm font-bold text-slate-900">
            {getAftermathLabel(journal.aftermath_result)}
          </div>
        </div>

        {journal.aftermath_date ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Aftermath Date
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-800">
              <ClientDate value={journal.aftermath_date} />
            </div>
          </div>
        ) : null}

        {journal.aftermath_user_note ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              User Aftermath Note
            </div>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {journal.aftermath_user_note}
            </div>
          </div>
        ) : null}

        {journal.aftermath_mentor_note ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Mentor Aftermath Note
            </div>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {journal.aftermath_mentor_note}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AftermathModal({ journal, onClose, onSaved }) {
  const [result, setResult] = useState(journal.aftermath_result || "");
  const [date, setDate] = useState(toDatetimeLocal(journal.aftermath_date));
  const [userNote, setUserNote] = useState(journal.aftermath_user_note || "");
  const [mentorNote, setMentorNote] = useState(
    journal.aftermath_mentor_note || "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const showDate = result === "ACTUAL_TP_HIT" || result === "ACTUAL_SL_NOT_HIT";

  async function saveAftermath() {
    setSaving(true);
    setError("");

    const res = await fetch("/api/journals/aftermath", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        journalId: journal.id,
        aftermath_result: result,
        aftermath_date: showDate ? date : "",
        aftermath_user_note: userNote,
        aftermath_mentor_note: mentorNote,
      }),
    });

    const json = await res.json();
    setSaving(false);

    if (!json.ok) {
      setError(json.message || "Failed to save aftermath.");
      return;
    }

    onSaved(journal.id, json.journal);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <div className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-600">
              AFTERMATH
            </div>

            <h2 className="mt-3 text-2xl font-bold text-slate-950">
              {journal.strategy_snapshot?.strategy_name || "Journal"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Capture what happened after closing this trade.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2.5 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ["OPTIMAL_TRADE_CLOSE", "Optimal Trade Close"],
              ["ACTUAL_TP_HIT", "Actual TP Hit"],
              ["ACTUAL_SL_NOT_HIT", "Actual SL Not Hit"],
              ["NA", "N/A"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setResult(value)}
                className={`rounded-2xl border p-4 text-left text-sm font-bold transition ${
                  result === value
                    ? "border-sky-500 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {showDate ? (
            <div>
              <label className="text-sm font-bold text-slate-900">
                Aftermath Date & Time
              </label>

              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-slate-900">
                User Aftermath Note
              </label>

              <textarea
                rows={5}
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                placeholder="Optional user note..."
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-white p-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-900">
                Mentor Aftermath Note
              </label>

              <textarea
                rows={5}
                value={mentorNote}
                onChange={(e) => setMentorNote(e.target.value)}
                placeholder="Optional mentor note..."
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-white p-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving || !result}
              onClick={saveAftermath}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-sky-600 px-6 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Aftermath"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JournalsTableClient({ journals, activeTab }) {
  const [items, setItems] = useState(journals);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [editingJournal, setEditingJournal] = useState(null);

  function handleSaved(journalId, updated) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === journalId
          ? {
              ...item,
              ...updated,
            }
          : item,
      ),
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-12 text-center shadow-sm backdrop-blur-xl">
        <CircleDashed className="mx-auto h-11 w-11 text-slate-300" />
        <h3 className="mt-4 text-lg font-bold text-slate-950">
          No journals found
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Closed, missed and cancelled trades will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1260px] text-left text-sm">
            <thead className="bg-[#f3f7fb] text-xs text-slate-500">
              <tr>
                <th className="sticky left-0 z-30 border-r bg-[#f3f7fb] px-5 py-4 font-bold">
                  <span className="inline-flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-slate-400" />
                    Strategy
                  </span>
                </th>

                <th className="px-5 py-4 font-bold">Initial Risk</th>

                <th className="px-5 py-4 font-bold">
                  <span className="inline-flex items-center gap-1">
                    Timeframe <ArrowDownUp className="h-3.5 w-3.5" />
                  </span>
                </th>

                <th className="px-5 py-4 font-bold">Market</th>
                <th className="px-5 py-4 font-bold">Action</th>
                <th className="px-5 py-4 font-bold">Entry</th>
                <th className="px-5 py-4 font-bold">Stop loss</th>
                <th className="px-5 py-4 font-bold">Take profit</th>
                <th className="px-5 py-4 font-bold">Close time</th>
                <th className="px-5 py-4 font-bold">Trade Status</th>

                <th className="sticky right-0 z-30 border-l bg-[#f3f7fb] px-5 py-4 text-center font-bold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {items.map((journal) => {
                const strategyName =
                  journal.strategy_snapshot?.strategy_name || "No Strategy";

                const isBuy = norm(journal.direction) === "BUY";

                return (
                  <tr
                    key={journal.id}
                    className="text-slate-700 transition hover:bg-sky-50/60"
                  >
                    <td className="sticky left-0 z-20 border-r bg-white px-5 py-4">
                      <div className="max-w-[190px] truncate font-bold text-slate-900">
                        {strategyName}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {formatRisk(journal)}
                    </td>

                    <td className="px-5 py-4 font-medium">
                      {Array.isArray(journal.entry_tf) &&
                      journal.entry_tf.length
                        ? journal.entry_tf[0]
                        : "—"}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {journal.symbols?.symbol_name || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                          isBuy
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {isBuy ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        {isBuy ? "Buy" : "Sell"}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {journal.entry_price ?? "—"}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {journal.stop_loss ?? "—"}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {firstTp(journal.take_profit)}
                    </td>

                    <td className="px-5 py-4 font-medium">
                      <ClientDate value={journal.journal_end_at} />
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${getTradeStatusBadge(
                          journal.status,
                        )}`}
                      >
                        {journal.status || "—"}
                      </span>
                    </td>

                    <td className="sticky right-0 z-20 border-l bg-white px-5 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedJournal(journal)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-sky-300 hover:text-sky-600"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {activeTab === "closed" ? (
                          <button
                            type="button"
                            onClick={() => setEditingJournal(journal)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-600 shadow-sm hover:bg-sky-100"
                          >
                            <FilePenLine className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <JournalDetailsModal
        journal={selectedJournal}
        onClose={() => setSelectedJournal(null)}
        afterContent={
          selectedJournal ? (
            <AftermathDetails journal={selectedJournal} />
          ) : null
        }
      />

      {editingJournal ? (
        <AftermathModal
          journal={editingJournal}
          onClose={() => setEditingJournal(null)}
          onSaved={handleSaved}
        />
      ) : null}
    </>
  );
}
