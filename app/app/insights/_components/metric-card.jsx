// app/app/insights/_components/metric-card.jsx

import { METRIC_COLORS } from "./metric-colors";

export default function MetricCard({ label, value, good, bad }) {
  const tone = bad
    ? "text-orange-600"
    : good
      ? "text-cyan-600"
      : "text-slate-950";

  const subTone = bad
    ? "text-orange-600"
    : good
      ? "text-cyan-600"
      : "text-slate-500";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center shadow-sm">
      <div className="text-xs font-bold text-slate-600">{label}</div>

      <div className={`mt-3 text-2xl font-black ${tone}`}>{value}</div>

      {(good || bad) && (
        <div className={`mt-2 text-xs font-bold ${subTone}`}>
          {bad ? "↘ Needs Review" : "↗ Strong"}
        </div>
      )}
    </div>
  );
}
