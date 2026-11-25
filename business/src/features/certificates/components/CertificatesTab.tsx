"use client";

import { Award, Download, RefreshCw, ShieldOff } from "lucide-react";
import { useMemo, useState } from "react";

import { CertificateStatusBadge } from "./CertificateStatusBadge";
import { RevokeCertificateDialog } from "./RevokeCertificateDialog";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/ui/row-actions";
import { useCertificateActions, useCertificates } from "@/features/certificates/hooks/useCertificates";
import { CERTIFICATE_STATUS_LABELS } from "@/features/certificates/schemas/certificate.schema";
import type { CertificateListItem } from "@/features/certificates/schemas/certificate.schema";
import { formatDate } from "@/lib/format";

function StatusCell({ certificate }: { certificate: CertificateListItem }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <CertificateStatusBadge status={certificate.status} />
      {certificate.status === "REVOKED" && certificate.revocationReason && (
        <span className="text-xs text-muted-foreground">{certificate.revocationReason}</span>
      )}
    </div>
  );
}

/** Certificats émis (ENT-38 à ENT-45) : tableau (≥ md) / cartes (mobile), actions en menu. */
export function CertificatesTab() {
  const { data: certificates, isLoading, isError, error, refetch } = useCertificates();
  const { revoke, reissue, download } = useCertificateActions();
  const [revokeTarget, setRevokeTarget] = useState<CertificateListItem | null>(null);

  const renderActions = (certificate: CertificateListItem) => (
    <RowActions label={`Actions pour le certificat ${certificate.number}`}>
      <DropdownMenuItem onSelect={() => download.mutate(certificate.id)}>
        <Download /> Télécharger le PDF
      </DropdownMenuItem>
      {certificate.status === "VALID" && (
        <>
          <DropdownMenuItem onSelect={() => reissue.mutate(certificate.id)}>
            <RefreshCw /> Réémettre
          </DropdownMenuItem>
          <DropdownMenuItem destructive onSelect={() => setRevokeTarget(certificate)}>
            <ShieldOff /> Révoquer
          </DropdownMenuItem>
        </>
      )}
    </RowActions>
  );

  const columns = useMemo<DataTableColumn<CertificateListItem>[]>(
    () => [
      {
        id: "number",
        header: "Numéro",
        accessor: (c) => c.number,
        cell: (c) => <span className="font-mono text-xs">{c.number}</span>,
        hideable: false,
        mobile: "secondary",
      },
      {
        id: "learner",
        header: "Apprenant",
        accessor: (c) => c.learnerName,
        cell: (c) => c.learnerName,
        mobile: "primary",
      },
      { id: "course", header: "Formation", accessor: (c) => c.courseTitle, cell: (c) => c.courseTitle },
      {
        id: "issuedAt",
        header: "Émis le",
        accessor: (c) => c.issuedAt,
        cell: (c) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(c.issuedAt)}</span>,
      },
      {
        id: "score",
        header: "Score (%)",
        accessor: (c) => c.scorePercent ?? null,
        exportValue: (c) => c.scorePercent ?? null,
        cell: (c) => (c.scorePercent == null ? "—" : `${c.scorePercent} %`),
        defaultHidden: true,
        align: "right",
      },
      {
        id: "status",
        header: "Statut",
        accessor: (c) => `${CERTIFICATE_STATUS_LABELS[c.status]} ${c.revocationReason ?? ""}`.trim(),
        exportValue: (c) =>
          c.status === "REVOKED" && c.revocationReason
            ? `${CERTIFICATE_STATUS_LABELS[c.status]} (${c.revocationReason})`
            : CERTIFICATE_STATUS_LABELS[c.status],
        cell: (c) => <StatusCell certificate={c} />,
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        data={certificates}
        columns={columns}
        getRowId={(c) => c.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        title="certificats"
        stateKey="certificates"
        searchPlaceholder="Rechercher un certificat, un apprenant…"
        initialSort={{ columnId: "issuedAt", direction: "desc" }}
        rowActions={renderActions}
        emptyState={<EmptyState icon={Award} message="Aucun certificat émis pour le moment." />}
      />

      {revokeTarget && (
        <RevokeCertificateDialog
          key={revokeTarget.id}
          open
          onOpenChange={(open) => !open && setRevokeTarget(null)}
          certificateNumber={revokeTarget.number}
          onRevoke={(values) => revoke.mutateAsync({ certificateId: revokeTarget.id, reason: values.reason })}
        />
      )}
    </div>
  );
}
