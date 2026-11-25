"use client";

import { Coins } from "lucide-react";

import { BuyCreditPackDialog } from "./BuyCreditPackDialog";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreditBalance,
  useCreditLedger,
  useCreditPacks,
} from "@/features/ai-translation/hooks/useAiTranslation";
import type { LedgerEntry } from "@/features/ai-translation/schemas/ai-translation.schema";
import { CREDIT_LEDGER_LABELS } from "@/features/ai-translation/schemas/ai-translation.schema";
import { formatDateTime } from "@/lib/format";

const formatSigned = (amount: number) => `${amount > 0 ? "+" : ""}${amount.toLocaleString("fr-FR")}`;

const LEDGER_COLUMNS: DataTableColumn<LedgerEntry>[] = [
  {
    id: "createdAt",
    header: "Date",
    accessor: (entry) => entry.createdAt,
    cell: (entry) => <span className="text-muted-foreground">{formatDateTime(entry.createdAt)}</span>,
    mobile: "secondary",
  },
  {
    id: "type",
    header: "Type",
    accessor: (entry) => CREDIT_LEDGER_LABELS[entry.type],
    cell: (entry) => CREDIT_LEDGER_LABELS[entry.type],
    mobile: "primary",
  },
  {
    id: "note",
    header: "Détail",
    accessor: (entry) => entry.note ?? "",
    cell: (entry) => <span className="text-muted-foreground">{entry.note ?? "—"}</span>,
  },
  {
    id: "amount",
    header: "Crédits",
    accessor: (entry) => entry.amount,
    exportValue: (entry) => entry.amount,
    align: "right",
    cell: (entry) => (
      <span className={entry.amount < 0 ? "text-danger" : "text-success"}>{formatSigned(entry.amount)}</span>
    ),
  },
];

function LedgerSection() {
  const ledger = useCreditLedger();

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Mouvements de crédits</h2>
      <DataTable
        data={ledger.data}
        columns={LEDGER_COLUMNS}
        getRowId={(entry) => entry.id}
        isLoading={ledger.isLoading}
        error={ledger.isError ? ledger.error : undefined}
        onRetry={() => void ledger.refetch()}
        title="mouvements-credits"
        stateKey="ai-credits-ledger"
        searchPlaceholder="Rechercher un mouvement…"
        initialSort={{ columnId: "createdAt", direction: "desc" }}
        emptyState={<EmptyState icon={Coins} message="Aucun mouvement de crédits pour le moment." />}
      />
    </div>
  );
}

/** Solde de crédits IA, achat de pack et historique des mouvements (ENT-06, ADM-18). */
export function CreditsPanel() {
  const balance = useCreditBalance();
  const packs = useCreditPacks();
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Crédits IA disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {balance.isLoading && <Skeleton className="h-8 w-24" />}
            {balance.isError && <ErrorBanner title="Solde indisponible." error={balance.error} />}
            {balance.data !== undefined && (
              <p className="text-3xl font-semibold">{balance.data.toLocaleString("fr-FR")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Acheter des crédits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {packs.isLoading && <Skeleton className="h-9 w-40" />}
            {packs.isError && <ErrorBanner title="Packs indisponibles." error={packs.error} />}
            {packs.data && packs.data.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Aucun pack de crédits n&apos;est proposé actuellement.
              </p>
            )}
            {packs.data && packs.data.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {packs.data.map((pack) => (
                  <BuyCreditPackDialog key={pack.id} pack={pack} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <LedgerSection />
    </div>
  );
}
