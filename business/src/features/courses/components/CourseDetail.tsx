"use client";

import { ArrowLeft, BarChart3, GraduationCap, Pencil, Users } from "lucide-react";
import Link from "next/link";

import { CourseStatusActions } from "./CourseStatusActions";
import { CourseStatusBadge } from "./CourseStatusBadge";

import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourse } from "@/features/courses/hooks/useCourse";
import { COURSE_TYPE_LABELS, PROGRESSION_MODE_LABELS } from "@/features/courses/schemas/course.schema";
import { ModuleList } from "@/features/modules/components/ModuleList";
import { ApiError } from "@/lib/api-client";

function formatPrice(price: number, currency: string): string {
  return price === 0 ? "Gratuit" : `${price.toLocaleString("fr-FR")} ${currency}`;
}

export function CourseDetail({ courseId }: { courseId: string }) {
  const { data: course, isLoading, isError, error } = useCourse(courseId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !course) {
    const isNotFound = error instanceof ApiError && error.status === 404;
    return (
      <ErrorBanner title={isNotFound ? "Formation introuvable." : "Impossible de charger cette formation."} error={isNotFound ? undefined : error} />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link
            href="/courses"
            className="mb-2 inline-flex min-h-10 items-center gap-1 text-sm text-muted-foreground hover:text-brand"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour aux formations
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
            <CourseStatusBadge status={course.status} />
          </div>
          {course.subtitle && <p className="mt-1 text-sm text-muted-foreground">{course.subtitle}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {course.type === "CERTIFYING" && (
            <Button variant="outline" asChild>
              <Link href={`/courses/${course.id}/exam`}>
                <GraduationCap className="h-3.5 w-3.5" />
                Examen final
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={`/courses/${course.id}/learners`}>
              <Users className="h-3.5 w-3.5" />
              Apprenants
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/courses/${course.id}/report`}>
              <BarChart3 className="h-3.5 w-3.5" />
              Rapport
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/courses/${course.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              Modifier
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statut &amp; actions</CardTitle>
        </CardHeader>
        <CardContent>
          <CourseStatusActions courseId={course.id} status={course.status} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Type" value={COURSE_TYPE_LABELS[course.type]} />
          <Field label="Progression" value={PROGRESSION_MODE_LABELS[course.progressionMode]} />
          <Field label="Prix" value={formatPrice(course.price, course.currency)} />
          <Field label="Langue source" value={course.sourceLocale} />
          {course.category && <Field label="Catégorie" value={course.category} />}
          {course.level && <Field label="Niveau" value={course.level} />}
          {course.accessDurationDays != null && (
            <Field label="Durée d'accès" value={`${course.accessDurationDays} jours`} />
          )}
          {course.estimatedDurationMinutes != null && (
            <Field label="Durée estimée" value={`${course.estimatedDurationMinutes} min`} />
          )}
          <Field label="Identifiant" value={course.id} mono />
        </CardContent>
      </Card>

      <ModuleList courseId={course.id} />
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : "text-sm font-medium"}>{value}</span>
    </div>
  );
}
