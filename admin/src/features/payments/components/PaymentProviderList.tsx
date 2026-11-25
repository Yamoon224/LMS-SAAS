"use client";

import { CreditCard, Pencil, Power, Trash2 } from "lucide-react";
import { useState } from "react";

import { useDeleteProvider } from "../hooks/useDeleteProvider";
import { usePaymentProviders } from "../hooks/usePaymentProviders";
import { useToggleProvider } from "../hooks/useToggleProvider";
import type { PaymentProviderConfig } from "../schemas/payment-provider.schema";
import { PAYMENT_METHOD_LABELS, PAYMENT_PROVIDER_CODE_LABELS } from "../schemas/payment-provider.schema";

import { ProviderConfigDialog } from "./ProviderConfigDialog";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/ui/row-actions";

interface PaymentProviderListProps {
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
}

function methodsOf(provider: PaymentProviderConfig): string {
  return provider.supportedMethods.map((method) => PAYMENT_METHOD_LABELS[method]).join(", ") || "—";
}

function StatusBadges({ provider }: { provider: PaymentProviderConfig }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Badge variant={provider.isActive ? "success" : "secondary"}>{provider.isActive ? "Actif" : "Inactif"}</Badge>
      <Badge variant={provider.isTestMode ? "warning" : "info"}>{provider.isTestMode ? "Test" : "Production"}</Badge>
    </span>
  );
}

/** ADM-20: fournisseurs de paiement configurés, avec activation/désactivation rapide. */
export function PaymentProviderList({ createOpen, onCreateOpenChange }: PaymentProviderListProps) {
  const { data: providers, isLoading, isError, error, refetch } = usePaymentProviders();
  const toggleProvider = useToggleProvider();
  const deleteProvider = useDeleteProvider();
  const [editing, setEditing] = useState<PaymentProviderConfig | null>(null);
  const [deleting, setDeleting] = useState<PaymentProviderConfig | null>(null);

  const renderActions = (provider: PaymentProviderConfig) => (
    <RowActions label={`Actions pour ${provider.label}`}>
      <DropdownMenuItem onSelect={() => setEditing(provider)}>
        <Pencil /> Modifier
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => toggleProvider.mutate({ code: provider.code, isActive: !provider.isActive })}
      >
        <Power /> {provider.isActive ? "Désactiver" : "Activer"}
      </DropdownMenuItem>
      <DropdownMenuItem destructive onSelect={() => setDeleting(provider)}>
        <Trash2 /> Supprimer
      </DropdownMenuItem>
    </RowActions>
  );

  const columns: DataTableColumn<PaymentProviderConfig>[] = [
    {
      id: "provider",
      header: "Fournisseur",
      accessor: (provider) => PAYMENT_PROVIDER_CODE_LABELS[provider.code],
      cell: (provider) => <span className="font-medium">{PAYMENT_PROVIDER_CODE_LABELS[provider.code]}</span>,
      mobile: "primary",
    },
    {
      id: "label",
      header: "Libellé",
      accessor: (provider) => provider.label,
      cell: (provider) => <span className="text-muted-foreground">{provider.label}</span>,
    },
    {
      id: "methods",
      header: "Moyens pris en charge",
      accessor: (provider) => methodsOf(provider),
      cell: (provider) => <span className="text-xs text-muted-foreground">{methodsOf(provider)}</span>,
    },
    {
      id: "priority",
      header: "Priorité",
      accessor: (provider) => provider.priority,
      cell: (provider) => provider.priority,
    },
    {
      id: "status",
      header: "Statut",
      accessor: (provider) => `${provider.isActive ? "Actif" : "Inactif"} · ${provider.isTestMode ? "Test" : "Production"}`,
      cell: (provider) => <StatusBadges provider={provider} />,
    },
  ];

  return (
    <>
      <DataTable
        data={providers}
        columns={columns}
        getRowId={(provider) => provider.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        errorTitle="Impossible de charger les fournisseurs de paiement."
        title="fournisseurs-paiement"
        searchPlaceholder="Rechercher un fournisseur…"
        stateKey="payment-providers"
        initialSort={{ columnId: "priority", direction: "asc" }}
        rowActions={renderActions}
        emptyState={
          <EmptyState
            icon={CreditCard}
            message="Aucun fournisseur de paiement configuré. Configurez-en un pour permettre les paiements en ligne."
          />
        }
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Supprimer « ${deleting?.label ?? ""} » ?`}
        description={`La configuration de ce fournisseur et ses clés seront supprimées définitivement.${
          deleting?.isActive ? " Il est actuellement actif : les paiements en ligne qui passent par lui ne seront plus possibles." : ""
        } Si des paiements ont déjà transité par lui, la suppression sera refusée : désactivez-le plutôt.`}
        confirmLabel="Supprimer"
        isPending={deleteProvider.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteProvider.mutate(deleting.code, { onSettled: () => setDeleting(null) });
        }}
      />

      <ProviderConfigDialog
        open={createOpen || editing !== null}
        existingConfig={editing ?? undefined}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            onCreateOpenChange(false);
          }
        }}
      />
    </>
  );
}
