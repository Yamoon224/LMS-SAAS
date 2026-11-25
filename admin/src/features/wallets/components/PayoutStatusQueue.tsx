"use client";

import { Ban, Banknote, CheckCheck, CheckCircle2, Send } from "lucide-react";
import { useState } from "react";

import { useApprovePayout, useValidatePayout } from "../hooks/usePayoutActions";
import { usePayoutsByStatus } from "../hooks/usePayoutsByStatus";
import type { Payout, PayoutStatus } from "../schemas/wallet.schema";

import { ExecutePayoutDialog } from "./ExecutePayoutDialog";
import { RejectPayoutDialog } from "./RejectPayoutDialog";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/ui/row-actions";
import { useSession } from "@/features/session/hooks/useSession";
import { useTenants } from "@/features/tenants/hooks/useTenants";
import { formatNumber } from "@/lib/format";

interface PayoutStatusQueueProps {
  status: PayoutStatus;
}

type Pending = { kind: "validate" | "approve"; payout: Payout } | null;

/**
 * File des reversements pour un statut donné (ADM-24). Demandé → Valider (payouts.validate), Validé → Approuver
 * (payouts.approve, personne distincte — imposé côté backend) ou Rejeter, Approuvé → Exécuter (payouts.execute) ou Rejeter.
 */
export function PayoutStatusQueue({ status }: PayoutStatusQueueProps) {
  const { data: payouts, isLoading, isError, error, refetch } = usePayoutsByStatus(status);
  const { data: session } = useSession();
  const { data: tenants } = useTenants();
  const validatePayout = useValidatePayout();
  const approvePayout = useApprovePayout();
  const [pending, setPending] = useState<Pending>(null);
  const [executeId, setExecuteId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);

  const granted = new Set(session?.permissions ?? []);
  const tenantName = (id: string) => tenants?.find((tenant) => tenant.id === id)?.name;

  async function confirmPending() {
    if (!pending) return;
    try {
      if (pending.kind === "validate") await validatePayout.mutateAsync(pending.payout.id);
      else await approvePayout.mutateAsync(pending.payout.id);
      setPending(null);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  const renderActions = (payout: Payout) => {
    const canValidate = status === "REQUESTED" && granted.has("payouts.validate");
    const canApprove = status === "VALIDATED" && granted.has("payouts.approve");
    const canExecute = status === "APPROVED" && granted.has("payouts.execute");
    const canReject = (status === "VALIDATED" || status === "APPROVED") && granted.has("payouts.approve");
    if (!canValidate && !canApprove && !canExecute && !canReject) return null;
    return (
      <RowActions label={`Actions pour le reversement de ${formatNumber(payout.amount)}`}>
        {canValidate && (
          <DropdownMenuItem onSelect={() => setPending({ kind: "validate", payout })}>
            <CheckCircle2 /> Valider (opérateur)
          </DropdownMenuItem>
        )}
        {canApprove && (
          <DropdownMenuItem onSelect={() => setPending({ kind: "approve", payout })}>
            <CheckCheck /> Approuver (finance)
          </DropdownMenuItem>
        )}
        {canExecute && (
          <DropdownMenuItem onSelect={() => setExecuteId(payout.id)}>
            <Send /> Exécuter
          </DropdownMenuItem>
        )}
        {canReject && (
          <DropdownMenuItem destructive onSelect={() => setRejectId(payout.id)}>
            <Ban /> Rejeter
          </DropdownMenuItem>
        )}
      </RowActions>
    );
  };

  const columns: DataTableColumn<Payout>[] = [
    {
      id: "tenant",
      header: "Entreprise",
      accessor: (payout) => tenantName(payout.tenantId) ?? "Entreprise",
      cell: (payout) => (
        <>
          <div className="font-medium">{tenantName(payout.tenantId) ?? "Entreprise"}</div>
          <div className="font-mono text-xs text-muted-foreground md:hidden">{payout.tenantId}</div>
        </>
      ),
      mobile: "primary",
    },
    {
      id: "tenantId",
      header: "Identifiant",
      accessor: (payout) => payout.tenantId,
      cell: (payout) => <span className="font-mono text-xs text-muted-foreground">{payout.tenantId}</span>,
      mobile: "hidden",
    },
    {
      id: "amount",
      header: "Montant",
      accessor: (payout) => payout.amount,
      cell: (payout) => <span className="tabular-nums">{formatNumber(payout.amount)}</span>,
      align: "right",
    },
  ];

  const isValidate = pending?.kind === "validate";

  return (
    <>
      <DataTable
        data={payouts}
        columns={columns}
        getRowId={(payout) => payout.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        errorTitle="Impossible de charger les reversements."
        title={`reversements-${status.toLowerCase()}`}
        searchPlaceholder="Rechercher une entreprise, un identifiant…"
        stateKey={`payouts-${status.toLowerCase()}`}
        rowActions={renderActions}
        emptyState={<EmptyState icon={Banknote} message="Aucun reversement dans cette file." />}
      />

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={isValidate ? "Valider ce reversement ?" : "Approuver ce reversement ?"}
        description={
          isValidate
            ? "Première validation (opérateur). Une seconde personne, côté finance, devra l’approuver avant exécution."
            : "Seconde validation (finance). Elle doit être faite par une personne distincte de celle qui a validé ; le backend refuse sinon."
        }
        confirmLabel={isValidate ? "Valider" : "Approuver"}
        destructive={false}
        onConfirm={() => void confirmPending()}
        isPending={validatePayout.isPending || approvePayout.isPending}
      />
      <ExecutePayoutDialog payoutId={executeId} onOpenChange={(open) => !open && setExecuteId(null)} />
      <RejectPayoutDialog payoutId={rejectId} onOpenChange={(open) => !open && setRejectId(null)} />
    </>
  );
}
