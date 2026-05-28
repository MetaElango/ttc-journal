// app/app/playbooks/strategies-client.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  CheckCircle2,
  Edit3,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  Target,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
function ImagePopup({ images, index, onClose, onPrev, onNext }) {
  if (!images?.length) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {images.length > 1 ? (
        <button
          type="button"
          onClick={onPrev}
          className="absolute left-5 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
      ) : null}

      <img
        src={images[index]}
        alt={`Evidence ${index + 1}`}
        className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain"
      />

      {images.length > 1 ? (
        <button
          type="button"
          onClick={onNext}
          className="absolute right-5 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      ) : null}

      <div className="absolute bottom-5 rounded-full bg-white/10 px-4 py-2 text-sm text-white">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}

function getPreparationStyles(status) {
  switch (status) {
    case "Active":
      return {
        card: "border-emerald-300 bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-500",
      };
    case "Draft":
      return {
        card: "border-amber-300 bg-amber-50 text-amber-700",
        dot: "bg-amber-500",
      };
    case "Preparing":
      return {
        card: "border-sky-300 bg-sky-50 text-sky-700",
        dot: "bg-sky-500",
      };
    default:
      return {
        card: "border-slate-200 bg-white text-slate-600",
        dot: "bg-slate-400",
      };
  }
}

function getStrategyStatusStyle(status) {
  switch (status) {
    case "LIVE":
      return "bg-emerald-500";
    case "ALTERNATING":
      return "bg-amber-500";
    case "NOT USING":
      return "bg-slate-400";
    default:
      return "bg-slate-400";
  }
}

function StatCard({ icon: Icon, label, value, status }) {
  const styles = getPreparationStyles(status);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`rounded-2xl p-3 ${styles.card}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <div className="text-3xl font-semibold text-slate-950">{value}</div>
          <div className="text-sm text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

function CriteriaTextArea({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-sky-600">
        {title}
      </h4>

      <textarea
        value={value || "—"}
        readOnly
        rows={7}
        className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600 outline-none"
      />
    </div>
  );
}
function getStrategyTypeClass(type) {
  if (type === "Aggressive") {
    return "border-orange-300 bg-orange-50 text-orange-700";
  }

  return "border-sky-300 bg-sky-50 text-sky-700";
}
function MarketEvidence({ images = [], onOpen }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-sky-600">
        Market Evidence
      </h4>

      {images.length ? (
        <div className="grid grid-cols-3 gap-3">
          {images.slice(0, 2).map((url, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onOpen(index)}
              className="h-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
            >
              <img
                src={url}
                alt={`Evidence ${index + 1}`}
                className="h-full w-full object-cover transition hover:scale-105"
              />
            </button>
          ))}

          {images.length > 2 ? (
            <button
              type="button"
              onClick={() => onOpen(2)}
              className="flex h-28 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-2xl font-semibold text-slate-700"
            >
              +{images.length - 2}
            </button>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-400">No evidence uploaded.</p>
      )}
    </div>
  );
}

function ConfluenceCard({ items = [] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-sky-600">
        Confluence
      </h4>

      <div className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              key={item}
              className="flex gap-3 text-sm leading-6 text-slate-600"
            >
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-orange-500" />
              <span>{item}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">—</p>
        )}
      </div>
    </div>
  );
}

function StrategyCard({ s, mounted }) {
  const [popup, setPopup] = useState(null);
  const images = s.strategyImageUrls || [];

  function openImage(index) {
    setPopup({ index });
  }

  function closeImage() {
    setPopup(null);
  }

  function prevImage() {
    setPopup((current) => ({
      index: current.index === 0 ? images.length - 1 : current.index - 1,
    }));
  }

  function nextImage() {
    setPopup((current) => ({
      index: current.index === images.length - 1 ? 0 : current.index + 1,
    }));
  }

  return (
    <>
      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div className="flex gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              <Target className="h-8 w-8" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                  {s.strategy_name}
                </h2>

                <span className="rounded-full border border-sky-300 bg-sky-50 px-4 py-1.5 text-sm font-semibold text-sky-700">
                  {s.trading_style}
                </span>

                <span
                  title={s.strategy_status || "No status"}
                  className={`h-3 w-3 rounded-full ${getStrategyStatusStyle(
                    s.strategy_status,
                  )}`}
                />
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Preparation: {s.preparation_status || "—"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Created {mounted ? formatDate(s.created_at) : "—"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600">
              {s.setup_type}
            </span>

            <span
              className={`rounded-xl border px-4 py-2 text-sm font-semibold ${getStrategyTypeClass(
                s.strategy_type,
              )}`}
            >
              {s.strategy_type}
            </span>
          </div>
        </div>

        <div className="grid gap-5 p-6 lg:grid-cols-3">
          <ConfluenceCard items={s.bias_confluence || []} />

          <CriteriaTextArea title="Checklist" value={s.checklist} />
          <CriteriaTextArea title="Entry Criteria" value={s.entry_rules} />
          <CriteriaTextArea title="Exit Criteria" value={s.exit_rules} />
          <CriteriaTextArea
            title="SL Management Criteria"
            value={s.sl_management_rules}
          />

          <MarketEvidence images={images} onOpen={openImage} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-6 py-5">
          <p className="text-sm text-slate-500">
            Last updated:{" "}
            {mounted ? formatDate(s.updated_at || s.created_at) : "—"}
          </p>

          <Link
            href={`/app/playbooks/${s.id}/edit`}
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-sky-300 bg-white px-5 text-sm font-semibold text-sky-700 hover:bg-sky-50"
          >
            <Edit3 className="h-4 w-4" />
            Edit Playbook
          </Link>
        </div>
      </article>

      {popup ? (
        <ImagePopup
          images={images}
          index={popup.index}
          onClose={closeImage}
          onPrev={prevImage}
          onNext={nextImage}
        />
      ) : null}
    </>
  );
}

export default function StrategiesClient({ strategies }) {
  const [query, setQuery] = useState("");
  const [prepFilter, setPrepFilter] = useState("ALL");
  const [styleFilter, setStyleFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = useMemo(() => {
    return {
      total: strategies.length,
      preparing: strategies.filter((s) => s.preparation_status === "Preparing")
        .length,
      draft: strategies.filter((s) => s.preparation_status === "Draft").length,
      active: strategies.filter((s) => s.preparation_status === "Active")
        .length,
    };
  }, [strategies]);

  const tradingStyles = useMemo(() => {
    return Array.from(
      new Set(strategies.map((s) => s.trading_style).filter(Boolean)),
    );
  }, [strategies]);

  const strategyTypes = useMemo(() => {
    return Array.from(
      new Set(strategies.map((s) => s.strategy_type).filter(Boolean)),
    );
  }, [strategies]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return strategies.filter((s) => {
      const text = [
        s.strategy_name,
        s.trading_style,
        s.strategy_type,
        s.setup_type,
        s.preparation_status,
        s.strategy_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!q || text.includes(q)) &&
        (prepFilter === "ALL" || s.preparation_status === prepFilter) &&
        (styleFilter === "ALL" || s.trading_style === styleFilter) &&
        (typeFilter === "ALL" || s.strategy_type === typeFilter)
      );
    });
  }, [strategies, query, prepFilter, styleFilter, typeFilter]);

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6">
        <img
          src="/playbook-bg.png"
          alt=""
          className="absolute right-0 top-0 h-full w-[60%] object-cover opacity-80"
        />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white/80 px-4 py-2 text-sm font-semibold text-sky-600">
            <BookOpen className="h-4 w-4" />
            PLAYBOOKS
          </div>

          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-950">
                Execution <span className="text-sky-500">Framework</span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm text-slate-500">
                Build structured execution systems for repeatable market
                behavior.
              </p>
            </div>

            <Link
              href="/app/playbooks/new"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-sky-300 bg-white px-4 text-sm font-semibold text-sky-700 hover:bg-sky-50"
            >
              <Plus className="h-5 w-5" />
              New Playbook
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Total Playbooks"
          value={stats.total}
          status="Preparing"
        />
        <StatCard
          icon={Activity}
          label="Preparing"
          value={stats.preparing}
          status="Preparing"
        />
        <StatCard
          icon={Edit3}
          label="Draft"
          value={stats.draft}
          status="Draft"
        />
        <StatCard
          icon={Eye}
          label="Active"
          value={stats.active}
          status="Active"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search playbook, setup, framework..."
            className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none focus:border-sky-400"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {["ALL", "Preparing", "Draft", "Active"].map((x) => {
            const styles = getPreparationStyles(x);

            return (
              <button
                key={x}
                type="button"
                onClick={() => setPrepFilter(x)}
                className={`h-14 rounded-2xl border px-5 text-sm font-semibold ${
                  prepFilter === x
                    ? styles.card
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {x.toUpperCase()}
              </button>
            );
          })}

          <select
            value={styleFilter}
            onChange={(e) => setStyleFilter(e.target.value)}
            className="h-14 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 outline-none"
          >
            <option value="ALL">TRADING STYLE</option>
            {tradingStyles.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-14 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 outline-none"
          >
            <option value="ALL">EXECUTION APPROACH</option>
            {strategyTypes.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No playbooks match your search/filter.
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map((s) => (
            <StrategyCard key={s.id} s={s} mounted={mounted} />
          ))}
        </div>
      )}
    </div>
  );
}
