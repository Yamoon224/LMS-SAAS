"use client";

import { useState } from "react";

import { formatAxisValue, formatBucket, niceTicks, roundedTopRect, useElementWidth, visibleTickIndexes } from "./chart-utils";

const MARGIN = { top: 12, right: 12, bottom: 28, left: 44 };
const HEIGHT = 240;

type Granularity = "day" | "month";

export interface TimeSeries {
  label: string;
  /** Couleur de la série (variable CSS `--series-n`). */
  color: string;
}

interface BaseProps {
  buckets: string[];
  granularity: Granularity;
  series: TimeSeries[];
  /** `values[serie][index]` : une valeur par intervalle et par série. */
  values: number[][];
  formatValue?: (value: number) => string;
  ariaLabel: string;
}

/** Axes, grille et infobulle communs aux graphiques temporels. */
function useGeometry(count: number, values: number[][]) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const max = Math.max(0, ...values.flat());
  const ticks = niceTicks(max);
  const axisMax = ticks[ticks.length - 1] ?? 1;
  const y = (value: number) => MARGIN.top + plotHeight - (value / axisMax) * plotHeight;
  return { ref, width, plotWidth, plotHeight, ticks, axisMax, y, count };
}

function Axes({
  geometry,
  buckets,
  granularity,
  xAt,
}: {
  geometry: ReturnType<typeof useGeometry>;
  buckets: string[];
  granularity: Granularity;
  xAt: (index: number) => number;
}) {
  const labelled = visibleTickIndexes(buckets.length, Math.max(2, Math.floor(geometry.plotWidth / 70)));
  return (
    <g className="text-muted-foreground" fontSize="11">
      {geometry.ticks.map((tick) => (
        <g key={tick}>
          <line x1={MARGIN.left} x2={MARGIN.left + geometry.plotWidth} y1={geometry.y(tick)} y2={geometry.y(tick)} stroke="rgb(var(--border))" strokeWidth="1" />
          <text x={MARGIN.left - 8} y={geometry.y(tick)} textAnchor="end" dominantBaseline="middle" fill="currentColor">
            {formatAxisValue(tick, geometry.axisMax)}
          </text>
        </g>
      ))}
      {buckets.map((bucket, index) =>
        labelled.has(index) ? (
          <text key={bucket} x={xAt(index)} y={HEIGHT - 8} textAnchor="middle" fill="currentColor">
            {formatBucket(bucket, granularity)}
          </text>
        ) : null,
      )}
    </g>
  );
}

function Tooltip({
  left,
  title,
  rows,
  containerWidth,
}: {
  left: number;
  title: string;
  rows: { label: string; value: string; color: string }[];
  containerWidth: number;
}) {
  const flip = left > containerWidth * 0.6;
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-2 z-10 min-w-[8rem] rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-pop"
      style={flip ? { right: containerWidth - left + 12 } : { left: left + 12 }}
    >
      <p className="mb-1 font-medium">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center justify-between gap-4 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
            {row.label}
          </span>
          <span className="font-medium tabular-nums text-foreground">{row.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Courbe + aire (une série) : ligne de 2 px, aire à 10 %, repère vertical et infobulle au survol. */
export function TimeAreaChart({ buckets, granularity, series, values, formatValue = String, ariaLabel }: BaseProps) {
  const geometry = useGeometry(buckets.length, values);
  const [hover, setHover] = useState<number | null>(null);
  const serie = series[0];
  const data = values[0] ?? [];
  if (!serie) return null;

  const count = buckets.length;
  const xAt = (index: number) =>
    count === 1 ? MARGIN.left + geometry.plotWidth / 2 : MARGIN.left + (index / (count - 1)) * geometry.plotWidth;
  const baseline = geometry.y(0);
  const line = data.map((value, index) => `${index === 0 ? "M" : "L"}${xAt(index)},${geometry.y(value)}`).join(" ");
  const area = `${line} L${xAt(count - 1)},${baseline} L${xAt(0)},${baseline} Z`;
  const last = count - 1;

  function onMove(event: React.PointerEvent<SVGRectElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / box.width;
    setHover(Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1)))));
  }

  return (
    <div ref={geometry.ref} className="relative" onPointerLeave={() => setHover(null)}>
      <svg width={geometry.width} height={HEIGHT} role="img" aria-label={ariaLabel}>
        <Axes geometry={geometry} buckets={buckets} granularity={granularity} xAt={xAt} />
        <path d={area} fill={serie.color} fillOpacity="0.1" />
        <path d={line} fill="none" stroke={serie.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <line x1={xAt(hover)} x2={xAt(hover)} y1={MARGIN.top} y2={baseline} stroke="rgb(var(--muted-foreground))" strokeWidth="1" />
        )}
        <circle cx={xAt(last)} cy={geometry.y(data[last] ?? 0)} r="4" fill={serie.color} stroke="rgb(var(--surface))" strokeWidth="2" />
        {hover !== null && hover !== last && (
          <circle cx={xAt(hover)} cy={geometry.y(data[hover] ?? 0)} r="4" fill={serie.color} stroke="rgb(var(--surface))" strokeWidth="2" />
        )}
        <rect x={MARGIN.left} y={MARGIN.top} width={geometry.plotWidth} height={geometry.plotHeight} fill="transparent" onPointerMove={onMove} />
      </svg>
      {hover !== null && (
        <Tooltip
          left={xAt(hover)}
          containerWidth={geometry.width}
          title={formatBucket(buckets[hover] ?? "", granularity, true)}
          rows={[{ label: serie.label, value: formatValue(data[hover] ?? 0), color: serie.color }]}
        />
      )}
    </div>
  );
}

/** Colonnes (1 ou 2 séries groupées) : ≤ 24 px, bord supérieur arrondi, 2 px d'écart, infobulle par intervalle. */
export function TimeBarChart({ buckets, granularity, series, values, formatValue = String, ariaLabel }: BaseProps) {
  const geometry = useGeometry(buckets.length, values);
  const [hover, setHover] = useState<number | null>(null);

  const count = buckets.length;
  const band = geometry.plotWidth / Math.max(count, 1);
  const gap = 2;
  const barWidth = Math.max(2, Math.min(24, (band * 0.7 - gap * (series.length - 1)) / series.length));
  const groupWidth = barWidth * series.length + gap * (series.length - 1);
  const xAt = (index: number) => MARGIN.left + band * index + band / 2;
  const baseline = geometry.y(0);

  return (
    <div ref={geometry.ref} className="relative" onPointerLeave={() => setHover(null)}>
      <svg width={geometry.width} height={HEIGHT} role="img" aria-label={ariaLabel}>
        <Axes geometry={geometry} buckets={buckets} granularity={granularity} xAt={xAt} />
        {buckets.map((bucket, index) => (
          <g key={bucket}>
            {hover === index && (
              <rect x={MARGIN.left + band * index} y={MARGIN.top} width={band} height={geometry.plotHeight} fill="rgb(var(--accent))" opacity="0.6" />
            )}
            {series.map((serie, serieIndex) => {
              const value = values[serieIndex]?.[index] ?? 0;
              const top = geometry.y(value);
              return (
                <path
                  key={serie.label}
                  d={roundedTopRect(xAt(index) - groupWidth / 2 + serieIndex * (barWidth + gap), top, barWidth, baseline - top)}
                  fill={serie.color}
                />
              );
            })}
            <rect
              x={MARGIN.left + band * index}
              y={MARGIN.top}
              width={band}
              height={geometry.plotHeight}
              fill="transparent"
              onPointerEnter={() => setHover(index)}
              onPointerMove={() => setHover(index)}
            />
          </g>
        ))}
      </svg>
      {hover !== null && (
        <Tooltip
          left={xAt(hover)}
          containerWidth={geometry.width}
          title={formatBucket(buckets[hover] ?? "", granularity, true)}
          rows={series.map((serie, serieIndex) => ({
            label: serie.label,
            value: formatValue(values[serieIndex]?.[hover] ?? 0),
            color: serie.color,
          }))}
        />
      )}
    </div>
  );
}
