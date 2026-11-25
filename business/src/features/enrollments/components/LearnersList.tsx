"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EnrollmentStatusBadge } from "./EnrollmentStatusBadge";
import { ManualEnrollmentDialog } from "./ManualEnrollmentDialog";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEnrollments } from "@/features/enrollments/hooks/useEnrollments";
import { ENROLLMENT_STATUS_LABELS, learnerLabel } from "@/features/enrollments/schemas/enrollment.schema";
import type { EnrollmentListItem, EnrollmentStatus } from "@/features/enrollments/schemas/enrollment.schema";
import { useSession } from "@/features/session/hooks/useSession";

function formatPrice(price: number): string {
  return price === 0 ? "Gratuit" : price.toLocaleString("fr-FR");
}

function Identity({ enrollment, href }: { enrollment: EnrollmentListItem; href: string }) {
  return (
    <Link href={href} title={enrollment.userId} className="block hover:underline">
      <span className="block font-medium text-brand">{learnerLabel(enrollment)}</span>
      {enrollment.learnerName && enrollment.email && (
        <span className="block text-xs font-normal text-muted-foreground">{enrollment.email}</span>
      )}
    </Link>
  );
}

/** Apprenants inscrits à une formation (ENT-60), accessible depuis la fiche formation. */
export function LearnersList({ courseId }: { courseId: string }) {
  const { can } = useSession();
  const [statusFilter, setStatusFilter] = useState<EnrollmentStatus | "ALL">("ALL");
  const { data: enrollments, isLoading, isError, error, refetch } = useEnrollments(
    courseId,
    statusFilter === "ALL" ? undefined : statusFilter,
  );

  const columns = useMemo<DataTableColumn<EnrollmentListItem>[]>(
    () => [
      {
        id: "learner",
        header: "Apprenant",
        accessor: (e) => `${e.learnerName ?? ""} ${e.email ?? ""} ${e.userId}`.trim(),
        exportValue: (e) => (e.learnerName && e.email ? `${e.learnerName} <${e.email}>` : learnerLabel(e)),
        cell: (e) => <Identity enrollment={e} href={`/courses/${courseId}/learners/${e.id}`} />,
        hideable: false,
        mobile: "primary",
      },
      {
        id: "status",
        header: "Statut",
        accessor: (e) => ENROLLMENT_STATUS_LABELS[e.status],
        cell: (e) => <EnrollmentStatusBadge status={e.status} />,
      },
      {
        id: "pricePaid",
        header: "Prix payé",
        accessor: (e) => e.pricePaid,
        exportValue: (e) => e.pricePaid,
        cell: (e) => formatPrice(e.pricePaid),
      },
      {
        id: "expiresAt",
        header: "Expiration",
        accessor: (e) => e.expiresAt ?? null,
        exportValue: (e) => (e.expiresAt ? e.expiresAt.toLocaleDateString("fr-FR") : "Illimité"),
        cell: (e) => (e.expiresAt ? e.expiresAt.toLocaleDateString("fr-FR") : "Illimité"),
      },
    ],
    [courseId],
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Apprenants</h1>
        <p className="mt-1 text-sm text-muted-foreground">Inscriptions à cette formation.</p>
      </div>

      <DataTable
        data={enrollments}
        columns={columns}
        getRowId={(e) => e.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        title="apprenants"
        stateKey="learners"
        searchPlaceholder="Rechercher par nom ou e-mail…"
        initialSort={{ columnId: "learner", direction: "asc" }}
        toolbarActions={can("learners.manage") ? <ManualEnrollmentDialog courseId={courseId} /> : undefined}
        filters={
          <div className="flex flex-col gap-1.5 sm:w-56">
            <Label htmlFor="learners-status" className="sr-only">
              Statut
            </Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger id="learners-status" aria-label="Filtrer par statut">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {Object.entries(ENROLLMENT_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        emptyState={
          <EmptyState
            icon={Users}
            message={statusFilter === "ALL" ? "Aucun apprenant inscrit à cette formation." : "Aucun apprenant pour ce filtre."}
          />
        }
      />
    </div>
  );
}
