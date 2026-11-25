"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { useSetPlanPrice } from "../hooks/useSetPlanPrice";
import type { Plan, SetPlanPriceValues } from "../schemas/plan.schema";
import { BILLING_PERIOD_LABELS, setPlanPriceSchema } from "../schemas/plan.schema";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

interface AddPlanPriceDialogProps {
  /** Plan ciblé ; `null` = fermé. */
  plan: Plan | null;
  onOpenChange: (open: boolean) => void;
}

const DEFAULTS: SetPlanPriceValues = { period: "MONTHLY", currency: "XOF", amount: 0, trialDays: 0 };

/**
 * ADM-17: ajoute une nouvelle version de prix. Les abonnements déjà actifs ne sont jamais
 * impactés — seules les futures souscriptions utiliseront ce nouveau prix.
 */
export function AddPlanPriceDialog({ plan, onOpenChange }: AddPlanPriceDialogProps) {
  const setPlanPrice = useSetPlanPrice(plan?.id ?? "");

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SetPlanPriceValues>({ resolver: zodResolver(setPlanPriceSchema), defaultValues: DEFAULTS });

  useEffect(() => {
    if (plan) reset(DEFAULTS);
  }, [plan, reset]);

  async function onSubmit(values: SetPlanPriceValues) {
    try {
      await setPlanPrice.mutateAsync(values);
      onOpenChange(false);
    } catch {
      // toast d'erreur affiché par le MutationCache ; la modale reste ouverte pour correction
    }
  }

  return (
    <Dialog open={plan !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau prix — {plan?.name}</DialogTitle>
          <DialogDescription>
            Crée une nouvelle version de prix pour une périodicité donnée. Les entreprises déjà abonnées
            conservent leur prix actuel : seules les nouvelles souscriptions utiliseront ce tarif.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field id="price-period" label="Périodicité" required>
            <Controller
              control={control}
              name="period"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="price-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BILLING_PERIOD_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="price-amount" label="Montant" required hint="Dans la plus petite unité de la devise." error={errors.amount?.message}>
              <Input id="price-amount" placeholder="25000" type="number" inputMode="numeric" min={0} aria-invalid={Boolean(errors.amount)} {...register("amount")} />
            </Field>
            <Field id="price-currency" label="Devise (ISO 3)" required error={errors.currency?.message}>
              <Input id="price-currency" placeholder="XOF" maxLength={3} aria-invalid={Boolean(errors.currency)} {...register("currency")} />
            </Field>
          </div>

          <Field id="price-trial" label="Jours d’essai" hint="0 = pas d’essai." error={errors.trialDays?.message}>
            <Input id="price-trial" placeholder="14" type="number" inputMode="numeric" min={0} {...register("trialDays")} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={setPlanPrice.isPending}>
              {setPlanPrice.isPending && <Spinner />}
              Créer la nouvelle version
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
