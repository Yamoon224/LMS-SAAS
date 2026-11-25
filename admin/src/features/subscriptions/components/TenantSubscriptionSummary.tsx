"use client";

import { SubscriptionStatusBadge } from "./SubscriptionStatusBadge";

import { AccessDenied, isForbidden } from "@/components/feedback/AccessDenied";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { BILLING_PERIOD_LABELS } from "@/features/plans/schemas/plan.schema";
import { useTenantSubscription } from "@/features/subscriptions/hooks/useTenantSubscription";
import { formatAmount, formatDate } from "@/lib/format";

/** ADM-09: résumé en lecture seule de l'abonnement courant (le plus récent) d'une entreprise. */
export function TenantSubscriptionSummary({ tenantId }: { tenantId: string }) {
  const { data: subscription, isLoading, isError, error, refetch } = useTenantSubscription(tenantId);

  if (isLoading) {
    return (
      <div className="space-y-2" role="status" aria-label="Chargement">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (isError) {
    if (isForbidden(error)) return <AccessDenied message="Vous n’avez pas l’autorisation de consulter les abonnements." />;
    return <ErrorBanner title="Impossible de charger l’abonnement." error={error} onRetry={() => void refetch()} />;
  }

  if (!subscription) {
    return (
      <p className="text-sm text-muted-foreground">
        Cette entreprise n’a pas encore d’abonnement. Utilisez «&nbsp;Attribuer un plan&nbsp;» pour lui en attribuer un.
      </p>
    );
  }

  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Field label="Plan">
        {subscription.planName} — {BILLING_PERIOD_LABELS[subscription.period]}
      </Field>
      <Field label="Prix">{formatAmount(subscription.amount, subscription.currency)}</Field>
      <Field label="Statut">
        <SubscriptionStatusBadge status={subscription.status} />
      </Field>
      <Field label="Renouvellement automatique">{subscription.autoRenew ? "Oui" : "Non"}</Field>
      <Field label="Début">{formatDate(subscription.startedAt)}</Field>
      <Field label="Fin de la période en cours">{formatDate(subscription.currentPeriodEnd)}</Field>
      {subscription.status === "GRACE_PERIOD" && (
        <Field label="Fin de la période de grâce">{formatDate(subscription.graceEndsAt)}</Field>
      )}
      {subscription.canceledAt && <Field label="Résilié le">{formatDate(subscription.canceledAt)}</Field>}
    </dl>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium">{children}</dd>
    </div>
  );
}
