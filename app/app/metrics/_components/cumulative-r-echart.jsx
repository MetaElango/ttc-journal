// app/app/metrics/_components/cumulative-r-echart.jsx
"use client";

import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
});

const COLORS = {
  blue: "#2563eb",
  cyan: "#06b6d4",
  cyanDark: "#0891b2",
  cyanSoft: "rgba(6,182,212,0.10)",
  cyanBox: "rgba(236,254,255,0.96)",
  orange: "#f97316",
  orangeDark: "#ea580c",
  orangeSoft: "rgba(249,115,22,0.10)",
  orangeBox: "rgba(255,247,237,0.96)",
  grey: "#94a3b8",
  greyLight: "#e2e8f0",
};

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function formatR(value) {
  const n = round2(value);
  return `${n > 0 ? "+" : ""}${n}R`;
}

function buildZones(data = []) {
  const zones = [];
  let start = null;
  let type = null;

  data.forEach((point, index) => {
    const currentType =
      Number(point.cumulativeR) >= Number(point.sma10) ? "good" : "drawdown";

    if (currentType !== type) {
      if (start !== null && index - start >= 2) {
        zones.push(makeZone(data, start, index - 1, type));
      }

      start = index;
      type = currentType;
    }
  });

  if (start !== null && data.length - start >= 2) {
    zones.push(makeZone(data, start, data.length - 1, type));
  }

  return zones;
}

function makeZone(data, startIndex, endIndex, type) {
  const slice = data.slice(startIndex, endIndex + 1);
  const values = slice.map((x) => Number(x.cumulativeR) || 0);

  const startR = Number(slice[0].cumulativeR) || 0;
  const endR = Number(slice[slice.length - 1].cumulativeR) || 0;
  const highR = Math.max(...values);
  const lowR = Math.min(...values);

  return {
    type,
    startIndex,
    endIndex,
    midIndex: Math.floor((startIndex + endIndex) / 2),
    trades: slice.length,
    r: type === "good" ? round2(highR - startR) : round2(lowR - startR),
    highR,
    lowR,
    endR,
  };
}

export default function CumulativeREChart({ data = [] }) {
  const zones = buildZones(data);

  const categories = data.map((x) => x.date);
  const cumulativeR = data.map((x) => round2(x.cumulativeR));
  const excellionLine = data.map((x) => round2(x.sma10));

  const markAreas = zones.map((z) => [
    {
      xAxis: categories[z.startIndex],
      itemStyle: {
        color: z.type === "good" ? COLORS.cyanSoft : COLORS.orangeSoft,
      },
    },
    {
      xAxis: categories[z.endIndex],
    },
  ]);

  const zoneLabels = zones.map((z) => ({
    coord: [
      categories[z.midIndex],
      z.type === "good" ? z.highR + 3.5 : z.lowR - 3.5,
    ],
    value:
      z.type === "good"
        ? `${z.trades} Trades\n${formatR(z.r)}`
        : `Drawdown\n${formatR(z.r)}\n${z.trades} Trades`,
    symbol: "rect",
    symbolSize: [105, 76],
    itemStyle: {
      color: z.type === "good" ? COLORS.cyanBox : COLORS.orangeBox,
      borderColor: z.type === "good" ? COLORS.cyan : COLORS.orange,
      borderWidth: 1,
      borderType: "dashed",
    },
    label: {
      show: true,
      formatter: "{c}",
      color: z.type === "good" ? COLORS.cyanDark : COLORS.orangeDark,
      fontWeight: 800,
      fontSize: 13,
      lineHeight: 22,
    },
  }));

  const crossDots = zones.map((z) => ({
    coord: [categories[z.endIndex], z.endR],
    symbol: "circle",
    symbolSize: 8,
    itemStyle: {
      color: z.type === "good" ? COLORS.cyan : COLORS.orange,
      borderColor: "#ffffff",
      borderWidth: 2,
    },
  }));

  const option = {
    backgroundColor: "transparent",
    animation: true,
    grid: {
      left: 48,
      right: 28,
      top: 74,
      bottom: 50,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255,255,255,0.96)",
      borderColor: COLORS.greyLight,
      borderWidth: 1,
      textStyle: { color: "#0f172a" },
      formatter(params) {
        const index = params?.[0]?.dataIndex;
        const point = data[index];
        if (!point) return "";

        const zone = zones.find(
          (z) => index >= z.startIndex && index <= z.endIndex,
        );

        return `
          <div style="font-weight:800;margin-bottom:6px">${point.date}</div>
          <div>Cumulative R: <b>${formatR(point.cumulativeR)}</b></div>
          <div>Excellion line: <b>${formatR(point.sma10)}</b></div>
          ${
            zone
              ? `<div style="margin-top:8px;padding:8px;border-radius:10px;background:${
                  zone.type === "good" ? "#ecfeff" : "#fff7ed"
                };color:${zone.type === "good" ? COLORS.cyanDark : COLORS.orangeDark}">
                  <b>${zone.type === "good" ? "High Zone" : "Drawdown Zone"}</b><br/>
                  ${zone.trades} trades · ${formatR(zone.r)}
                </div>`
              : ""
          }
        `;
      },
    },
    xAxis: {
      type: "category",
      data: categories,
      boundaryGap: false,
      axisLine: { lineStyle: { color: COLORS.greyLight } },
      axisTick: { show: false },
      axisLabel: { color: "#334155", fontSize: 12 },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "#334155",
        fontSize: 12,
        formatter: (v) => `${v > 0 ? "+" : ""}${v}R`,
      },
      splitLine: { lineStyle: { color: COLORS.greyLight } },
    },
    series: [
      {
        name: "Cumulative R",
        type: "line",
        data: cumulativeR,
        smooth: true,
        symbol: "none",
        lineStyle: {
          color: COLORS.blue,
          width: 4,
        },
        areaStyle: {
          color: "rgba(37,99,235,0.08)",
        },
        markArea: {
          silent: false,
          data: markAreas,
        },
        markPoint: {
          symbolKeepAspect: false,
          data: [...zoneLabels, ...crossDots],
        },
      },
      {
        name: "Excellion line",
        type: "line",
        data: excellionLine,
        smooth: true,
        symbol: "none",
        lineStyle: {
          color: COLORS.cyan,
          width: 3,
          type: "dashed",
        },
      },
      {
        name: "Zero Line",
        type: "line",
        data: data.map(() => 0),
        symbol: "none",
        lineStyle: {
          color: COLORS.grey,
          width: 2,
          type: "dashed",
        },
      },
    ],
  };

  return (
    <div className="h-[430px] w-full">
      <ReactECharts
        option={option}
        notMerge
        lazyUpdate
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
