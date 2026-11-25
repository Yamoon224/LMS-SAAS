"use client";

import type { Control, FieldValues, Path, UseFormRegister } from "react-hook-form";
import { Controller } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/** Champ vide => undefined (champ optionnel effacé), sinon Number. */
function toOptionalNumber(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  return Number(value);
}

const NUMBER_PLACEHOLDERS: Record<string, string> = {
  passingScorePercent: "Ex. : 70",
  timeLimitMinutes: "Ex. : 60",
  maxAttempts: "Ex. : 3",
  delayBetweenAttemptsMinutes: "Ex. : 30",
  questionsPerModule: "Ex. : 5",
  questionsToDraw: "Ex. : 10",
};

interface NumberFieldProps<T extends FieldValues> {
  register: UseFormRegister<T>;
  name: Path<T>;
  label: string;
  hint?: string;
  error?: string;
  min?: number;
  max?: number;
}

/** Champ numérique d'un formulaire de règles : vide = non défini (valeur effaçable côté backend via null). */
export function NumberField<T extends FieldValues>({
  register,
  name,
  label,
  hint,
  error,
  min,
  max,
}: NumberFieldProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        type="number"
        placeholder={NUMBER_PLACEHOLDERS[name] ?? "Ex. : 1"}
        min={min}
        max={max}
        {...register(name, { setValueAs: toOptionalNumber })}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

interface SwitchFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  hint?: string;
}

export function SwitchField<T extends FieldValues>({ control, name, label, hint }: SwitchFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor={name}>{label}</Label>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
          <Switch id={name} checked={Boolean(field.value)} onCheckedChange={field.onChange} />
        </div>
      )}
    />
  );
}
