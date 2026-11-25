"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { useExam } from "../hooks/useAssessment";

import { ExamRulesForm } from "./ExamRulesForm";
import { QuestionManager } from "./QuestionManager";

import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";

/** Page de l'examen final d'une formation (ENT-34) : règles de passage puis questions. */
export function ExamPage({ courseId }: { courseId: string }) {
  const { data: exam, isLoading, isError, error } = useExam(courseId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/courses/${courseId}`}
          className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-brand"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à la fiche formation
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Examen final</h1>
          <Link href={`/courses/${courseId}/exam/attempts`} className="text-sm font-medium text-brand hover:underline">
            Voir les tentatives des apprenants
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          {error instanceof ApiError || error instanceof Error
            ? error.message
            : "Impossible de charger l'examen."}
        </div>
      )}

      {!isLoading && !isError && exam !== undefined && (
        <>
          <ExamRulesForm key={exam?.id ?? "new"} courseId={courseId} exam={exam} />
          <QuestionManager scope={{ kind: "exam", courseId }} questions={exam?.questions ?? null} />
        </>
      )}
    </div>
  );
}
