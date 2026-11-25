"use client";

import { Receipt } from "lucide-react";
import { useState } from "react";

import { TenantFilter } from "./TenantFilter";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { useSupervisedTransactions } from "@/features/supervision/hooks/useSupervision";
import {
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
} from "@/features/supervision/schemas/supervision.schema";
import type { SupervisedTransaction } from "@/features/supervision/schemas/supervision.schema";
import { formatAmount, formatDateTime } from "@/lib/format";

const STATUS_VARIANTS: Record<SupervisedTransaction["status"], BadgeProps["variant"]> = {
  PENDING: "warning",
  SUCCEEDED: "success",
  FAILED: "danger",
  REFUNDED: "secondary",
  PARTIALLY_REFUNDED: "warning",
};

const COLUMNS: DataTableColumn<SupervisedTransaction>[] = [
  {
    id: "createdAt",
    header: "Date",
    accessor: (tx) => tx.createdAt,
    exportValue: (tx) => formatDateTime(tx.createdAt),
    cell: (tx) => <span className="text-muted-foreground">{formatDateTime(tx.createdAt)}</span>,
    mobile: "secondary",
  },
  {
    id: "tenant",
    header: "Entreprise / référence",
    accessor: (tx) => `${tx.tenantName} ${tx.providerReference}`,
    exportValue: (tx) => `${tx.tenantName} - ${tx.providerReference}`,
    cell: (tx) => (
      <div className="flex flex-col">
        <span className="font-medium">{tx.tenantName}</span>
        <span className="font-mono text-xs text-muted-foreground">{tx.providerReference}</span>
      </div>
    ),
    mobile: "primary",
  },
  {
    id: "type",
    header: "Type",
    accessor: (tx) => TRANSACTION_TYPE_LABELS[tx.type],
    exportValue: (tx) => TRANSACTION_TYPE_LABELS[tx.type],
    cell: (tx) => TRANSACTION_TYPE_LABELS[tx.type],
  },
  {
    id: "method",
    header: "Moyen",
    accessor: (tx) => tx.method,
    exportValue: (tx) => tx.method,
    cell: (tx) => tx.method,
  },
  {
    id: "amount",
    header: "Montant",
    accessor: (tx) => tx.amount,
    exportValue: (tx) => tx.amount,
    cell: (tx) => <span className="font-medium">{formatAmount(tx.amount, tx.currency)}</span>,
  },
  {
    id: "fee",
    header: "Frais fournisseur",
    accessor: (tx) => tx.providerFee,
    exportValue: (tx) => tx.providerFee,
    cell: (tx) => formatAmount(tx.providerFee, tx.currency),
  },
  {
    id: "status",
    header: "Statut",
    accessor: (tx) => TRANSACTION_STATUS_LABELS[tx.status],
    exportValue: (tx) => TRANSACTION_STATUS_LABELS[tx.status],
    cell: (tx) => <Badge variant={STATUS_VARIANTS[tx.status]}>{TRANSACTION_STATUS_LABELS[tx.status]}</Badge>,
  },
];

/** ADM-32 : tous les paiements (abonnements, crédits IA, ventes de formations), exportables. */
export function TransactionsSupervision() {
  const [tenantId, setTenantId] = useState<string | undefined>();
  const { data, isLoading, isError, error, refetch } = useSupervisedTransactions(tenantId);

  return (
    <div className="flex flex-col gap-4">
      <TenantFilter value={tenantId} onChange={setTenantId} />
      <DataTable
        data={data}
        columns={COLUMNS}
        getRowId={(tx) => tx.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        title="transactions"
        stateKey="supervision-transactions"
        searchPlaceholder="Rechercher par entreprise ou référence…"
        initialSort={{ columnId: "createdAt", direction: "desc" }}
        emptyState={<EmptyState icon={Receipt} message="Aucun paiement." />}
      />
    </div>
  );
}
