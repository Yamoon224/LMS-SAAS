import type { FieldErrors, UseFormRegister } from "react-hook-form";

import type { CreatePlanValues } from "../schemas/plan.schema";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { optionalNumber } from "@/lib/forms";

interface PlanQuotasFieldsProps {
  register: UseFormRegister<CreatePlanValues>;
  errors: FieldErrors<CreatePlanValues>;
}

const QUOTA_FIELDS = [
  { name: "maxCourses", label: "Formations max." },
  { name: "maxActiveLearners", label: "Apprenants actifs max." },
  { name: "maxManagers", label: "Gestionnaires max." },
  { name: "storageGb", label: "Stockage (Go)" },
  { name: "liveSessionsPerMonth", label: "Sessions live / mois" },
] as const;

/** Champs de quotas d'un plan (ADM-14). Un champ vide signifie « illimité ». */
export function PlanQuotasFields({ register, errors }: PlanQuotasFieldsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quotas</CardTitle>
        <p className="text-sm text-muted-foreground">Laissez un champ vide pour un quota illimité.</p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {QUOTA_FIELDS.map((quota) => (
          <Field
            key={quota.name}
            id={`quotas.${quota.name}`}
            label={quota.label}
            error={errors.quotas?.[quota.name]?.message}
          >
            <Input
              id={`quotas.${quota.name}`}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Illimité"
              {...register(`quotas.${quota.name}`, optionalNumber)}
            />
          </Field>
        ))}
      </CardContent>
    </Card>
  );
}
