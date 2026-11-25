"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { useQuiz } from "../hooks/useAssessment";

import { QuestionManager } from "./QuestionManager";
import { QuizRulesForm } from "./QuizRulesForm";

import { Skeleton } from "@/components/ui/skeleton";
import { useModules } from "@/features/modules/hooks/useModules";
import { ApiError } from "@/lib/api-client";

/** Page du quiz d'un module (ENT-27/ENT-28) : règles de passage puis questions. */
export function QuizPage({ courseId, moduleId }: { courseId: string; moduleId: string }) {
  const { data: quiz, isLoading, isError, error } = useQuiz(moduleId);
  const { data: modules } = useModules(courseId);
  const moduleTitle = modules?.find((courseModule) => courseModule.id === moduleId)?.title;

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
        <h1 className="text-2xl font-semibold tracking-tight">Quiz du module</h1>
        {moduleTitle && <p className="mt-1 text-sm text-muted-foreground">{moduleTitle}</p>}
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
            : "Impossible de charger le quiz."}
        </div>
      )}

      {!isLoading && !isError && quiz !== undefined && (
        <>
          <QuizRulesForm key={quiz?.id ?? "new"} moduleId={moduleId} quiz={quiz} />
          <QuestionManager scope={{ kind: "quiz", moduleId }} questions={quiz?.questions ?? null} />
        </>
      )}
    </div>
  );
}
