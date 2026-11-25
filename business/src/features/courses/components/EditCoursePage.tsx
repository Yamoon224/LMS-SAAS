"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { EditCourseForm } from "./EditCourseForm";

import { Skeleton } from "@/components/ui/skeleton";
import { useCourse } from "@/features/courses/hooks/useCourse";
import { ApiError } from "@/lib/api-client";

/** Page d'édition d'une formation (ENT-15/ENT-21) — charge la fiche puis rend EditCourseForm. */
export function EditCoursePage({ courseId }: { courseId: string }) {
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
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        {isNotFound ? "Formation introuvable." : "Impossible de charger cette formation."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/courses/${course.id}`}
          className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-brand"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à la fiche formation
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Modifier la formation</h1>
      </div>

      <EditCourseForm course={course} />
    </div>
  );
}
