"use client";

import { InfoField } from "./TenantTabState";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BILLING_PERIOD_LABELS } from "@/features/plans/schemas/plan.schema";
import { AssignSubscriptionDialog } from "@/features/subscriptions/components/AssignSubscriptionDialog";
import { SubscriptionAdminActions } from "@/features/subscriptions/components/SubscriptionAdminActions";
import { SubscriptionStatusBadge } from "@/features/subscriptions/components/SubscriptionStatusBadge";
import { describeDiscount } from "@/features/subscriptions/schemas/admin-subscription.schema";
import type { TenantOverview } from "@/features/tenants/schemas/tenant-overview.schema";
import { formatAmount, formatDate } from "@/lib/format";

const ACTIVE_STATUSES = ["ACTIVE", "TRIALING", "GRACE_PERIOD"];

/** ADM-10 / ADM-09 — Abonnement : plan courant, période, historique, attribution d'un plan. */
export function TenantSubscriptionTab({
  overview,
  canAssign,
}: {
  overview: TenantOverview;
  canAssign: boolean;
}) {
  const { current, history } = overview.subscription;
  const discountLabel = current ? describeDiscount(current, (amount) => formatAmount(amount, current.currency)) : null;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Abonnement courant</CardTitle>
          {canAssign && (
            <div className="flex flex-col gap-2 sm:items-end">
              <AssignSubscriptionDialog tenantId={overview.tenant.id} tenantName={overview.tenant.name} />
              <SubscriptionAdminActions
                tenantId={overview.tenant.id}
                tenantName={overview.tenant.name}
                hasActiveSubscription={current !== null && ACTIVE_STATUSES.includes(current.status)}
                hasDiscount={discountLabel !== null}
                isComplimentary={current?.isComplimentary ?? false}
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {current ? (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <InfoField label="Plan">
                {current.planName} — {BILLING_PERIOD_LABELS[current.period]}
              </InfoField>
              <InfoField label="Prix">{formatAmount(current.amount, current.currency)}</InfoField>
              <InfoField label="Statut">
                <SubscriptionStatusBadge status={current.status} />
              </InfoField>
              <InfoField label="Renouvellement automatique">{current.autoRenew ? "Oui" : "Non"}</InfoField>
              {current.isComplimentary && <InfoField label="Plan offert">Oui, sans paiement</InfoField>}
              {discountLabel && <InfoField label="Remise en cours">{discountLabel}</InfoField>}
              <InfoField label="Début">{formatDate(current.startedAt)}</InfoField>
              <InfoField label="Fin de la période en cours">{formatDate(current.currentPeriodEnd)}</InfoField>
              {current.status === "GRACE_PERIOD" && (
                <InfoField label="Fin de la période de grâce">{formatDate(current.graceEndsAt)}</InfoField>
              )}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun abonnement actif. Utilisez « Attribuer un plan » pour en ouvrir un.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des abonnements</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun abonnement n’a encore été souscrit.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Début</TableHead>
                  <TableHead>Fin de période</TableHead>
                  <TableHead>Résilié le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.planName} — {BILLING_PERIOD_LABELS[row.period]}
                    </TableCell>
                    <TableCell>
                      <SubscriptionStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatAmount(row.amount, row.currency)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(row.startedAt ?? row.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(row.currentPeriodEnd)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(row.canceledAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
