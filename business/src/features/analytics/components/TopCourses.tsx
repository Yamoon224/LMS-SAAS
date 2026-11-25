import { BookOpen, Trophy } from "lucide-react";
import Link from "next/link";

import type { BusinessDashboard } from "../schemas/analytics.schema";

import { EmptyState } from "@/components/feedback/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface TopCoursesProps {
  courses?: BusinessDashboard["topCourses"];
  isLoading: boolean;
}

/** Formations les plus suivies : liste classée avec barre de proportion (relative au premier). */
export function TopCourses({ courses, isLoading }: TopCoursesProps) {
  const max = Math.max(1, ...(courses ?? []).map((course) => course.enrollmentsCount));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-brand" aria-hidden="true" />
          Formations phares
        </CardTitle>
        <CardDescription>Classées par nombre d’inscriptions sur la période.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {courses && courses.length === 0 && (
          <EmptyState icon={BookOpen} message="Aucune inscription sur cette période." />
        )}

        {courses && courses.length > 0 && (
          <ol className="flex flex-col gap-3">
            {courses.map((course, index) => (
              <li key={course.courseId} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-brand tabular-nums">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`/courses/${course.courseId}`}
                      className="truncate text-sm font-medium hover:underline focus-visible:underline"
                    >
                      {course.title || "Formation sans titre"}
                    </Link>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {course.enrollmentsCount.toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border/70" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${Math.max(4, (course.enrollmentsCount / max) * 100)}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
