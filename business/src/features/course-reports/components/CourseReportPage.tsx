"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { useCourseReport } from "../hooks/useCourseReport";

import { BlockingModules, FailedQuestions } from "./DifficultyTables";
import { FunnelChart } from "./FunnelChart";

import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

/** Rapport par formation (ENT-67) : entonnoir, points de blocage, questions les plus échouées. */
export function CourseReportPage({ courseId }: { courseId: string }) {
  const { data, isLoading, isError, error } = useCourseReport(courseId);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link href={`/courses/${courseId}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-brand">
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour à la fiche formation
      </Link>
      <PageHeader
        title={data ? `Rapport — ${data.courseTitle}` : "Rapport de la formation"}
        description="Progression des apprenants et difficultés rencontrées sur les évaluations."
      />
      {isLoading && <Skeleton className="h-64" />}
      {isError && <ErrorBanner title="Impossible de charger le rapport." error={error} />}
      {data && (
        <>
          <FunnelChart funnel={data.funnel} />
          <div className="grid gap-6 lg:grid-cols-2">
            <BlockingModules modules={data.blockingModules} />
            <FailedQuestions questions={data.failedQuestions} />
          </div>
        </>
      )}
    </div>
  );
}
