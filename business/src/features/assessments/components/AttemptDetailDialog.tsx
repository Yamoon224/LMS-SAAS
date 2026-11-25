"use client";

import { Check, X } from "lucide-react";

import { useAttemptDetail } from "../hooks/useAssessment";
import { ATTEMPT_STATUS_LABELS, formatAttemptDate, formatDuration, formatScore } from "../schemas/attempts.schema";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

/** Détail d'une tentative d'examen en lecture seule (ENT-37) : note, durée et réponses données. */
export function AttemptDetailDialog({
  examId,
  attemptId,
  onClose,
}: {
  examId: string | undefined;
  attemptId: string | null;
  onClose: () => void;
}) {
  const { data, isLoading, isError, error } = useAttemptDetail(examId, attemptId);

  return (
    <Dialog open={attemptId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Détail de la tentative</DialogTitle>
          <DialogDescription>Lecture seule : réponses données par l&apos;apprenant.</DialogDescription>
        </DialogHeader>

        {isLoading && <Skeleton className="h-40 w-full" />}
        {isError && (
          <p className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
            {error instanceof Error ? error.message : "Impossible de charger la tentative."}
          </p>
        )}

        {data && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Apprenant</dt>
                <dd className="break-words">{data.learnerName ?? data.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Note</dt>
                <dd>{formatScore(data.scorePercent)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Statut</dt>
                <dd>{ATTEMPT_STATUS_LABELS[data.status]}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Durée</dt>
                <dd>{formatDuration(data.durationSeconds)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Début</dt>
                <dd>{formatAttemptDate(data.startedAt)}</dd>
              </div>
            </dl>

            <ol className="flex flex-col gap-3">
              {data.questions.map((question, index) => (
                <li key={question.questionId} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2 text-sm font-medium">
                    {/* Énoncé affiché en texte brut : jamais de HTML saisi injecté. */}
                    <span className="break-words">
                      {index + 1}. {question.statementHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}
                    </span>
                    <span className={question.correct ? "shrink-0 text-success" : "shrink-0 text-danger"}>
                      {question.correct ? `+${question.points}` : "0"} pt
                    </span>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {question.options.map((option) => (
                      <li key={option.id} className="flex items-center gap-2">
                        {option.selected ? (
                          option.isCorrect ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <X className="h-4 w-4 text-danger" aria-hidden="true" />
                        ) : (
                          <span className="h-4 w-4" aria-hidden="true" />
                        )}
                        <span className={option.selected ? "font-medium" : "text-muted-foreground"}>
                          {option.label}
                          {option.isCorrect && <span className="ml-2 text-xs text-success">(bonne réponse)</span>}
                          {option.selected && <span className="sr-only"> — réponse donnée</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
              {data.questions.length === 0 && <li className="text-sm text-muted-foreground">Aucune question enregistrée pour cette tentative.</li>}
            </ol>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
