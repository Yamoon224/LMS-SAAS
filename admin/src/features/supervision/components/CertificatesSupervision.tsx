"use client";

import { Award, Eye } from "lucide-react";
import { useState } from "react";

import { CertificatePreviewDialog } from "./CertificatePreviewDialog";
import { TenantFilter } from "./TenantFilter";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/ui/row-actions";
import { useSupervisedCertificates } from "@/features/supervision/hooks/useSupervision";
import { CERTIFICATE_STATUS_LABELS } from "@/features/supervision/schemas/supervision.schema";
import type { SupervisedCertificate } from "@/features/supervision/schemas/supervision.schema";
import { formatDate } from "@/lib/format";

const STATUS_VARIANTS: Record<SupervisedCertificate["status"], BadgeProps["variant"]> = {
  VALID: "success",
  REVOKED: "danger",
  REISSUED: "secondary",
};

const COLUMNS: DataTableColumn<SupervisedCertificate>[] = [
  {
    id: "number",
    header: "Numéro",
    accessor: (certificate) => `${certificate.number} ${certificate.learnerName} ${certificate.courseTitle}`,
    exportValue: (certificate) => certificate.number,
    cell: (certificate) => <span className="font-mono text-xs">{certificate.number}</span>,
    mobile: "primary",
  },
  {
    id: "learner",
    header: "Apprenant / formation",
    accessor: (certificate) => `${certificate.learnerName} ${certificate.courseTitle}`,
    exportValue: (certificate) => `${certificate.learnerName} - ${certificate.courseTitle}`,
    cell: (certificate) => (
      <div className="flex flex-col">
        <span className="font-medium">{certificate.learnerName}</span>
        <span className="text-xs text-muted-foreground">{certificate.courseTitle}</span>
      </div>
    ),
  },
  {
    id: "tenant",
    header: "Entreprise",
    accessor: (certificate) => certificate.tenantName,
    exportValue: (certificate) => certificate.tenantName,
    cell: (certificate) => certificate.tenantName,
  },
  {
    id: "status",
    header: "Statut",
    accessor: (certificate) => CERTIFICATE_STATUS_LABELS[certificate.status],
    exportValue: (certificate) => CERTIFICATE_STATUS_LABELS[certificate.status],
    cell: (certificate) => (
      <Badge variant={STATUS_VARIANTS[certificate.status]}>{CERTIFICATE_STATUS_LABELS[certificate.status]}</Badge>
    ),
    mobile: "secondary",
  },
  {
    id: "score",
    header: "Score",
    accessor: (certificate) => certificate.scorePercent ?? -1,
    exportValue: (certificate) => certificate.scorePercent ?? "",
    cell: (certificate) => (certificate.scorePercent === null ? "—" : `${certificate.scorePercent} %`),
  },
  {
    id: "issuedAt",
    header: "Délivré le",
    accessor: (certificate) => certificate.issuedAt,
    exportValue: (certificate) => formatDate(certificate.issuedAt),
    cell: (certificate) => <span className="text-muted-foreground">{formatDate(certificate.issuedAt)}</span>,
  },
];

/** ADM-31 : registre global des certificats délivrés ; recherche par numéro, nom ou formation. */
export function CertificatesSupervision() {
  const [tenantId, setTenantId] = useState<string | undefined>();
  const [previewing, setPreviewing] = useState<SupervisedCertificate | null>(null);
  const { data, isLoading, isError, error, refetch } = useSupervisedCertificates(tenantId);

  return (
    <div className="flex flex-col gap-4">
      <TenantFilter value={tenantId} onChange={setTenantId} />
      <DataTable
        data={data}
        columns={COLUMNS}
        getRowId={(certificate) => certificate.number}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        title="certificats"
        stateKey="supervision-certificates"
        searchPlaceholder="Rechercher par numéro, apprenant ou formation…"
        initialSort={{ columnId: "issuedAt", direction: "desc" }}
        onRowClick={setPreviewing}
        rowActions={(certificate) => (
          <RowActions label={`Actions pour le certificat ${certificate.number}`}>
            <DropdownMenuItem onSelect={() => setPreviewing(certificate)}>
              <Eye /> Aperçu
            </DropdownMenuItem>
          </RowActions>
        )}
        emptyState={<EmptyState icon={Award} message="Aucun certificat délivré." />}
      />
      <CertificatePreviewDialog certificate={previewing} onOpenChange={(open) => !open && setPreviewing(null)} />
    </div>
  );
}
