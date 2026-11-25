"use client";

import { useState } from "react";

import { formatNumber } from "./chart-utils";

export interface DonutSlice {
  label: string;
  value: number;
  /** Couleur fixée par l'entité (jamais par son rang). */
  color: string;
}

const SIZE = 168;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Écart de 2 px entre deux segments (couleur de la surface), sauf s'il n'y en a qu'un. */
const GAP = 2;

/** Anneau + légende chiffrée : survol d'un segment ou d'une ligne de légende pour le mettre en avant. */
export function DonutChart({ slices, totalLabel, ariaLabel }: { slices: DonutSlice[]; totalLabel: string; ariaLabel: string }) {
  const [active, setActive] = useState<string | null>(null);
  const visible = slices.filter((slice) => slice.value > 0);
  const total = visible.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Aucune donnée pour le moment.</p>;
  }

  let offset = 0;
  const arcs = visible.map((slice) => {
    const length = (slice.value / total) * CIRCUMFERENCE;
    const arc = { slice, dash: Math.max(length - (visible.length > 1 ? GAP : 0), 0.5), offset };
    offset += length;
    return arc;
  });
  const focused = active ? visible.find((slice) => slice.label === active) : null;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} role="img" aria-label={ariaLabel} onPointerLeave={() => setActive(null)}>
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {arcs.map(({ slice, dash, offset: start }) => (
              <circle
                key={slice.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth={active === slice.label ? STROKE + 4 : STROKE}
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={-start}
                opacity={active && active !== slice.label ? 0.45 : 1}
                style={{ transition: "opacity 120ms, stroke-width 120ms" }}
                onPointerEnter={() => setActive(slice.label)}
              />
            ))}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display text-2xl font-semibold tabular-nums">{formatNumber(focused?.value ?? total)}</span>
          <span className="max-w-[6rem] text-xs text-muted-foreground">{focused?.label ?? totalLabel}</span>
        </div>
      </div>

      <ul className="flex w-full max-w-xs flex-col gap-1.5 text-sm">
        {visible.map((slice) => (
          <li
            key={slice.label}
            onPointerEnter={() => setActive(slice.label)}
            onPointerLeave={() => setActive(null)}
            className="flex items-center justify-between gap-3 rounded-md px-2 py-1 transition-colors hover:bg-accent"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
              {slice.label}
            </span>
            <span className="tabular-nums text-muted-foreground">
              <span className="font-medium text-foreground">{formatNumber(slice.value)}</span> · {Math.round((slice.value / total) * 100)} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
