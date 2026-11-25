"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { useUpdatePlan } from "../hooks/useUpdatePlan";
import { createPlanSchema } from "../schemas/plan.schema";
import type { CreatePlanValues, Plan } from "../schemas/plan.schema";

import { PlanFeaturesFields } from "./PlanFeaturesFields";
import { PlanQuotasFields } from "./PlanQuotasFields";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

interface EditPlanDialogProps {
  /** Plan ciblé ; `null` = fermé. */
  plan: Plan | null;
  onOpenChange: (open: boolean) => void;
}

function toFormValues(plan: Plan): CreatePlanValues {
  return {
    name: plan.name,
    description: plan.description ?? "",
    isPublic: plan.isPublic,
    quotas: { ...plan.quotas },
    features: { ...plan.features },
    commissionRatePercent: plan.commissionRatePercent ?? undefined,
  };
}

/**
 * ADM-13 : modifier nom, description, quotas et fonctionnalités d'un plan existant. Le prix n'est pas éditable ici
 * (versionné : « Nouveau prix »). Un quota vidé devient illimité ; les limites s'appliquent aussitôt aux abonnés.
 */
export function EditPlanDialog({ plan, onOpenChange }: EditPlanDialogProps) {
  const updatePlan = useUpdatePlan(plan?.id ?? "");
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePlanValues>({ resolver: zodResolver(createPlanSchema) });

  useEffect(() => {
    if (plan) reset(toFormValues(plan));
  }, [plan, reset]);

  async function onSubmit(values: CreatePlanValues) {
    try {
      await updatePlan.mutateAsync({
        name: values.name,
        description: values.description ?? "",
        quotas: values.quotas,
        features: values.features,
      });
      onOpenChange(false);
    } catch {
      // toast d'erreur affiché par le MutationCache ; la modale reste ouverte pour correction
    }
  }

  return (
    <Dialog open={plan !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier le plan {plan?.name}</DialogTitle>
          <DialogDescription>
            Les nouvelles limites s’appliquent immédiatement aux entreprises abonnées. Le prix reste versionné : utilisez
            « Nouveau prix » pour le changer sans toucher aux abonnements en cours.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field id="edit-plan-name" label="Nom du plan" required error={errors.name?.message}>
            <Input id="edit-plan-name" aria-invalid={Boolean(errors.name)} {...register("name")} />
          </Field>
          <Field id="edit-plan-description" label="Description" error={errors.description?.message}>
            <Textarea id="edit-plan-description" rows={2} {...register("description")} />
          </Field>

          <PlanQuotasFields register={register} errors={errors} />
          <PlanFeaturesFields register={register} control={control} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updatePlan.isPending}>
              {updatePlan.isPending && <Spinner />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
