"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, Gift, Percent, X } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { useApplyDiscount, useExtendSubscription, useOfferPlan, useRemoveDiscount } from "../hooks/useAdminSubscriptionActions";
import {
  buildDiscountPayload,
  buildExtendPayload,
  discountSchema,
  extendSubscriptionSchema,
  offerPlanSchema,
} from "../schemas/admin-subscription.schema";
import type { DiscountValues, ExtendSubscriptionValues, OfferPlanValues } from "../schemas/admin-subscription.schema";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { usePlans } from "@/features/plans/hooks/usePlans";
import { BILLING_PERIOD_LABELS } from "@/features/plans/schemas/plan.schema";
import { formatAmount } from "@/lib/format";

type DialogKind = "extend" | "discount" | "offer" | "removeDiscount" | null;

interface Props {
  tenantId: string;
  tenantName: string;
  /** Un abonnement actif existe (prolonger / remiser) ; l'offre d'un plan reste possible sans abonnement. */
  hasActiveSubscription: boolean;
  hasDiscount: boolean;
  isComplimentary: boolean;
}

/** ADM-09 : prolonger, remiser, offrir un plan, retirer la remise (chaque action est journalisée côté serveur). */
export function SubscriptionAdminActions({ tenantId, tenantName, hasActiveSubscription, hasDiscount, isComplimentary }: Props) {
  const [open, setOpen] = useState<DialogKind>(null);
  const removeDiscount = useRemoveDiscount(tenantId);
  const close = () => setOpen(null);

  async function confirmRemoveDiscount() {
    try {
      await removeDiscount.mutateAsync();
      close();
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {hasActiveSubscription && (
          <Button variant="outline" size="sm" onClick={() => setOpen("extend")}>
            <CalendarPlus className="h-4 w-4" /> Prolonger
          </Button>
        )}
        {hasActiveSubscription && !isComplimentary && (
          <Button variant="outline" size="sm" onClick={() => setOpen("discount")}>
            <Percent className="h-4 w-4" /> {hasDiscount ? "Modifier la remise" : "Appliquer une remise"}
          </Button>
        )}
        {hasDiscount && (
          <Button variant="ghost" size="sm" onClick={() => setOpen("removeDiscount")}>
            <X className="h-4 w-4" /> Retirer la remise
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setOpen("offer")}>
          <Gift className="h-4 w-4" /> Offrir un plan
        </Button>
      </div>

      <ExtendDialog tenantId={tenantId} tenantName={tenantName} open={open === "extend"} onClose={close} />
      <DiscountDialog tenantId={tenantId} tenantName={tenantName} open={open === "discount"} onClose={close} />
      <OfferDialog tenantId={tenantId} tenantName={tenantName} open={open === "offer"} onClose={close} />
      <ConfirmDialog
        open={open === "removeDiscount"}
        onOpenChange={(next) => !next && close()}
        title="Retirer la remise ?"
        description={`Les prochains renouvellements de ${tenantName} seront facturés au prix normal.`}
        confirmLabel="Retirer la remise"
        destructive={false}
        isPending={removeDiscount.isPending}
        onConfirm={() => void confirmRemoveDiscount()}
      />
    </>
  );
}

interface DialogProps {
  tenantId: string;
  tenantName: string;
  open: boolean;
  onClose: () => void;
}

function ExtendDialog({ tenantId, tenantName, open, onClose }: DialogProps) {
  const extend = useExtendSubscription(tenantId);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExtendSubscriptionValues>({
    resolver: zodResolver(extendSubscriptionSchema),
    defaultValues: { mode: "days", days: 14, until: "", reason: "" },
  });
  const mode = useWatch({ control, name: "mode" });

  async function onSubmit(values: ExtendSubscriptionValues) {
    try {
      await extend.mutateAsync(buildExtendPayload(values));
      reset();
      onClose();
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prolonger l’abonnement de {tenantName}</DialogTitle>
          <DialogDescription>
            Repousse l’échéance de la période en cours sans facturation. Le renouvellement automatique est conservé ;
            une période de grâce prend fin. Le Propriétaire est prévenu par notification.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field id="extend-mode" label="Prolonger de">
            <Controller
              control={control}
              name="mode"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="extend-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Un nombre de jours</SelectItem>
                    <SelectItem value="date">Jusqu’à une date</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          {mode === "days" ? (
            <Field id="extend-days" label="Nombre de jours" required error={errors.days?.message}>
              <Input id="extend-days" type="number" inputMode="numeric" min={1} max={366} {...register("days")} />
            </Field>
          ) : (
            <Field id="extend-until" label="Nouvelle échéance" required error={errors.until?.message}>
              <Input id="extend-until" type="date" {...register("until")} />
            </Field>
          )}
          <Field id="extend-reason" label="Motif (facultatif)" error={errors.reason?.message}>
            <Textarea id="extend-reason" rows={2} {...register("reason")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={extend.isPending}>
              {extend.isPending && <Spinner />}
              Prolonger
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DiscountDialog({ tenantId, tenantName, open, onClose }: DialogProps) {
  const apply = useApplyDiscount(tenantId);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DiscountValues>({
    resolver: zodResolver(discountSchema),
    defaultValues: { kind: "percent", value: 10, periods: 3, reason: "" },
  });
  const kind = useWatch({ control, name: "kind" });

  async function onSubmit(values: DiscountValues) {
    try {
      await apply.mutateAsync(buildDiscountPayload(values));
      reset();
      onClose();
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Appliquer une remise à {tenantName}</DialogTitle>
          <DialogDescription>
            S’applique aux prochains renouvellements et au prorata d’un changement de plan, pour le nombre de périodes
            choisi. Remplace la remise en cours. Le Propriétaire est prévenu par notification.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="discount-kind" label="Type de remise">
              <Controller
                control={control}
                name="kind"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="discount-kind">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Pourcentage</SelectItem>
                      <SelectItem value="amount">Montant fixe par période</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field
              id="discount-value"
              label={kind === "percent" ? "Pourcentage (1 à 100)" : "Montant (plus petite unité)"}
              required
              error={errors.value?.message}
            >
              <Input id="discount-value" type="number" inputMode="numeric" min={1} {...register("value")} />
            </Field>
          </div>
          <Field id="discount-periods" label="Durée (périodes de facturation)" required error={errors.periods?.message}>
            <Input id="discount-periods" type="number" inputMode="numeric" min={1} max={36} {...register("periods")} />
          </Field>
          <Field id="discount-reason" label="Motif (facultatif)" error={errors.reason?.message}>
            <Textarea id="discount-reason" rows={2} {...register("reason")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={apply.isPending}>
              {apply.isPending && <Spinner />}
              Appliquer la remise
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OfferDialog({ tenantId, tenantName, open, onClose }: DialogProps) {
  const offer = useOfferPlan(tenantId);
  const { data: plans, isLoading, isError } = usePlans();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OfferPlanValues>({
    resolver: zodResolver(offerPlanSchema),
    defaultValues: { planPriceId: "", days: 90, reason: "" },
  });

  const prices = (plans ?? [])
    .filter((plan) => !plan.isArchived)
    .flatMap((plan) =>
      plan.prices
        .filter((price) => price.isActive)
        .map((price) => ({ id: price.id, label: `${plan.name} — ${BILLING_PERIOD_LABELS[price.period]} (${formatAmount(price.amount, price.currency)})` })),
    );

  async function onSubmit(values: OfferPlanValues) {
    try {
      await offer.mutateAsync(values);
      reset();
      onClose();
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Offrir un plan à {tenantName}</DialogTitle>
          <DialogDescription>
            Le plan est actif sans paiement pour la durée choisie, sans renouvellement automatique : il prend fin à
            l’échéance et l’entreprise doit alors choisir un plan. Remplace le plan actuel (la période déjà payée est
            conservée si elle est plus longue). Le motif est conservé dans le journal d’audit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field id="offer-price" label="Plan et prix" required error={errors.planPriceId?.message}>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement des plans…</p>
            ) : isError || prices.length === 0 ? (
              <p className="text-sm text-danger">Aucun plan disponible.</p>
            ) : (
              <Controller
                control={control}
                name="planPriceId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="offer-price">
                      <SelectValue placeholder="Choisir un prix de plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {prices.map((price) => (
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
          <Field id="offer-days" label="Durée offerte (jours)" required error={errors.days?.message}>
            <Input id="offer-days" type="number" inputMode="numeric" min={1} max={3650} {...register("days")} />
          </Field>
          <Field id="offer-reason" label="Motif" required error={errors.reason?.message}>
            <Textarea id="offer-reason" rows={2} placeholder="Ex. partenariat, geste commercial, pilote" {...register("reason")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={offer.isPending || prices.length === 0}>
              {offer.isPending && <Spinner />}
              Offrir le plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
