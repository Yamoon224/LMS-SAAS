"use client";

import { BookOpen } from "lucide-react";
import { useState } from "react";

import { TenantFilter } from "./TenantFilter";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useSupervisedCourses } from "@/features/supervision/hooks/useSupervision";
import {
  COURSE_STATUS_LABELS,
  COURSE_TYPE_LABELS,
} from "@/features/supervision/schemas/supervision.schema";
import type { SupervisedCourse } from "@/features/supervision/schemas/supervision.schema";
import { formatAmount, formatDate } from "@/lib/format";

const COLUMNS: DataTableColumn<SupervisedCourse>[] = [
  {
    id: "title",
    header: "Formation",
    accessor: (course) => `${course.title} ${course.tenantName}`,
    exportValue: (course) => course.title,
    cell: (course) => (
      <div className="flex flex-col">
        <span className="font-medium">{course.title}</span>
        <span className="text-xs text-muted-foreground">{course.tenantName}</span>
      </div>
    ),
    mobile: "primary",
  },
  {
    id: "status",
    header: "Statut",
    accessor: (course) => COURSE_STATUS_LABELS[course.status],
    exportValue: (course) => COURSE_STATUS_LABELS[course.status],
    cell: (course) => (
      <Badge variant={course.status === "PUBLISHED" ? "success" : "secondary"}>{COURSE_STATUS_LABELS[course.status]}</Badge>
    ),
    mobile: "secondary",
  },
  {
    id: "type",
    header: "Type",
    accessor: (course) => COURSE_TYPE_LABELS[course.type],
    exportValue: (course) => COURSE_TYPE_LABELS[course.type],
    cell: (course) => COURSE_TYPE_LABELS[course.type],
  },
  {
    id: "locales",
    header: "Langues",
    accessor: (course) => course.locales.join(" "),
    exportValue: (course) => course.locales.join(", "),
    cell: (course) => <span className="uppercase">{course.locales.join(" · ")}</span>,
  },
  {
    id: "price",
    header: "Prix",
    accessor: (course) => course.price,
    exportValue: (course) => course.price,
    cell: (course) => (course.price === 0 ? "Gratuit" : formatAmount(course.price, course.currency)),
  },
  {
    id: "enrollments",
    header: "Inscrits",
    accessor: (course) => course.enrollmentsCount,
    exportValue: (course) => course.enrollmentsCount,
    cell: (course) => course.enrollmentsCount,
  },
  {
    id: "createdAt",
    header: "Créée le",
    accessor: (course) => course.createdAt,
    exportValue: (course) => formatDate(course.createdAt),
    cell: (course) => <span className="text-muted-foreground">{formatDate(course.createdAt)}</span>,
  },
];

/** ADM-29 : liste globale des formations (toutes entreprises) avec statut et langues. */
export function CoursesSupervision() {
  const [tenantId, setTenantId] = useState<string | undefined>();
  const { data, isLoading, isError, error, refetch } = useSupervisedCourses(tenantId);

  return (
    <div className="flex flex-col gap-4">
      <TenantFilter value={tenantId} onChange={setTenantId} />
      <DataTable
        data={data}
        columns={COLUMNS}
        getRowId={(course) => course.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        title="formations"
        stateKey="supervision-courses"
        searchPlaceholder="Rechercher une formation ou une entreprise…"
        initialSort={{ columnId: "createdAt", direction: "desc" }}
        emptyState={<EmptyState icon={BookOpen} message="Aucune formation." />}
      />
    </div>
  );
}
