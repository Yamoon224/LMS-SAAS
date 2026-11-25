import type { Control, UseFormRegister } from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";

import type { CreatePlanValues } from "../schemas/plan.schema";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { optionalNumber } from "@/lib/forms";

interface PlanFeaturesFieldsProps {
  register: UseFormRegister<CreatePlanValues>;
  control: Control<CreatePlanValues>;
}

const TOGGLES = [
  { name: "features.aiTranslation", label: "Traduction IA" },
  { name: "features.customCertificates", label: "Certificats personnalisés" },
  { name: "features.customDomain", label: "Domaine personnalisé" },
] as const;

/** Champs de fonctionnalités (feature flags) d'un plan (ADM-14). */
export function PlanFeaturesFields({ register, control }: PlanFeaturesFieldsProps) {
  const aiTranslation = useWatch({ control, name: "features.aiTranslation" });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fonctionnalités incluses</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {TOGGLES.map((toggle) => (
          <div key={toggle.name} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <Label htmlFor={toggle.name}>{toggle.label}</Label>
            <Controller
              control={control}
              name={toggle.name}
              render={({ field }) => (
                <Switch id={toggle.name} checked={field.value ?? false} onCheckedChange={field.onChange} />
              )}
            />
          </div>
        ))}

        {aiTranslation && (
          <Field id="features.aiTranslationCreditsIncluded" label="Crédits IA inclus" className="sm:max-w-xs">
            <Input
              id="features.aiTranslationCreditsIncluded"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="0"
              {...register("features.aiTranslationCreditsIncluded", optionalNumber)}
            />
          </Field>
        )}
      </CardContent>
    </Card>
  );
}
