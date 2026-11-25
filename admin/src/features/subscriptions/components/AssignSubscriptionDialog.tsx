"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useAssignSubscription } from "../hooks/useAssignSubscription";
import type { AssignSubscriptionValues } from "../schemas/subscription.schema";
import { assignSubscriptionSchema } from "../schemas/subscription.schema";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-bar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { usePlans } from "@/features/plans/hooks/usePlans";
import { BILLING_PERIOD_LABELS } from "@/features/plans/schemas/plan.schema";
import { formatAmount } from "@/lib/format";

interface AssignSubscriptionDialogProps {
  tenantId: string;
  tenantName: string;
}

const DEFAULTS: AssignSubscriptionValues = { planPriceId: "", startWithTrial: false };

/** ADM-09: attribuer un plan offert ou personnalisé à une entreprise, avec essai optionnel. */
export function AssignSubscriptionDialog({ tenantId, tenantName }: AssignSubscriptionDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: plans, isLoading: isLoadingPlans, isError: plansError } = usePlans();
  const assignSubscription = useAssignSubscription(tenantId);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignSubscriptionValues>({ resolver: zodResolver(assignSubscriptionSchema), defaultValues: DEFAULTS });

  const availablePrices = (plans ?? [])
    .filter((plan) => !plan.isArchived)
    .flatMap((plan) =>
      plan.prices
        .filter((price) => price.isActive)
        .map((price) => ({
          id: price.id,
          label: `${plan.name} — ${BILLING_PERIOD_LABELS[price.period]} (${formatAmount(price.amount, price.currency)})`,
        })),
    );

  async function onSubmit(values: AssignSubscriptionValues) {
    try {
      await assignSubscription.mutateAsync(values);
      setOpen(false);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) reset(DEFAULTS);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          Attribuer un plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attribuer un plan à {tenantName}</DialogTitle>
          <DialogDescription>
            Attribution directe par l’Admin, avec période d’essai optionnelle sans paiement. Échoue
            si l’entreprise a déjà un abonnement actif.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field id="assign-price" label="Plan et prix" required error={errors.planPriceId?.message}>
            {isLoadingPlans ? (
              <Skeleton className="h-11 w-full sm:h-9" />
            ) : plansError ? (
              <p className="text-sm text-danger">Impossible de charger les plans.</p>
            ) : availablePrices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun plan avec un prix actif. Créez un plan et ajoutez-lui un prix d’abord.
              </p>
            ) : (
              <Controller
                control={control}
                name="planPriceId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="assign-price">
                      <SelectValue placeholder="Choisir un prix de plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePrices.map((price) => (
                        <SelectItem key={price.id} value={price.id}>
                          {price.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </Field>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <Label htmlFor="assign-trial">Démarrer en période d’essai (sans paiement)</Label>
            <Controller
              control={control}
              name="startWithTrial"
              render={({ field }) => <Switch id="assign-trial" checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={assignSubscription.isPending || availablePrices.length === 0}>
              {assignSubscription.isPending && <Spinner />}
              Attribuer le plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
