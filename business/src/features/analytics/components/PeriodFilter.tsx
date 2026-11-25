"use client";

import { CalendarRange, RotateCcw } from "lucide-react";

import type { PeriodFilterState } from "../hooks/usePeriodFilter";
import { PERIOD_LABELS, PERIOD_PRESETS, toDateInput } from "../schemas/analytics.schema";
import type { FixedPeriodPreset } from "../schemas/analytics.schema";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PeriodFilterProps {
  state: PeriodFilterState;
  invalid: boolean;
  /** Vrai quand la période affichée est celle par défaut (le bouton « Réinitialiser » est alors masqué). */
  isDefault: boolean;
  onPresetChange: (preset: FixedPeriodPreset) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onReset: () => void;
}

/** Filtre de période : raccourcis (aujourd'hui, 7/30/90 jours, mois, année…) + dates « Du / Au » modifiables. */
export function PeriodFilter({
  state,
  invalid,
  isDefault,
  onPresetChange,
  onFromChange,
  onToChange,
  onReset,
}: PeriodFilterProps) {
  const today = toDateInput(new Date());
  const isCustom = state.preset === "custom";

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarRange className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        Période analysée
      </div>

      <div role="group" aria-label="Périodes prédéfinies" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {PERIOD_PRESETS.map((preset) => (
          <Button
            key={preset}
            type="button"
            size="sm"
            variant={state.preset === preset ? "default" : "outline"}
            aria-pressed={state.preset === preset}
            className="shrink-0"
            onClick={() => onPresetChange(preset)}
          >
            {PERIOD_LABELS[preset]}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={isCustom ? "default" : "outline"}
          aria-pressed={isCustom}
          className="shrink-0"
          onClick={() => document.getElementById("period-from")?.focus()}
        >
          {PERIOD_LABELS.custom}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grid grid-cols-2 gap-3 sm:w-auto">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="period-from">Du</Label>
            <Input
              id="period-from"
              type="date"
              value={state.from}
              max={state.to || today}
              aria-invalid={invalid}
              aria-describedby={invalid ? "period-error" : undefined}
              onChange={(event) => onFromChange(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="period-to">Au</Label>
            <Input
              id="period-to"
              type="date"
              value={state.to}
              min={state.from || undefined}
              max={today}
              aria-invalid={invalid}
              aria-describedby={invalid ? "period-error" : undefined}
              onChange={(event) => onToChange(event.target.value)}
            />
          </div>
        </div>

        {!isDefault && (
          <Button type="button" variant="ghost" onClick={onReset} className="sm:self-end">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Réinitialiser
          </Button>
        )}
      </div>

      {invalid && (
        <p id="period-error" role="alert" className="text-xs text-danger">
          Choisissez une date de début et une date de fin, la première ne pouvant pas dépasser la seconde.
        </p>
      )}
    </Card>
  );
}
