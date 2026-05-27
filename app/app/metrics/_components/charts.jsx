// app/app/metrics/_components/charts.jsx

"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { METRIC_COLORS as C } from "./metric-colors";

function roundChart(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function formatChartR(value) {
  const n = roundChart(value);
  return `${n > 0 ? "+" : ""}${n}R`;
}

function TooltipBox({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <div className="font-bold text-slate-950">{label}</div>

      {payload.map((p) => (
        <div key={p.dataKey} className="mt-1 text-slate-600">
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function RDistributionChart({ data }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-blue-50/40 p-4">
      <h4 className="text-sm font-black text-slate-900">
        R Distribution Matrix
      </h4>

      <div className="mt-4 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid vertical={false} stroke={C.slate200} />

            <XAxis
              dataKey="bucket"
              tick={{ fontSize: 11, fill: C.slate600 }}
              stroke={C.slate400}
            />

            <YAxis
              tick={{ fontSize: 11, fill: C.slate600 }}
              stroke={C.slate400}
            />

            <Tooltip content={<TooltipBox />} />

            <Bar dataKey="count" radius={[10, 10, 0, 0]}>
              {data.map((x) => (
                <Cell
                  key={x.bucket}
                  fill={
                    x.tone === "bad"
                      ? C.orange
                      : x.tone === "mid"
                        ? C.slate300
                        : C.blue
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DrawdownChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.slate200} />

        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: C.slate600 }}
          stroke={C.slate400}
        />

        <YAxis tick={{ fontSize: 11, fill: C.slate600 }} stroke={C.slate400} />

        <Tooltip content={<TooltipBox />} />

        <Area
          type="monotone"
          dataKey="drawdown"
          name="Drawdown"
          stroke={C.orange}
          fill={C.orangeSoft}
          strokeWidth={2}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function QualityChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.slate200} />

        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: C.slate600 }}
          stroke={C.slate400}
        />

        <YAxis tick={{ fontSize: 11, fill: C.slate600 }} stroke={C.slate400} />

        <Tooltip content={<TooltipBox />} />

        <Line
          type="monotone"
          dataKey="score"
          name="Quality Score"
          stroke={C.blue}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function EfficiencyDonut({ value }) {
  const score = Number(value) || 0;
  const pct = Math.min(100, Math.max(0, score * 35));

  return (
    <ResponsiveContainer width="100%" height={150}>
      <PieChart>
        <Pie
          data={[
            { name: "Score", value: pct },
            { name: "Rest", value: 100 - pct },
          ]}
          innerRadius={45}
          outerRadius={62}
          dataKey="value"
          startAngle={220}
          endAngle={-40}
        >
          <Cell fill={C.cyan} />
          <Cell fill={C.slate200} />
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
