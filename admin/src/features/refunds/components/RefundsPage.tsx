"use client";

import { Undo2 } from "lucide-react";
import { useState } from "react";

import { useExecuteRefund, useRefundsByStatus } from "../hooks/useRefunds";
import { REFUND_STATUS_LABELS, REFUND_STATUS_ORDER } from "../schemas/refund.schema";
import type { RefundRequest, RefundStatus } from "../schemas/refund.schema";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSession } from "@/features/session/hooks/useSession";
import { useTenants } from "@/features/tenants/hooks/useTenants";
import { formatDate, formatNumber } from "@/lib/format";

function StatusFilter({ value, onChange }: { value: RefundStatus; onChange: (status: RefundStatus) => void }) {
  return (
    <div role="group" aria-label="Statut des demandes" className="inline-flex flex-wrap gap-1">
      {REFUND_STATUS_ORDER.map((status) => (
        <Button
          key={status}
          type="button"
          size="sm"
          variant={status === value ? "default" : "outline"}
          aria-pressed={status === value}
          onClick={() => onChange(status)}
        >
          {REFUND_STATUS_LABELS[status]}
        </Button>
      ))}
    </div>
  );
}

/** Suivi des demandes de remboursement et exécution de celles acceptées par l'entreprise (ADM-26). */
export function RefundsPage() {
  const [status, setStatus] = useState<RefundStatus>("ACCEPTED");
  const [executing, setExecuting] = useState<RefundRequest | null>(null);
  const { data, isLoading, isError, error, refetch } = useRefundsByStatus(status);
  const { data: tenants } = useTenants();
  const { data: session } = useSession();
  const execute = useExecuteRefund();
  const canExecute = status === "ACCEPTED" && (session?.permissions ?? []).includes("payments.refund");
  const tenantName = (id: string) => tenants?.find((tenant) => tenant.id === id)?.name ?? id;

  async function confirmExecute() {
    if (!executing) return;
    try {
      await execute.mutateAsync(executing.id);
      setExecuting(null);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  const columns: DataTableColumn<RefundRequest>[] = [
    {
      id: "requestedAt",
      header: "Demandée le",
      accessor: (refund) => refund.requestedAt,
      exportValue: (refund) => formatDate(refund.requestedAt),
      cell: (refund) => <span className="text-muted-foreground">{formatDate(refund.requestedAt)}</span>,
      mobile: "secondary",
    },
    {
      id: "tenant",
      header: "Entreprise",
      accessor: (refund) => tenantName(refund.tenantId),
      exportValue: (refund) => tenantName(refund.tenantId),
      cell: (refund) => tenantName(refund.tenantId),
      mobile: "primary",
    },
    {
      id: "learner",
      header: "Apprenant / formation",
      accessor: (refund) => `${refund.learnerName} ${refund.learnerEmail} ${refund.courseTitle}`,
      exportValue: (refund) => `${refund.learnerName} - ${refund.courseTitle}`,
      cell: (refund) => (
        <div className="flex flex-col">
          <span className="font-medium">{refund.learnerName}</span>
          <span className="text-xs text-muted-foreground">{refund.courseTitle}</span>
        </div>
      ),
    },
    {
      id: "amount",
      header: "Montant",
      accessor: (refund) => refund.amount,
      exportValue: (refund) => refund.amount,
      cell: (refund) => `${formatNumber(refund.amount)} ${refund.currency}`,
    },
    {
      id: "note",
      header: "Motifs",
      accessor: (refund) => `${refund.reason ?? ""} ${refund.decisionNote ?? ""}`.trim(),
      exportValue: (refund) => `${refund.reason ?? ""} | ${refund.decisionNote ?? ""}`,
      cell: (refund) => (
        <div className="flex flex-col text-sm">
          <span>{refund.reason ?? "—"}</span>
          {refund.decisionNote && <span className="text-xs text-muted-foreground">Entreprise : {refund.decisionNote}</span>}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      accessor: () => "",
      cell: (refund) =>
        canExecute ? (
          <Button size="sm" onClick={() => setExecuting(refund)}>
            Rembourser
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <StatusFilter value={status} onChange={setStatus} />
      <DataTable
        data={data}
        columns={columns}
        getRowId={(refund) => refund.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        title="demandes de remboursement"
        stateKey={`refunds-${status}`}
        searchPlaceholder="Rechercher une demande…"
        initialSort={{ columnId: "requestedAt", direction: "desc" }}
        emptyState={<EmptyState icon={Undo2} message="Aucune demande dans cette file." />}
      />
      <ConfirmDialog
        open={executing !== null}
        onOpenChange={(open) => !open && setExecuting(null)}
        title="Exécuter le remboursement"
        description={
          executing
            ? `Rembourser ${formatNumber(executing.amount)} ${executing.currency} à ${executing.learnerName} via le fournisseur de paiement d’origine. Cette action est irréversible.`
            : ""
        }
        confirmLabel="Rembourser"
        isPending={execute.isPending}
        onConfirm={() => void confirmExecute()}
      />
    </div>
  );
}
