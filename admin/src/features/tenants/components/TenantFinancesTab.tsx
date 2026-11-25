"use client";

import { InfoField, TenantTabState } from "./TenantTabState";

import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTenantFinances } from "@/features/tenants/hooks/useTenantOverview";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
  PAYOUT_STATUS_LABELS,
  REFUND_STATUS_LABELS,
} from "@/features/tenants/schemas/tenant-overview.schema";
import type { TenantFinances } from "@/features/tenants/schemas/tenant-overview.schema";
import { formatAmount, formatDate, formatDateTime } from "@/lib/format";

const PAYMENT_VARIANTS: Record<TenantFinances["payments"][number]["status"], BadgeProps["variant"]> = {
  PENDING: "warning",
  SUCCEEDED: "success",
  FAILED: "danger",
  REFUNDED: "secondary",
  PARTIALLY_REFUNDED: "secondary",
};

const PAYOUT_VARIANTS: Record<TenantFinances["payouts"][number]["status"], BadgeProps["variant"]> = {
  REQUESTED: "warning",
  VALIDATED: "info",
  APPROVED: "info",
  EXECUTED: "success",
  REJECTED: "danger",
};

const REFUND_VARIANTS: Record<TenantFinances["refunds"][number]["status"], BadgeProps["variant"]> = {
  REQUESTED: "warning",
  ACCEPTED: "info",
  REFUNDED: "success",
  REJECTED: "danger",
};

/** ADM-10 — Finances : solde comptable, paiements, reversements et remboursements récents (20 dernières lignes chacun). */
export function TenantFinancesTab({ tenantId, active }: { tenantId: string; active: boolean }) {
  const query = useTenantFinances(tenantId, active);

  return (
    <TenantTabState
      query={query}
      errorTitle="Impossible de charger les finances."
      forbiddenMessage="Vous n’avez pas l’autorisation de consulter les données financières."
    >
      {(finances) => (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Synthèse</CardTitle>
              <CardDescription>Totaux sur toute la vie de l’entreprise. Le solde est comptable, non le disponible au reversement.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <InfoField label="Solde comptable">{formatAmount(finances.summary.ledgerBalance, finances.summary.currency)}</InfoField>
                <InfoField label="Encaissé">{formatAmount(finances.summary.succeededPaymentsAmount, finances.summary.currency)}</InfoField>
                <InfoField label="Reversé">{formatAmount(finances.summary.executedPayoutsAmount, finances.summary.currency)}</InfoField>
                <InfoField label="Remboursé">{formatAmount(finances.summary.refundedAmount, finances.summary.currency)}</InfoField>
                <InfoField label="Paiements échoués">{finances.summary.failedPaymentsCount}</InfoField>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paiements récents</CardTitle>
            </CardHeader>
            <CardContent>
              {finances.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun paiement.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Référence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {finances.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="whitespace-nowrap">{formatDateTime(payment.createdAt)}</TableCell>
                        <TableCell>{PAYMENT_TYPE_LABELS[payment.type]}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatAmount(payment.amount, payment.currency)}</TableCell>
                        <TableCell>
                          <Badge variant={PAYMENT_VARIANTS[payment.status]}>{PAYMENT_STATUS_LABELS[payment.status]}</Badge>
                        </TableCell>
                        <TableCell className="break-all font-mono text-xs">{payment.providerReference}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Reversements</CardTitle>
              </CardHeader>
              <CardContent>
                {finances.payouts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun reversement.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Demandé le</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Exécuté le</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {finances.payouts.map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell className="whitespace-nowrap">{formatDate(payout.requestedAt)}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatAmount(payout.amount, payout.currency)}</TableCell>
                          <TableCell>
                            <Badge variant={PAYOUT_VARIANTS[payout.status]}>{PAYOUT_STATUS_LABELS[payout.status]}</Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(payout.executedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Remboursements</CardTitle>
              </CardHeader>
              <CardContent>
                {finances.refunds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun remboursement.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Demandé le</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Motif</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {finances.refunds.map((refund) => (
                        <TableRow key={refund.id}>
                          <TableCell className="whitespace-nowrap">{formatDate(refund.requestedAt)}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatAmount(refund.amount, finances.summary.currency)}</TableCell>
                          <TableCell>
                            <Badge variant={REFUND_VARIANTS[refund.status]}>{REFUND_STATUS_LABELS[refund.status]}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[16rem] break-words">{refund.reason ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </TenantTabState>
  );
}
