"use client";

import { SubscriptionStatusBadge } from "./SubscriptionStatusBadge";

import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentSubscription, usePublicPlans } from "@/features/subscription/hooks/useSubscription";
import { BILLING_PERIOD_LABELS } from "@/features/subscription/schemas/subscription.schema";
import { ApiError } from "@/lib/api-client";
import { formatAmount, formatDate } from "@/lib/format";

/** Abonnement courant : plan, périodicité, prix, statut et échéance (ENT-05/ENT-07). */
export function CurrentSubscriptionCard() {
  const subscription = useCurrentSubscription();
  const plans = usePublicPlans();

  if (subscription.isLoading || plans.isLoading) return <Skeleton className="h-40" />;

  if (subscription.error instanceof ApiError && subscription.error.status === 404) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aucun abonnement actif</CardTitle>
          <CardDescription>Choisissez un plan ci-dessous pour activer votre espace.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (subscription.isError || !subscription.data) {
    return <ErrorBanner title="Impossible de charger l'abonnement." error={subscription.error} />;
  }

  const current = subscription.data;
  const match = plans.data
    ?.flatMap((plan) => plan.prices.map((price) => ({ plan, price })))
    .find(({ price }) => price.id === current.planPriceId);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{match?.plan.name ?? "Plan sur mesure"}</CardTitle>
          <CardDescription>
            {match
              ? `${BILLING_PERIOD_LABELS[match.price.period]} · ${formatAmount(match.price.amount, match.price.currency)}`
              : "Plan non public — contactez l'administrateur pour tout changement."}
          </CardDescription>
        </div>
        <SubscriptionStatusBadge status={current.status} />
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground">Début</p>
          <p className="font-medium">{formatDate(current.startedAt)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Prochaine échéance</p>
          <p className="font-medium">{formatDate(current.currentPeriodEnd)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Renouvellement</p>
          <p className="font-medium">{current.autoRenew ? "Automatique" : "Manuel"}</p>
        </div>
        {current.status === "GRACE_PERIOD" && (
          <p className="text-warning sm:col-span-3">
            Période de grâce jusqu’au {formatDate(current.graceEndsAt)} : renouvelez avant cette date pour éviter la
            suspension.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
