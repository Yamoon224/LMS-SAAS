"use client";

import { BookOpen, GraduationCap, Pencil, Plus, Users } from "lucide-react";
import Link from "next/link";

import { CourseStatusBadge } from "./CourseStatusBadge";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/ui/page-header";
import { RowActions } from "@/components/ui/row-actions";
import { useCourses } from "@/features/courses/hooks/useCourses";
import { COURSE_STATUS_LABELS } from "@/features/courses/schemas/course.schema";
import type { CourseListItem } from "@/features/courses/schemas/course.schema";

function formatPrice(price: number): string {
  return price === 0 ? "Gratuit" : price.toLocaleString("fr-FR");
}

function CourseRowActions({ course }: { course: CourseListItem }) {
  return (
    <RowActions label={`Actions pour ${course.title}`}>
      <DropdownMenuItem asChild>
        <Link href={`/courses/${course.id}`}>
          <GraduationCap /> Ouvrir la fiche
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/courses/${course.id}/edit`}>
          <Pencil /> Modifier
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href={`/courses/${course.id}/learners`}>
          <Users /> Apprenants
        </Link>
      </DropdownMenuItem>
    </RowActions>
  );
}

const COLUMNS: DataTableColumn<CourseListItem>[] = [
  {
    id: "title",
    header: "Formation",
    accessor: (course) => course.title,
    cell: (course) => (
      <Link href={`/courses/${course.id}`} className="font-medium hover:underline">
        {course.title}
      </Link>
    ),
    hideable: false,
    mobile: "primary",
  },
  {
    id: "status",
    header: "Statut",
    accessor: (course) => COURSE_STATUS_LABELS[course.status],
    cell: (course) => <CourseStatusBadge status={course.status} />,
  },
  {
    id: "price",
    header: "Prix",
    accessor: (course) => course.price,
    exportValue: (course) => course.price,
    cell: (course) => <span className="text-muted-foreground">{formatPrice(course.price)}</span>,
  },
];

export function CourseList() {
  const { data: courses, isLoading, isError, error, refetch } = useCourses();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Formations"
        description="Gérez le catalogue de formations de votre entreprise."
        actions={
          <Button asChild>
            <Link href="/courses/new">
              <Plus className="h-4 w-4" />
              Nouvelle formation
            </Link>
          </Button>
        }
      />

      <DataTable
        data={courses}
        columns={COLUMNS}
        getRowId={(course) => course.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        title="formations"
        stateKey="courses"
        searchPlaceholder="Rechercher une formation…"
        rowActions={(course) => <CourseRowActions course={course} />}
        emptyState={
          <EmptyState
            icon={BookOpen}
            message="Aucune formation pour le moment."
            action={
              <Button asChild>
                <Link href="/courses/new">Créer ma première formation</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
