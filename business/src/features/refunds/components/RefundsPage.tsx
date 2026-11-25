"use client";

import { Undo2 } from "lucide-react";
import { useState } from "react";

import { AcceptRefundDialog } from "./AcceptRefundDialog";
import { RejectRefundDialog } from "./RejectRefundDialog";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useRefunds } from "@/features/refunds/hooks/useRefunds";
import { eligibilityCriteria, REFUND_STATUS_LABELS } from "@/features/refunds/schemas/refund.schema";
import type { RefundRequest, RefundStatus } from "@/features/refunds/schemas/refund.schema";
import { formatAmount, formatDate } from "@/lib/format";

const STATUS_VARIANTS: Record<RefundStatus, BadgeProps["variant"]> = {
  REQUESTED: "warning",
  ACCEPTED: "info",
  REFUNDED: "success",
  REJECTED: "danger",
};

/** Détail des critères de la politique (section 9.5) : remplis / non remplis. */
function EligibilityDetail({ refund }: { refund: RefundRequest }) {
  if (!refund.eligibility) return null;
  return (
    <ul className="mt-1 flex flex-col gap-0.5 text-xs" aria-label="Critères de la politique de remboursement">
      {eligibilityCriteria(refund.eligibility).map((criterion) => (
        <li key={criterion.label} className={criterion.met ? "text-success" : "text-danger"}>
          <span aria-hidden="true">{criterion.met ? "✓" : "✗"}</span>{" "}
          <span className="sr-only">{criterion.met ? "Rempli : " : "Non rempli : "}</span>
          {criterion.label}
        </li>
      ))}
    </ul>
  );
}

function buildColumns(
  onAccept: (refund: RefundRequest) => void,
  onReject: (id: string) => void,
): DataTableColumn<RefundRequest>[] {
  return [
    {
      id: "requestedAt",
      header: "Demandée le",
      accessor: (refund) => refund.requestedAt,
      exportValue: (refund) => formatDate(refund.requestedAt),
      cell: (refund) => <span className="text-muted-foreground">{formatDate(refund.requestedAt)}</span>,
      mobile: "secondary",
    },
    {
      id: "learner",
      header: "Apprenant / formation",
      accessor: (refund) => `${refund.learnerName} ${refund.learnerEmail} ${refund.courseTitle}`,
      exportValue: (refund) => `${refund.learnerName} - ${refund.courseTitle}`,
      cell: (refund) => (
        <div className="flex flex-col">
          <span className="font-medium">{refund.learnerName}</span>
          <span className="text-xs text-muted-foreground">
            {refund.courseTitle} · {refund.learnerEmail}
          </span>
        </div>
      ),
      mobile: "primary",
    },
    {
      id: "amount",
      header: "Montant",
      accessor: (refund) => refund.amount,
      exportValue: (refund) => refund.amount,
      cell: (refund) => formatAmount(refund.amount, refund.currency),
    },
    {
      id: "reason",
      header: "Motif",
      accessor: (refund) => refund.reason ?? "",
      exportValue: (refund) => refund.reason ?? "",
      cell: (refund) => (
        <div className="flex flex-col gap-1">
          <span>{refund.reason ?? "—"}</span>
          {!refund.eligibility && refund.withinAutomaticWindow && refund.status === "REQUESTED" && (
            <span className="text-xs text-success">Dans les 7 jours : remboursement intégral recommandé</span>
          )}
          <EligibilityDetail refund={refund} />
        </div>
      ),
    },
    {
      id: "status",
      header: "Statut",
      accessor: (refund) => REFUND_STATUS_LABELS[refund.status],
      exportValue: (refund) => REFUND_STATUS_LABELS[refund.status],
      cell: (refund) => (
        <div className="flex flex-col items-start gap-1">
          <Badge variant={STATUS_VARIANTS[refund.status]}>{REFUND_STATUS_LABELS[refund.status]}</Badge>
          {refund.autoAccepted && (
            <span className="text-xs text-muted-foreground">
              Acceptée automatiquement (politique remplie) : vous ne pouvez plus la refuser.
            </span>
          )}
          {refund.status === "REJECTED" && refund.decisionNote && (
            <span className="text-xs text-muted-foreground">{refund.decisionNote}</span>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      accessor: () => "",
      cell: (refund) =>
        refund.status === "REQUESTED" ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onAccept(refund)}>
              Accepter
            </Button>
            <Button size="sm" variant="outline" onClick={() => onReject(refund.id)}>
              Refuser
            </Button>
          </div>
        ) : null,
    },
  ];
}

/** ENT-70 : examen des demandes de remboursement des apprenants (acceptation ou refus motivé). */
export function RefundsPage() {
  const { data, isLoading, isError, error, refetch } = useRefunds();
  const [accepting, setAccepting] = useState<RefundRequest | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Remboursements"
        description="Demandes des apprenants pour les formations achetées en ligne. Après acceptation, l’administrateur exécute le remboursement."
      />
      <DataTable
        data={data}
        columns={buildColumns(setAccepting, setRejectingId)}
        getRowId={(refund) => refund.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        title="demandes de remboursement"
        stateKey="refunds"
        searchPlaceholder="Rechercher une demande…"
        initialSort={{ columnId: "requestedAt", direction: "desc" }}
        emptyState={<EmptyState icon={Undo2} message="Aucune demande de remboursement." />}
      />
      <AcceptRefundDialog refund={accepting} onOpenChange={(open) => !open && setAccepting(null)} />
      <RejectRefundDialog refundId={rejectingId} onOpenChange={(open) => !open && setRejectingId(null)} />
    </div>
  );
}
