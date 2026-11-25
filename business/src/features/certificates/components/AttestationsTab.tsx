"use client";

import { Download, FileCheck2, ShieldOff } from "lucide-react";
import { useMemo, useState } from "react";

import { RevokeCertificateDialog } from "./RevokeCertificateDialog";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/ui/row-actions";
import { useAttestationActions, useAttestations } from "@/features/certificates/hooks/useAttestations";
import { ATTESTATION_STATUS_LABELS } from "@/features/certificates/schemas/attestation.schema";
import type { AttestationListItem } from "@/features/certificates/schemas/attestation.schema";
import { formatDate } from "@/lib/format";

function StatusCell({ attestation }: { attestation: AttestationListItem }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant={attestation.status === "VALID" ? "success" : "danger"}>
        {ATTESTATION_STATUS_LABELS[attestation.status]}
      </Badge>
      {attestation.status === "REVOKED" && attestation.revocationReason && (
        <span className="text-xs text-muted-foreground">{attestation.revocationReason}</span>
      )}
    </div>
  );
}

/** Attestations de suivi délivrées (ENT-44) : recherche, tableau (≥ md) / cartes (mobile), révocation motivée. */
export function AttestationsTab() {
  const { data: attestations, isLoading, isError, error, refetch } = useAttestations();
  const { revoke, download } = useAttestationActions();
  const [revokeTarget, setRevokeTarget] = useState<AttestationListItem | null>(null);

  const renderActions = (attestation: AttestationListItem) => (
    <RowActions label={`Actions pour l'attestation ${attestation.number}`}>
      <DropdownMenuItem onSelect={() => download.mutate(attestation.id)}>
        <Download /> Télécharger le PDF
      </DropdownMenuItem>
      {attestation.status === "VALID" && (
        <DropdownMenuItem destructive onSelect={() => setRevokeTarget(attestation)}>
          <ShieldOff /> Révoquer
        </DropdownMenuItem>
      )}
    </RowActions>
  );

  const columns = useMemo<DataTableColumn<AttestationListItem>[]>(
    () => [
      {
        id: "number",
        header: "Numéro",
        accessor: (a) => a.number,
        cell: (a) => <span className="font-mono text-xs">{a.number}</span>,
        hideable: false,
        mobile: "secondary",
      },
      {
        id: "learner",
        header: "Apprenant",
        accessor: (a) => a.learnerName,
        cell: (a) => a.learnerName,
        mobile: "primary",
      },
      { id: "course", header: "Formation", accessor: (a) => a.courseTitle, cell: (a) => a.courseTitle },
      {
        id: "issuedAt",
        header: "Délivrée le",
        accessor: (a) => a.issuedAt,
        cell: (a) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(new Date(a.issuedAt))}</span>,
      },
      {
        id: "progress",
        header: "Progression (%)",
        accessor: (a) => a.progressPercent,
        exportValue: (a) => a.progressPercent,
        cell: (a) => `${a.progressPercent} %`,
        align: "right",
      },
      {
        id: "status",
        header: "Statut",
        accessor: (a) => `${ATTESTATION_STATUS_LABELS[a.status]} ${a.revocationReason ?? ""}`.trim(),
        exportValue: (a) =>
          a.status === "REVOKED" && a.revocationReason
            ? `${ATTESTATION_STATUS_LABELS[a.status]} (${a.revocationReason})`
            : ATTESTATION_STATUS_LABELS[a.status],
        cell: (a) => <StatusCell attestation={a} />,
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        data={attestations}
        columns={columns}
        getRowId={(a) => a.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        title="attestations"
        stateKey="attestations"
        searchPlaceholder="Rechercher une attestation, un apprenant…"
        initialSort={{ columnId: "issuedAt", direction: "desc" }}
        rowActions={renderActions}
        emptyState={
          <EmptyState
            icon={FileCheck2}
            message="Aucune attestation de suivi délivrée. Elles sont émises automatiquement à la fin d'une formation non certifiante."
          />
        }
      />

      {revokeTarget && (
        <RevokeCertificateDialog
          key={revokeTarget.id}
          open
          onOpenChange={(open) => !open && setRevokeTarget(null)}
          certificateNumber={revokeTarget.number}
          documentLabel="l'attestation"
          onRevoke={(values) => revoke.mutateAsync({ attestationId: revokeTarget.id, reason: values.reason })}
        />
      )}
    </div>
  );
}
