"use client";

import { useEffect, useRef, useState } from "react";

/** Graduations « rondes » de 0 au premier multiple du pas qui couvre `max`. */
export function niceTicks(max: number, count = 4): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0, 1];
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  const step = nice * magnitude;
  const ticks: number[] = [];
  for (let value = 0; value < max + step; value += step) {
    ticks.push(value);
    if (value >= max) break;
  }
  return ticks;
}

const full = new Intl.NumberFormat("fr-FR");
const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });

/** Complet sous 10 000 (0 / 1 000 / 2 000), compact au-delà (10 k / 20 k) : un seul style par axe. */
export function formatAxisValue(value: number, axisMax: number): string {
  return axisMax >= 10_000 ? compact.format(value) : full.format(value);
}

export function formatNumber(value: number): string {
  return full.format(value);
}

const monthShort = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });
const monthLong = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const dayShort = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const dayLong = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

/** Libellé d'un intervalle (`bucket` = YYYY-MM-DD, UTC) : court pour l'axe, long pour l'infobulle. */
export function formatBucket(bucket: string, granularity: "day" | "month", long = false): string {
  const date = new Date(`${bucket}T00:00:00Z`);
  if (granularity === "month") return (long ? monthLong : monthShort).format(date);
  return (long ? dayLong : dayShort).format(date);
}

/** Largeur courante d'un élément (le SVG se redessine à la bonne taille, sans déformer les textes). */
export function useElementWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.clientWidth || fallback);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [fallback]);

  return { ref, width };
}

/** Indices des graduations de l'axe X à afficher : au plus `max`, régulièrement espacées, dernier inclus. */
export function visibleTickIndexes(count: number, max: number): Set<number> {
  if (count <= max) return new Set(Array.from({ length: count }, (_, index) => index));
  const step = Math.ceil((count - 1) / (max - 1));
  const indexes = new Set<number>();
  for (let index = count - 1; index >= 0; index -= step) indexes.add(index);
  return indexes;
}

/** Rectangle dont seul le bord du haut est arrondi (4 px) : la base reste carrée sur la ligne de référence. */
export function roundedTopRect(x: number, y: number, width: number, height: number, radius = 4): string {
  if (height <= 0) return "";
  const r = Math.min(radius, width / 2, height);
  return `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`;
}
