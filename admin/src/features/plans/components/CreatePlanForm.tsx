"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

import { useCreatePlan } from "../hooks/useCreatePlan";
import type { CreatePlanValues } from "../schemas/plan.schema";
import { createPlanSchema } from "../schemas/plan.schema";

import { PlanFeaturesFields } from "./PlanFeaturesFields";
import { PlanQuotasFields } from "./PlanQuotasFields";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, StickyFormBar } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { optionalNumber } from "@/lib/forms";

export function CreatePlanForm() {
  const router = useRouter();
  const createPlan = useCreatePlan();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePlanValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      name: "",
      description: "",
      isPublic: true,
      quotas: {},
      features: { aiTranslation: false, customCertificates: false, customDomain: false },
      commissionRatePercent: undefined,
    },
  });

  async function onSubmit(values: CreatePlanValues) {
    try {
      const result = await createPlan.mutateAsync(values);
      router.push(`/plans?created=${result.id}`);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="name" label="Nom du plan" required error={errors.name?.message} className="sm:col-span-2">
            <Input id="name" placeholder="Starter" aria-invalid={Boolean(errors.name)} {...register("name")} />
          </Field>

          <Field id="description" label="Description" className="sm:col-span-2">
            <Textarea id="description" rows={2} placeholder="Pour les petites structures de formation" {...register("description")} />
          </Field>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 sm:col-span-2">
            <div>
              <Label htmlFor="isPublic">Plan public</Label>
              <p className="text-xs text-muted-foreground">
                Visible et souscriptible directement par les entreprises. Désactivez pour un plan sur mesure, attribué
                manuellement.
              </p>
            </div>
            <Controller
              control={control}
              name="isPublic"
              render={({ field }) => <Switch id="isPublic" checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>

          <Field
            id="commissionRatePercent"
            label="Taux de commission par défaut (%)"
            hint="Laissez vide pour ne définir aucun taux."
            error={errors.commissionRatePercent?.message}
          >
            <Input
              id="commissionRatePercent"
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.01"
              placeholder="Non défini"
              {...register("commissionRatePercent", optionalNumber)}
            />
          </Field>
        </CardContent>
      </Card>

      <PlanQuotasFields register={register} errors={errors} />
      <PlanFeaturesFields register={register} control={control} />

      <StickyFormBar>
        <Button type="button" variant="outline" onClick={() => router.push("/plans")}>
          Annuler
        </Button>
        <Button type="submit" disabled={createPlan.isPending}>
          {createPlan.isPending && <Spinner />}
          Créer le plan
        </Button>
      </StickyFormBar>
    </form>
  );
}
