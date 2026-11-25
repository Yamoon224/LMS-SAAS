"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { useReconciliationOverview, useRefundDuplicate, useReplayWebhook } from "../hooks/useReconciliation";
import { describeReplayOutcome, formatAge, WEBHOOK_OUTCOME_LABELS } from "../schemas/reconciliation.schema";
import type { PendingPayment, SuspectedDuplicate, WebhookFailure } from "../schemas/reconciliation.schema";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { useTenants } from "@/features/tenants/hooks/useTenants";
import { formatDateTime, formatNumber } from "@/lib/format";

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function pendingColumns(tenantName: (id: string) => string): DataTableColumn<PendingPayment>[] {
  return [
    {
      id: "createdAt",
      header: "Créé",
      accessor: (payment) => payment.createdAt,
      exportValue: (payment) => formatDateTime(payment.createdAt),
      cell: (payment) => (
        <div className="flex flex-col">
          <span>{formatDateTime(payment.createdAt)}</span>
          <span className="text-xs text-muted-foreground">il y a {formatAge(payment.createdAt)}</span>
        </div>
      ),
      mobile: "secondary",
    },
    {
      id: "tenant",
      header: "Entreprise",
      accessor: (payment) => tenantName(payment.tenantId),
      exportValue: (payment) => tenantName(payment.tenantId),
      cell: (payment) => tenantName(payment.tenantId),
      mobile: "primary",
    },
    {
      id: "provider",
      header: "Fournisseur / moyen",
      accessor: (payment) => `${payment.providerCode} ${payment.method}`,
      exportValue: (payment) => `${payment.providerCode} ${payment.method}`,
      cell: (payment) => `${payment.providerCode} · ${payment.method}`,
    },
    {
      id: "amount",
      header: "Montant",
      accessor: (payment) => payment.amount,
      exportValue: (payment) => payment.amount,
      cell: (payment) => `${formatNumber(payment.amount)} ${payment.currency}`,
    },
  ];
}

function webhookColumns(onReplay: (failure: WebhookFailure) => void, pendingId: string | null): DataTableColumn<WebhookFailure>[] {
  return [
    {
      id: "receivedAt",
      header: "Reçu",
      accessor: (failure) => failure.receivedAt,
      exportValue: (failure) => formatDateTime(failure.receivedAt),
      cell: (failure) => <span className="text-muted-foreground">{formatDateTime(failure.receivedAt)}</span>,
      mobile: "secondary",
    },
    {
      id: "provider",
      header: "Fournisseur",
      accessor: (failure) => failure.providerCode,
      exportValue: (failure) => failure.providerCode,
      cell: (failure) => failure.providerCode,
      mobile: "primary",
    },
    {
      id: "outcome",
      header: "Issue",
      accessor: (failure) => failure.outcome,
      exportValue: (failure) => WEBHOOK_OUTCOME_LABELS[failure.outcome] ?? failure.outcome,
      cell: (failure) => WEBHOOK_OUTCOME_LABELS[failure.outcome] ?? failure.outcome,
    },
    {
      id: "actions",
      header: "Actions",
      accessor: () => "",
      cell: (failure) =>
        failure.replayable ? (
          <Button size="sm" variant="outline" disabled={pendingId === failure.id} onClick={() => onReplay(failure)}>
            Rejouer
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Référence non conservée</span>
        ),
    },
  ];
}

function duplicateColumns(
  tenantName: (id: string) => string,
  onRefund: (duplicate: SuspectedDuplicate) => void,
): DataTableColumn<SuspectedDuplicate>[] {
  return [
    {
      id: "createdAt",
      header: "Doublon payé",
      accessor: (duplicate) => duplicate.createdAt,
      exportValue: (duplicate) => formatDateTime(duplicate.createdAt),
      cell: (duplicate) => (
        <div className="flex flex-col">
          <span>{formatDateTime(duplicate.createdAt)}</span>
          <span className="text-xs text-muted-foreground">Original : {formatDateTime(duplicate.originalCreatedAt)}</span>
        </div>
      ),
      mobile: "secondary",
    },
    {
      id: "tenant",
      header: "Entreprise",
      accessor: (duplicate) => tenantName(duplicate.tenantId),
      exportValue: (duplicate) => tenantName(duplicate.tenantId),
      cell: (duplicate) => tenantName(duplicate.tenantId),
      mobile: "primary",
    },
    {
      id: "amount",
      header: "Montant",
      accessor: (duplicate) => duplicate.amount,
      exportValue: (duplicate) => duplicate.amount,
      cell: (duplicate) => `${formatNumber(duplicate.amount)} ${duplicate.currency}`,
    },
    {
      id: "actions",
      header: "Actions",
      accessor: () => "",
      cell: (duplicate) => (
        <Button size="sm" onClick={() => onRefund(duplicate)}>
          Rembourser le doublon
        </Button>
      ),
    },
  ];
}

/** ADM-27 : paiements en attente anciens, webhooks en échec (rejeu), doublons suspects (remboursement). */
export function ReconciliationPage() {
  const { data, isLoading, isError, error, refetch } = useReconciliationOverview();
  const { data: tenants } = useTenants();
  const replay = useReplayWebhook();
  const refund = useRefundDuplicate();
  const [refunding, setRefunding] = useState<SuspectedDuplicate | null>(null);
  const tenantName = (id: string) => tenants?.find((tenant) => tenant.id === id)?.name ?? id;

  async function replayOne(failure: WebhookFailure) {
    try {
      const result = await replay.mutateAsync(failure.id);
      toast.success(describeReplayOutcome(result.outcome));
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  async function confirmRefund() {
    if (!refunding) return;
    try {
      await refund.mutateAsync(refunding.paymentId);
      setRefunding(null);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  if (isError) return <ErrorBanner title="Impossible de charger le rapprochement." error={error} onRetry={() => void refetch()} />;

  const empty = <EmptyState icon={CheckCircle2} message="Rien à rapprocher." />;
  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Paiements en attente anciens"
        hint="Sondés toutes les 5 minutes ; expirés (échec « expiré ») après 30 minutes sans confirmation."
      >
        <DataTable
          data={data?.stalePendingPayments}
          columns={pendingColumns(tenantName)}
          getRowId={(payment) => payment.id}
          isLoading={isLoading}
          title="paiements en attente"
          stateKey="reconciliation-pending"
          emptyState={empty}
        />
      </Section>
      <Section
        title="Webhooks en échec ou non traités"
        hint="Rejouer re-vérifie le paiement auprès du fournisseur ; un paiement déjà traité n’est jamais crédité deux fois."
      >
        <DataTable
          data={data?.webhookFailures}
          columns={webhookColumns((failure) => void replayOne(failure), replay.isPending ? (replay.variables ?? null) : null)}
          getRowId={(failure) => failure.id}
          isLoading={isLoading}
          title="webhooks en échec"
          stateKey="reconciliation-webhooks"
          emptyState={empty}
        />
      </Section>
      <Section
        title="Paiements en double suspects"
        hint="Même entreprise, apprenant, formation et montant à moins de 10 minutes d’écart. Le premier paiement est conservé."
      >
        <DataTable
          data={data?.suspectedDuplicates}
          columns={duplicateColumns(tenantName, setRefunding)}
          getRowId={(duplicate) => duplicate.paymentId}
          isLoading={isLoading}
          title="doublons suspects"
          stateKey="reconciliation-duplicates"
          emptyState={empty}
        />
      </Section>
      <ConfirmDialog
        open={refunding !== null}
        onOpenChange={(open) => !open && setRefunding(null)}
        title="Rembourser le doublon"
        description={
          refunding
            ? `Rembourser intégralement ${formatNumber(refunding.amount)} ${refunding.currency} via le fournisseur d’origine. Le premier paiement est conservé. Cette action est irréversible.`
            : ""
        }
        confirmLabel="Rembourser"
        isPending={refund.isPending}
        onConfirm={() => void confirmRefund()}
      />
    </div>
  );
}
