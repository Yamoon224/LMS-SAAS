"use client";

import { Download, Receipt } from "lucide-react";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { invoicePdfUrl } from "@/features/subscription/api/subscription.api";
import { useInvoices } from "@/features/subscription/hooks/useSubscription";
import { INVOICE_STATUS_LABELS } from "@/features/subscription/schemas/subscription.schema";
import type { Invoice, InvoiceStatus } from "@/features/subscription/schemas/subscription.schema";
import { formatAmount, formatDate } from "@/lib/format";

const STATUS_VARIANTS: Record<InvoiceStatus, BadgeProps["variant"]> = {
  SUCCEEDED: "success",
  REFUNDED: "secondary",
  PARTIALLY_REFUNDED: "warning",
};

const COLUMNS: DataTableColumn<Invoice>[] = [
  {
    id: "issuedAt",
    header: "Date",
    accessor: (invoice) => invoice.issuedAt,
    cell: (invoice) => <span className="text-muted-foreground">{formatDate(invoice.issuedAt)}</span>,
    mobile: "secondary",
  },
  {
    id: "number",
    header: "Facture",
    accessor: (invoice) => invoice.number,
    exportValue: (invoice) => invoice.number,
    cell: (invoice) => <span className="font-medium">{invoice.number}</span>,
    mobile: "primary",
  },
  {
    id: "description",
    header: "Description",
    accessor: (invoice) => invoice.description,
    exportValue: (invoice) => invoice.description,
    cell: (invoice) => invoice.description,
  },
  {
    id: "amount",
    header: "Montant",
    accessor: (invoice) => invoice.amount,
    exportValue: (invoice) => invoice.amount,
    cell: (invoice) => formatAmount(invoice.amount, invoice.currency),
  },
  {
    id: "status",
    header: "Statut",
    accessor: (invoice) => INVOICE_STATUS_LABELS[invoice.status],
    exportValue: (invoice) => INVOICE_STATUS_LABELS[invoice.status],
    cell: (invoice) => <Badge variant={STATUS_VARIANTS[invoice.status]}>{INVOICE_STATUS_LABELS[invoice.status]}</Badge>,
  },
  {
    id: "pdf",
    header: "PDF",
    accessor: () => "",
    cell: (invoice) => (
      <Button asChild variant="outline" size="sm">
        <a
          href={invoicePdfUrl(invoice.paymentId)}
          download
          aria-label={`Télécharger la facture ${invoice.number}`}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          PDF
        </a>
      </Button>
    ),
  },
];

/** ENT-05 : historique des paiements avec téléchargement des factures PDF. */
export function InvoiceHistory() {
  const { data, isLoading, isError, error, refetch } = useInvoices();

  return (
    <section className="flex flex-col gap-3" aria-labelledby="invoices-title">
      <h2 id="invoices-title" className="text-lg font-semibold">
        Factures
      </h2>
      <DataTable
        data={data}
        columns={COLUMNS}
        getRowId={(invoice) => invoice.paymentId}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        title="factures"
        stateKey="subscription-invoices"
        searchPlaceholder="Rechercher une facture…"
        initialSort={{ columnId: "issuedAt", direction: "desc" }}
        emptyState={<EmptyState icon={Receipt} message="Aucun paiement enregistré pour le moment." />}
      />
    </section>
  );
}
