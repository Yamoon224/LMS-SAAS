"use client";

import { Banknote, Download } from "lucide-react";

import { RequestPayoutDialog } from "./RequestPayoutDialog";
import { TransactionHistory } from "./TransactionHistory";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { payoutStatementUrl } from "@/features/wallet/api/wallet.api";
import { usePayouts, useWalletBalance } from "@/features/wallet/hooks/useWallet";
import { PAYOUT_DESTINATION_LABELS, PAYOUT_STATUS_LABELS } from "@/features/wallet/schemas/wallet.schema";
import type { PayoutItem, PayoutStatus } from "@/features/wallet/schemas/wallet.schema";
import { formatAmount, formatDate } from "@/lib/format";

const PAYOUT_VARIANTS: Record<PayoutStatus, BadgeProps["variant"]> = {
  REQUESTED: "warning",
  VALIDATED: "warning",
  APPROVED: "default",
  EXECUTED: "success",
  REJECTED: "danger",
};

function BalanceCards() {
  const { data: balance, isLoading, isError, error } = useWalletBalance();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (isError || !balance) {
    return <ErrorBanner title="Impossible de charger le solde." error={error} />;
  }

  const cards = [
    { label: "Disponible", value: balance.availableAmount, hint: "Reversable maintenant" },
    { label: "En attente", value: balance.pendingAmount, hint: "Période de rétention en cours" },
    { label: "Déjà reversé", value: balance.payoutsExecutedAmount, hint: "Reversements exécutés" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight">{formatAmount(card.value, balance.currency)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div>
        <RequestPayoutDialog availableAmount={balance.availableAmount} currency={balance.currency} />
      </div>
    </div>
  );
}

const PAYOUT_COLUMNS: DataTableColumn<PayoutItem>[] = [
  {
    id: "requestedAt",
    header: "Demandé le",
    accessor: (payout) => payout.requestedAt,
    cell: (payout) => <span className="text-muted-foreground">{formatDate(payout.requestedAt)}</span>,
    mobile: "secondary",
  },
  {
    id: "amount",
    header: "Montant",
    accessor: (payout) => payout.amount,
    exportValue: (payout) => payout.amount,
    cell: (payout) => <span className="font-medium">{formatAmount(payout.amount, payout.currency)}</span>,
    mobile: "primary",
  },
  {
    id: "destination",
    header: "Destination",
    accessor: (payout) =>
      `${payout.accountName} ${PAYOUT_DESTINATION_LABELS[payout.destinationType]} ${payout.accountNumberMasked}`,
    exportValue: (payout) =>
      `${payout.accountName} - ${PAYOUT_DESTINATION_LABELS[payout.destinationType]} ${payout.accountNumberMasked}`,
    cell: (payout) => (
      <div className="flex flex-col">
        <span>{payout.accountName}</span>
        <span className="text-xs text-muted-foreground">
          {PAYOUT_DESTINATION_LABELS[payout.destinationType]} {payout.accountNumberMasked}
        </span>
      </div>
    ),
  },
  {
    id: "status",
    header: "Statut",
    accessor: (payout) => `${PAYOUT_STATUS_LABELS[payout.status]} ${payout.rejectionReason ?? ""}`.trim(),
    exportValue: (payout) =>
      payout.status === "REJECTED" && payout.rejectionReason
        ? `${PAYOUT_STATUS_LABELS[payout.status]} (${payout.rejectionReason})`
        : PAYOUT_STATUS_LABELS[payout.status],
    cell: (payout) => (
      <div className="flex flex-col items-start gap-1">
        <Badge variant={PAYOUT_VARIANTS[payout.status]}>{PAYOUT_STATUS_LABELS[payout.status]}</Badge>
        {payout.status === "REJECTED" && payout.rejectionReason && (
          <span className="text-xs text-muted-foreground">{payout.rejectionReason}</span>
        )}
      </div>
    ),
  },
  {
    id: "statement",
    header: "Relevé",
    accessor: () => "",
    cell: (payout) =>
      payout.status === "EXECUTED" ? (
        <Button asChild variant="outline" size="sm">
          <a href={payoutStatementUrl(payout.id)} download aria-label={`Télécharger le relevé du reversement de ${formatAmount(payout.amount, payout.currency)}`}>
            <Download className="h-4 w-4" aria-hidden="true" />
            PDF
          </a>
        </Button>
      ) : null,
  },
];

function PayoutHistory() {
  const { data: payouts, isLoading, isError, error, refetch } = usePayouts();

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Historique des reversements</h2>
      <DataTable
        data={payouts}
        columns={PAYOUT_COLUMNS}
        getRowId={(payout) => payout.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        title="reversements"
        stateKey="wallet-payouts"
        searchPlaceholder="Rechercher un reversement…"
        initialSort={{ columnId: "requestedAt", direction: "desc" }}
        emptyState={<EmptyState icon={Banknote} message="Aucun reversement demandé pour le moment." />}
      />
    </div>
  );
}

/** Portefeuille & reversements (ENT-11, ENT-68, ENT-69): solde, demande de reversement, historique. */
export function WalletPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paiements / Portefeuille</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Solde de vos ventes et reversements vers vos coordonnées bancaires.
        </p>
      </div>
      <BalanceCards />
      <TransactionHistory />
      <PayoutHistory />
    </div>
  );
}
