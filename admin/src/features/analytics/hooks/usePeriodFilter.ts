"use client";

import { useState } from "react";

import { rangeForPreset } from "../schemas/analytics.schema";
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

  /** Passe en mode « personnalisée » en gardant les dates affichées : c'est ce qui fait apparaître les champs Du / Au. */
  function selectCustom() {
    setState((current) => ({ ...current, preset: "custom" }));
  }

  // On reste en « personnalisée » pendant la saisie, même si les dates coïncident avec un raccourci : les champs ne disparaissent pas sous les doigts.
  function setFrom(from: string) {
    update({ preset: "custom", from, to: state.to });
  }

  function setTo(to: string) {
    update({ preset: "custom", from: state.from, to });
  }

  return {
    state,
    applied,
    invalid: !isValidRange(state.from, state.to),
    selectPreset,
    selectCustom,
    setFrom,
    setTo,
    reset: () => selectPreset(initialPreset),
  };
}
