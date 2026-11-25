"use client";

import { Receipt } from "lucide-react";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useTransactions } from "@/features/wallet/hooks/useWallet";
import { TRANSACTION_CHANNEL_LABELS } from "@/features/wallet/schemas/wallet.schema";
import type { Transaction } from "@/features/wallet/schemas/wallet.schema";
import { formatAmount, formatDate } from "@/lib/format";

function amountOrDash(value: number | null, currency: string): string {
  return value === null ? "—" : formatAmount(value, currency);
}

const COLUMNS: DataTableColumn<Transaction>[] = [
  {
    id: "occurredAt",
    header: "Date",
    accessor: (tx) => tx.occurredAt,
    exportValue: (tx) => formatDate(tx.occurredAt),
    cell: (tx) => <span className="text-muted-foreground">{formatDate(tx.occurredAt)}</span>,
    mobile: "secondary",
  },
  {
    id: "course",
    header: "Formation",
    accessor: (tx) => `${tx.courseTitle} ${tx.reference}`,
    exportValue: (tx) => tx.courseTitle,
    cell: (tx) => (
      <div className="flex flex-col">
        <span className="font-medium">{tx.courseTitle}</span>
        <span className="text-xs text-muted-foreground">{tx.reference}</span>
      </div>
    ),
    mobile: "primary",
  },
  {
    id: "channel",
    header: "Canal",
    accessor: (tx) => TRANSACTION_CHANNEL_LABELS[tx.channel],
    exportValue: (tx) => TRANSACTION_CHANNEL_LABELS[tx.channel],
    cell: (tx) => (
      <Badge variant={tx.channel === "ONLINE" ? "default" : "secondary"}>{TRANSACTION_CHANNEL_LABELS[tx.channel]}</Badge>
    ),
  },
  {
    id: "gross",
    header: "Brut",
    accessor: (tx) => tx.gross,
    exportValue: (tx) => tx.gross,
    cell: (tx) => formatAmount(tx.gross, tx.currency),
  },
  {
    id: "commission",
    header: "Commission",
    accessor: (tx) => tx.commission ?? -1,
    exportValue: (tx) => tx.commission ?? "",
    cell: (tx) => amountOrDash(tx.commission, tx.currency),
  },
  {
    id: "fee",
    header: "Frais",
    accessor: (tx) => tx.fee,
    exportValue: (tx) => tx.fee,
    cell: (tx) => formatAmount(tx.fee, tx.currency),
  },
  {
    id: "net",
    header: "Net",
    accessor: (tx) => tx.net ?? -1,
    exportValue: (tx) => tx.net ?? "",
    cell: (tx) => <span className="font-medium">{amountOrDash(tx.net, tx.currency)}</span>,
  },
];

/** ENT-68 : historique des ventes en ligne et des paiements hors plateforme validés (export CSV/Excel). */
export function TransactionHistory() {
  const { data, isLoading, isError, error, refetch } = useTransactions();

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Transactions</h2>
      <DataTable
        data={data}
        columns={COLUMNS}
        getRowId={(tx) => `${tx.channel}-${tx.id}`}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        title="transactions"
        stateKey="wallet-transactions"
        searchPlaceholder="Rechercher une transaction…"
        initialSort={{ columnId: "occurredAt", direction: "desc" }}
        emptyState={<EmptyState icon={Receipt} message="Aucune vente enregistrée pour le moment." />}
      />
    </div>
  );
}
