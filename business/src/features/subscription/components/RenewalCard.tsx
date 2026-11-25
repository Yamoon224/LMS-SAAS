"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useCancelPendingPlanChange,
  useCurrentSubscription,
  usePublicPlans,
  useSetAutoRenew,
} from "@/features/subscription/hooks/useSubscription";
import { BILLING_PERIOD_LABELS, RENEWAL_STATUS_LABELS } from "@/features/subscription/schemas/subscription.schema";
import { formatAmount, formatDate } from "@/lib/format";

/** Renouvellement (ENT-03) : interrupteur automatique, dernier renouvellement, changement de plan planifié (ENT-04). */
export function RenewalCard() {
  const subscription = useCurrentSubscription();
  const plans = usePublicPlans();
  const setAutoRenew = useSetAutoRenew();
  const cancelPending = useCancelPendingPlanChange();

  const current = subscription.data;
  if (!current) return null;

  const pending = current.pendingPlanPriceId
    ? plans.data
        ?.flatMap((plan) => plan.prices.map((price) => ({ plan, price })))
        .find(({ price }) => price.id === current.pendingPlanPriceId)
    : undefined;
  const last = current.lastRenewal;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Renouvellement</CardTitle>
        <CardDescription>
          À l’échéance, un lien de paiement vous est envoyé. Sans paiement, une période de grâce de 3 jours s’applique.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="auto-renew" className="flex flex-col gap-1">
            <span>Renouvellement automatique</span>
            <span className="font-normal text-muted-foreground">
              {current.autoRenew
                ? "Activé : l’abonnement est renouvelé à chaque échéance."
                : "Désactivé : l’abonnement prendra fin à l’échéance."}
            </span>
          </Label>
          <Switch
            id="auto-renew"
            checked={current.autoRenew}
            disabled={setAutoRenew.isPending || current.status !== "ACTIVE"}
            onCheckedChange={(checked) => setAutoRenew.mutate(checked)}
          />
        </div>

        {last && (
          <div className="rounded-md border p-3">
            <p className="text-muted-foreground">Dernier renouvellement</p>
            <p className="font-medium">
              {RENEWAL_STATUS_LABELS[last.status]}
              {last.amount ? ` · ${formatAmount(last.amount)}` : ""} · {formatDate(last.at)}
            </p>
            {last.status === "PENDING" && last.paymentUrl && (
              <Button asChild size="sm" className="mt-2">
                <a href={last.paymentUrl} target="_blank" rel="noreferrer">
                  Payer maintenant
                </a>
              </Button>
            )}
          </div>
        )}

        {current.pendingPlanPriceId && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <p className="text-muted-foreground">Changement de plan planifié</p>
              <p className="font-medium">
                {pending
                  ? `${pending.plan.name} (${BILLING_PERIOD_LABELS[pending.price.period]}, ${formatAmount(pending.price.amount, pending.price.currency)})`
                  : "Nouveau plan"}{" "}
                le {formatDate(current.pendingChangeAt)}
              </p>
            </div>
            <Button variant="outline" size="sm" disabled={cancelPending.isPending} onClick={() => cancelPending.mutate()}>
              Annuler le changement
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
