// app/app/journals/journals-table-client.jsx

"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  BookOpen,
  CircleDashed,
  Eye,
  FilePenLine,
  ImageIcon,
  Paperclip,
  Save,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import JournalDetailsModal from "../radars/journal-details-modal";

const PAGE_SIZE = 10;
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
  const [images, setImages] = useState([]);
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

    const formData = new FormData();

    formData.append("journalId", journal.id);
    formData.append("aftermath_result", result);
    formData.append("aftermath_date", showDate ? date : "");
    formData.append("aftermath_user_note", userNote);
    formData.append("aftermath_mentor_note", mentorNote);

    images.forEach((file) => {
      formData.append("aftermath_images", file);
    });

    const res = await fetch("/api/journals/aftermath", {
      method: "PATCH",
      body: formData,
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

        <div className="max-h-[75vh] space-y-6 overflow-y-auto p-6">
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

          <div>
            <label className="text-sm font-bold text-slate-900">
              Aftermath Images{" "}
              <span className="font-semibold text-slate-400">
                (optional, max 2)
              </span>
            </label>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []).slice(0, 2);
                setImages(files);
              }}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:text-sm file:font-bold file:text-sky-700 hover:file:bg-sky-100 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />

            {images.length ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {images.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  >
                    <span className="truncate font-semibold text-slate-700">
                      {file.name}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setImages((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="shrink-0 rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 hover:text-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end border-t border-slate-100 pt-5">
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

function ClosedEvidenceModal({ journal, onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(e) {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : "");
  }

  async function saveEvidence() {
    if (!file) {
      setError("Please choose an image.");
      return;
    }

    setSaving(true);
    setError("");

    const formData = new FormData();
    formData.append("journalId", journal.id);
    formData.append("closed_evidence_image", file);

    const res = await fetch("/api/journals/closed-evidence", {
      method: "PATCH",
      body: formData,
    });

    const json = await res.json();
    setSaving(false);

    if (!json.ok) {
      setError(json.message || "Failed to upload evidence.");
      return;
    }

    onSaved(journal.id, json.journal);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <div className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-sky-600">
              Closed Evidence
            </div>
            <h3 className="mt-3 text-2xl font-black text-slate-950">
              Upload close proof
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Add one screenshot/image as evidence for this closed trade.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center transition hover:border-sky-300 hover:bg-sky-50/50">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <BookOpen className="h-7 w-7 text-sky-600" />
            </div>

            <p className="mt-4 text-sm font-black text-slate-900">
              Click to choose image
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              PNG, JPG, JPEG or WEBP
            </p>
          </label>

          {preview ? (
            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
              <img
                src={preview}
                alt="Closed evidence preview"
                className="max-h-[360px] w-full object-contain"
              />
            </div>
          ) : null}

          {file ? (
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
              <span className="truncate font-bold text-slate-700">
                {file.name}
              </span>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreview("");
                }}
                className="shrink-0 rounded-full border border-slate-200 p-1.5 text-slate-500 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-600">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={saving || !file}
              onClick={saveEvidence}
              className="h-11 rounded-2xl bg-sky-600 px-5 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Uploading..." : "Save Evidence"}
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
  const [page, setPage] = useState(1);
  const [editingEvidenceJournal, setEditingEvidenceJournal] = useState(null);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  useEffect(() => {
    setItems(journals);
    setSelectedJournal(null);
    setEditingJournal(null);
    setPage(1);
  }, [journals]);

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
                {activeTab === "closed" ? (
                  <th className="px-5 py-4 font-bold">Closed Evidence</th>
                ) : null}
                <th className="sticky right-0 z-30 border-l bg-[#f3f7fb] px-5 py-4 text-center font-bold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedItems.map((journal) => {
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
                    {activeTab === "closed" ? (
                      <td className="px-5 py-4">
                        <div className="flex justify-center">
                          {journal.closedEvidenceImageUrl ? (
                            <button
                              type="button"
                              onClick={() => setSelectedJournal(journal)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
                              title="View closed evidence"
                            >
                              <ImageIcon className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingEvidenceJournal(journal)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600"
                              title="Upload closed evidence"
                            >
                              <Paperclip className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    ) : null}
                    <td className="sticky right-0 z-20 border-l bg-white px-5 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedJournal(journal)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-sky-300 hover:text-sky-600"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingJournal(journal)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-600 shadow-sm hover:bg-sky-100"
                        >
                          <FilePenLine className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {items.length > PAGE_SIZE ? (
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-500">
            Showing{" "}
            <span className="font-bold text-slate-900">
              {(page - 1) * PAGE_SIZE + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-slate-900">
              {Math.min(page * PAGE_SIZE, items.length)}
            </span>{" "}
            of <span className="font-bold text-slate-900">{items.length}</span>{" "}
            journals
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
              Page {page} of {totalPages}
            </div>

            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
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
      {editingEvidenceJournal ? (
        <ClosedEvidenceModal
          journal={editingEvidenceJournal}
          onClose={() => setEditingEvidenceJournal(null)}
          onSaved={handleSaved}
        />
      ) : null}
    </>
  );
}
