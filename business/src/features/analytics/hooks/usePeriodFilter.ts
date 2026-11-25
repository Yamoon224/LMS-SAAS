"use client";

import { useState } from "react";

import { detectPreset, rangeForPreset } from "../schemas/analytics.schema";
import type { FixedPeriodPreset, PeriodPreset, PeriodRange } from "../schemas/analytics.schema";

export interface PeriodFilterState {
  preset: PeriodPreset;
  /** Dates saisies (YYYY-MM-DD), éventuellement incomplètes pendant la saisie. */
  from: string;
  to: string;
}

function initialState(preset: FixedPeriodPreset): PeriodFilterState {
  const range = rangeForPreset(preset);
  return { preset, from: range.from ?? "", to: range.to ?? "" };
}

function isValidRange(from: string, to: string): boolean {
  return from !== "" && to !== "" && from <= to;
}

/**
 * État du filtre de période. `applied` ne change que lorsque les dates saisies forment une
 * période valide : on n'interroge jamais l'API avec une date vide ou un début après la fin.
 */
export function usePeriodFilter(initialPreset: FixedPeriodPreset = "month") {
  const [state, setState] = useState<PeriodFilterState>(() => initialState(initialPreset));
  const [applied, setApplied] = useState<PeriodRange>(() => {
    const range = rangeForPreset(initialPreset);
    return { from: range.from, to: range.to };
  });

  function update(next: PeriodFilterState) {
    setState(next);
    if (isValidRange(next.from, next.to)) setApplied({ from: next.from, to: next.to });
  }

  function selectPreset(preset: FixedPeriodPreset) {
    update(initialState(preset));
  }

  function setFrom(from: string) {
    update({ preset: detectPreset(from, state.to), from, to: state.to });
  }

  function setTo(to: string) {
    update({ preset: detectPreset(state.from, to), from: state.from, to });
  }

  return {
    state,
    applied,
    invalid: !isValidRange(state.from, state.to),
    selectPreset,
    setFrom,
    setTo,
    reset: () => selectPreset(initialPreset),
  };
}
