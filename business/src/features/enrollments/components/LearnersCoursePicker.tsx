"use client";

import { BookOpen, Users } from "lucide-react";
import Link from "next/link";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/ui/page-header";
import { RowActions } from "@/components/ui/row-actions";
import { CourseStatusBadge } from "@/features/courses/components/CourseStatusBadge";
import { useCourses } from "@/features/courses/hooks/useCourses";
import { COURSE_STATUS_LABELS } from "@/features/courses/schemas/course.schema";
import type { CourseListItem } from "@/features/courses/schemas/course.schema";
import { useSession } from "@/features/session/hooks/useSession";
import { InviteLearnerDialog } from "@/features/users/components/InviteLearnerDialog";

const COLUMNS: DataTableColumn<CourseListItem>[] = [
  {
    id: "title",
    header: "Formation",
    accessor: (course) => course.title,
    cell: (course) => (
      <Link href={`/courses/${course.id}/learners`} className="font-medium hover:underline">
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
];

/**
 * Apprenants (entrée globale) : l'API entreprise ne propose pas de liste d'inscriptions à
 * l'échelle du tenant (GET /business/enrollments exige un courseId) — on choisit donc d'abord la
 * formation, puis on route vers la page apprenants de cette formation.
 */
export function LearnersCoursePicker() {
  const { data: courses, isLoading, isError, error, refetch } = useCourses();
  const { can } = useSession();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Apprenants"
        description="Choisissez une formation pour consulter ses inscrits, valider un paiement hors plateforme ou gérer un accès. Invitez un apprenant pour pouvoir l’inscrire."
        actions={can("learners.manage") ? <InviteLearnerDialog /> : undefined}
      />

      <DataTable
        data={courses}
        columns={COLUMNS}
        getRowId={(course) => course.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        title="formations-apprenants"
        stateKey="learners-course-picker"
        searchPlaceholder="Rechercher une formation…"
        exports={["csv"]}
        rowActions={(course) => (
          <RowActions label={`Actions pour ${course.title}`}>
            <DropdownMenuItem asChild>
              <Link href={`/courses/${course.id}/learners`}>
                <Users /> Voir les apprenants
              </Link>
            </DropdownMenuItem>
          </RowActions>
        )}
        emptyState={
          <EmptyState
            icon={BookOpen}
            message="Aucune formation : créez-en une pour accueillir des apprenants."
            action={
              <Button asChild>
                <Link href="/courses/new">Créer une formation</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
