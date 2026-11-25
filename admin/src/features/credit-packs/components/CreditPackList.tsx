"use client";

import { Archive, Sparkles } from "lucide-react";
import { useState } from "react";

import { useArchiveCreditPack } from "../hooks/useArchiveCreditPack";
import { useCreditPacks } from "../hooks/useCreditPacks";
import type { CreditPack } from "../schemas/credit-pack.schema";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/ui/row-actions";
import { formatAmount, formatNumber } from "@/lib/format";

function PackBadge({ pack }: { pack: CreditPack }) {
  return <Badge variant={pack.isArchived ? "danger" : "success"}>{pack.isArchived ? "Archivé" : "Actif"}</Badge>;
}

export function CreditPackList({ toolbarActions }: { toolbarActions?: React.ReactNode }) {
  const { data: packs, isLoading, isError, error, refetch } = useCreditPacks();
  const archiveCreditPack = useArchiveCreditPack();
  const [archiveFor, setArchiveFor] = useState<CreditPack | null>(null);

  async function confirmArchive() {
    if (!archiveFor) return;
    try {
      await archiveCreditPack.mutateAsync(archiveFor.id);
      setArchiveFor(null);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  const renderActions = (pack: CreditPack) =>
    pack.isArchived ? null : (
      <RowActions label={`Actions pour le pack ${pack.name}`}>
        <DropdownMenuItem destructive onSelect={() => setArchiveFor(pack)}>
          <Archive /> Archiver
        </DropdownMenuItem>
      </RowActions>
    );

  const columns: DataTableColumn<CreditPack>[] = [
    {
      id: "name",
      header: "Pack",
      accessor: (pack) => pack.name,
      cell: (pack) => <span className="font-medium">{pack.name}</span>,
      mobile: "primary",
    },
    {
      id: "credits",
      header: "Crédits",
      accessor: (pack) => pack.creditsAmount,
      cell: (pack) => <span className="tabular-nums">{formatNumber(pack.creditsAmount)}</span>,
    },
    {
      id: "price",
      header: "Prix",
      accessor: (pack) => pack.price,
      cell: (pack) => <span className="tabular-nums">{formatAmount(pack.price, pack.currency)}</span>,
    },
    {
      id: "currency",
      header: "Devise",
      accessor: (pack) => pack.currency,
      cell: (pack) => pack.currency,
      defaultHidden: true,
      mobile: "hidden",
    },
    {
      id: "status",
      header: "Statut",
      accessor: (pack) => (pack.isArchived ? "Archivé" : "Actif"),
      cell: (pack) => <PackBadge pack={pack} />,
    },
  ];

  return (
    <>
      <DataTable
        data={packs}
        columns={columns}
        getRowId={(pack) => pack.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        errorTitle="Impossible de charger les packs de crédits IA."
        title="packs-credits-ia"
        searchPlaceholder="Rechercher un pack…"
        stateKey="credit-packs"
        toolbarActions={toolbarActions}
        rowActions={renderActions}
        emptyState={<EmptyState icon={Sparkles} message="Aucun pack de crédits IA pour le moment." />}
      />

      <ConfirmDialog
        open={archiveFor !== null}
        onOpenChange={(open) => !open && setArchiveFor(null)}
        title={`Archiver ${archiveFor?.name ?? "ce pack"} ?`}
        description="Le pack ne sera plus proposé à l’achat. Les crédits déjà achetés ne sont pas affectés."
        confirmLabel="Archiver le pack"
        onConfirm={() => void confirmArchive()}
        isPending={archiveCreditPack.isPending}
      />
    </>
  );
}
