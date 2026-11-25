"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useChangePlan, usePlanChangePreview, useSubscribe } from "@/features/subscription/hooks/useSubscription";
import { MONTHS_PER_PERIOD, QUOTA_LABELS } from "@/features/subscription/schemas/subscription.schema";
import type { BillingPeriod, PlanPrice, PlanQuotas, PublicPlan } from "@/features/subscription/schemas/subscription.schema";
import { formatAmount, formatDate } from "@/lib/format";

interface PlanCardProps {
  plan: PublicPlan;
  period: BillingPeriod;
  currentPrice: PlanPrice | undefined;
  currentPriceId: string | undefined;
  hasSubscription: boolean;
}

function monthly(price: PlanPrice): number {
  return price.amount / MONTHS_PER_PERIOD[price.period];
}

function PlanQuotaList({ plan }: { plan: PublicPlan }) {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {(Object.keys(QUOTA_LABELS) as (keyof PlanQuotas)[]).map((key) => (
        <li key={key} className="flex justify-between">
          <span className="text-muted-foreground">{QUOTA_LABELS[key]}</span>
          <span className="font-medium">{plan.quotas[key] ?? "Illimité"}</span>
        </li>
      ))}
      {plan.features.aiTranslation && (
        <li className="flex justify-between">
          <span className="text-muted-foreground">Crédits IA inclus</span>
          <span className="font-medium">{plan.features.aiTranslationCreditsIncluded ?? 0}</span>
        </li>
      )}
    </ul>
  );
}

/** Carte d'un plan : quotas, prix de la périodicité choisie et action de souscription / changement. */
export function PlanCard({ plan, period, currentPrice, currentPriceId, hasSubscription }: PlanCardProps) {
  const [confirming, setConfirming] = useState(false);
  const subscribe = useSubscribe();
  const changePlan = useChangePlan();
  const price = plan.prices.find((candidate) => candidate.period === period);
  const isCurrent = price !== undefined && price.id === currentPriceId;
  const isUpgrade = price !== undefined && currentPrice !== undefined && monthly(price) > monthly(currentPrice);
  const isPending = subscribe.isPending || changePlan.isPending;
  const preview = usePlanChangePreview(price?.id, confirming && hasSubscription);

  async function onConfirm() {
    if (!price) return;
    if (hasSubscription) {
      await changePlan.mutateAsync({ newPlanPriceId: price.id, isUpgrade });
    } else {
      await subscribe.mutateAsync({ planPriceId: price.id, startWithTrial: false });
    }
    setConfirming(false);
  }

  function confirmationText(): string {
    if (!hasSubscription) {
      return "Le paiement est géré selon les moyens activés par la plateforme.";
    }
    if (preview.isLoading) return "Calcul du prorata…";
    const data = preview.data;
    if (!data) return "Prorata indisponible : le serveur recalculera le montant à la confirmation.";
    if (data.timing === "AT_PERIOD_END") {
      return `Ce changement prendra effet à la prochaine échéance (${formatDate(data.effectiveAt)}), sans frais, sous réserve du respect des quotas du nouveau plan. Vous pourrez l’annuler d’ici là.`;
    }
    if (data.amountDue <= 0) return "Le changement est appliqué immédiatement, sans montant à payer.";
    return `Le changement est appliqué immédiatement. Prorata pour les ${data.remainingDays} jour(s) restants sur ${data.totalDays} : nouveau plan ${formatAmount(data.chargeAmount, data.currency)} − crédit de l’ancien plan ${formatAmount(data.creditAmount, data.currency)} = ${formatAmount(data.amountDue, data.currency)} à payer (un lien de paiement vous est envoyé). L’échéance reste inchangée.`;
  }

  const actionLabel = !hasSubscription ? "Souscrire" : isUpgrade ? "Passer à ce plan" : "Choisir ce plan";

  return (
    <Card className={isCurrent ? "border-brand" : undefined}>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <CardTitle>{plan.name}</CardTitle>
        {isCurrent && <Badge>Plan actuel</Badge>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-2xl font-semibold tracking-tight">
          {price ? formatAmount(price.amount, price.currency) : "Non proposé"}
        </p>
        <PlanQuotaList plan={plan} />
      </CardContent>
      <CardFooter>
        <Button className="w-full" disabled={!price || isCurrent || isPending} onClick={() => setConfirming(true)}>
          {isCurrent ? "Plan actuel" : actionLabel}
        </Button>
      </CardFooter>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`${actionLabel} — ${plan.name}`}
        description={confirmationText()}
        confirmLabel="Confirmer"
        destructive={false}
        isPending={isPending}
        onConfirm={() => void onConfirm()}
      />
    </Card>
  );
}
