"use client";

import { GraduationCap } from "lucide-react";
import { useState } from "react";

import { TenantFilter } from "./TenantFilter";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { useSupervisedLearners } from "@/features/supervision/hooks/useSupervision";
import { LEARNER_STATUS_LABELS } from "@/features/supervision/schemas/supervision.schema";
import type { SupervisedLearner } from "@/features/supervision/schemas/supervision.schema";
import { formatDate, formatDateTime } from "@/lib/format";

const STATUS_VARIANTS: Record<SupervisedLearner["status"], BadgeProps["variant"]> = {
  ACTIVE: "success",
  INVITED: "warning",
  SUSPENDED: "danger",
  DEACTIVATED: "secondary",
};

const COLUMNS: DataTableColumn<SupervisedLearner>[] = [
  {
    id: "learner",
    header: "Apprenant",
    accessor: (learner) => `${learner.fullName} ${learner.email} ${learner.tenantName}`,
    exportValue: (learner) => `${learner.fullName} <${learner.email}>`,
    cell: (learner) => (
      <div className="flex flex-col">
        <span className="font-medium">{learner.fullName}</span>
        <span className="text-xs text-muted-foreground">{learner.email}</span>
      </div>
    ),
    mobile: "primary",
  },
  {
    id: "tenant",
    header: "Entreprise",
    accessor: (learner) => learner.tenantName,
    exportValue: (learner) => learner.tenantName,
    cell: (learner) => learner.tenantName,
  },
  {
    id: "status",
    header: "Statut",
    accessor: (learner) => LEARNER_STATUS_LABELS[learner.status],
    exportValue: (learner) => LEARNER_STATUS_LABELS[learner.status],
    cell: (learner) => <Badge variant={STATUS_VARIANTS[learner.status]}>{LEARNER_STATUS_LABELS[learner.status]}</Badge>,
    mobile: "secondary",
  },
  {
    id: "enrollments",
    header: "Inscriptions",
    accessor: (learner) => learner.enrollmentsCount,
    exportValue: (learner) => learner.enrollmentsCount,
    cell: (learner) => learner.enrollmentsCount,
  },
  {
    id: "lastLogin",
    header: "Dernière connexion",
    accessor: (learner) => learner.lastLoginAt ?? 0,
    exportValue: (learner) => formatDateTime(learner.lastLoginAt),
    cell: (learner) => <span className="text-muted-foreground">{formatDateTime(learner.lastLoginAt)}</span>,
  },
  {
    id: "createdAt",
    header: "Inscrit le",
    accessor: (learner) => learner.createdAt,
    exportValue: (learner) => formatDate(learner.createdAt),
    cell: (learner) => <span className="text-muted-foreground">{formatDate(learner.createdAt)}</span>,
  },
];

/** ADM-30 : liste globale des apprenants, filtrable par entreprise ; recherche par nom ou e-mail. */
export function LearnersSupervision() {
  const [tenantId, setTenantId] = useState<string | undefined>();
  const { data, isLoading, isError, error, refetch } = useSupervisedLearners(tenantId);

  return (
    <div className="flex flex-col gap-4">
      <TenantFilter value={tenantId} onChange={setTenantId} />
      <DataTable
        data={data}
        columns={COLUMNS}
        getRowId={(learner) => learner.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        title="apprenants"
        stateKey="supervision-learners"
        searchPlaceholder="Rechercher par nom, e-mail ou entreprise…"
        initialSort={{ columnId: "createdAt", direction: "desc" }}
        emptyState={<EmptyState icon={GraduationCap} message="Aucun apprenant." />}
      />
    </div>
  );
}
