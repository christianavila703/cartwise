"use client";

import { useId, useState } from "react";

import { TDailyCount } from "@/shared/types/admin";
import { cn } from "@/shared/utils/styling";


const formatDay = (date: string) =>
  new Date(date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const WIDTH = 720;
const HEIGHT = 220;
const PADDING = { top: 16, right: 8, bottom: 28, left: 56 };

/** Smooth area chart of daily counts with a hover tooltip. */
type TAreaChartProps = {
  data: TDailyCount[];
  label?: string;
  /** formats axis ticks and the tooltip, e.g. cents as currency */
  formatValue?: (value: number) => string;
};

export const AreaChart = ({ data, label = "Visits", formatValue = (value) => String(value) }: TAreaChartProps) => {
  const gradientID = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // four gridline steps of a "nice" size (1, 2, 5 × 10^n), so every tick is a round number
  const max = Math.max(4, ...data.map((item) => item.count));
  const rawStep = max / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = [1, 2, 5, 10].map((factor) => factor * magnitude).find((value) => value >= rawStep) ?? 10 * magnitude;
  const yMax = step * 4;

  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const x = (index: number) => PADDING.left + (data.length > 1 ? (index / (data.length - 1)) * innerWidth : 0);
  const y = (value: number) => PADDING.top + innerHeight - (value / yMax) * innerHeight;

  const points = data.map((item, index) => [x(index), y(item.count)] as const);
  const line = points
    .map(([px, py], index) => {
      if (index === 0) return `M ${px} ${py}`;
      const [prevX, prevY] = points[index - 1];
      const controlX = (prevX + px) / 2;
      return `C ${controlX} ${prevY} ${controlX} ${py} ${px} ${py}`;
    })
    .join(" ");
  const area = `${line} L ${x(data.length - 1)} ${PADDING.top + innerHeight} L ${x(0)} ${PADDING.top + innerHeight} Z`;

  const ticks = [0, 1, 2, 3, 4].map((index) => index * step);
  const labelEvery = Math.ceil(data.length / 6);
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const relativeX = ((event.clientX - rect.left) / rect.width) * WIDTH;
          const index = Math.round(((relativeX - PADDING.left) / innerWidth) * (data.length - 1));
          setHoverIndex(Math.min(data.length - 1, Math.max(0, index)));
        }}
        role="img"
        aria-label={`${label} per day`}
      >
        <defs>
          <linearGradient id={gradientID} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={y(tick)}
              y2={y(tick)}
              className="stroke-slate-100"
              strokeDasharray={tick === 0 ? undefined : "4 4"}
            />
            <text x={PADDING.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-slate-400 text-[11px]">
              {formatValue(tick)}
            </text>
          </g>
        ))}
        {data.map(
          (item, index) =>
            index % labelEvery === 0 && (
              <text key={item.date} x={x(index)} y={HEIGHT - 6} textAnchor="middle" className="fill-slate-400 text-[11px]">
                {formatDay(item.date)}
              </text>
            )
        )}
        <path d={area} fill={`url(#${gradientID})`} />
        <path d={line} fill="none" stroke="var(--color-brand-600)" strokeWidth={2.5} strokeLinecap="round" />
        {hoverIndex !== null && (
          <g>
            <line
              x1={x(hoverIndex)}
              x2={x(hoverIndex)}
              y1={PADDING.top}
              y2={PADDING.top + innerHeight}
              className="stroke-slate-300"
              strokeDasharray="3 3"
            />
            <circle
              cx={x(hoverIndex)}
              cy={y(data[hoverIndex].count)}
              r={5}
              fill="white"
              stroke="var(--color-brand-600)"
              strokeWidth={2.5}
            />
          </g>
        )}
      </svg>
      {hovered && hoverIndex !== null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: `${(x(hoverIndex) / WIDTH) * 100}%` }}
        >
          <span className="font-semibold tabular-nums">{formatValue(hovered.count)}</span>{" "}
          <span className="text-slate-300">
            {label.toLowerCase()} · {formatDay(hovered.date)}
          </span>
        </div>
      )}
    </div>
  );
};

type TBarListItem = { label: string; value: number; tone?: string };

/** Horizontal bars, each scaled against the largest value. */
export const BarList = ({ items, emptyText = "No data yet" }: { items: TBarListItem[]; emptyText?: string }) => {
  const max = Math.max(1, ...items.map((item) => item.value));
  if (items.length === 0) return <p className="py-6 text-center text-sm text-slate-400">{emptyText}</p>;

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">{item.label}</span>
            <span className="font-medium text-slate-900 tabular-nums">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn("h-full rounded-full transition-[width] duration-700", item.tone ?? "bg-brand-500")}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};
