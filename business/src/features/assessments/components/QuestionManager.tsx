"use client";

import { CheckCircle2, Circle, HelpCircle, Trash2 } from "lucide-react";
import { useState } from "react";

import { useRemoveQuestion } from "../hooks/useAssessmentMutations";
import type { AssessmentScope, Question } from "../schemas/assessment.schema";
import { QUESTION_TYPE_LABELS } from "../schemas/assessment.schema";

import { AddQuestionDialog } from "./AddQuestionDialog";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/ui/row-actions";

/**
 * Liste des questions d'un quiz ou d'un examen (ENT-27/ENT-34) : ajout et suppression.
 * Pas de modification en place : le backend n'expose aucune route d'édition de question.
 * `questions === null` = l'évaluation n'existe pas encore (règles non enregistrées).
 */
export function QuestionManager({
  scope,
  questions,
}: {
  scope: AssessmentScope;
  questions: Question[] | null;
}) {
  const removeQuestion = useRemoveQuestion(scope);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Questions{questions ? ` (${questions.length})` : ""}</CardTitle>
        {questions && <AddQuestionDialog scope={scope} />}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!questions && (
          <p className="text-sm text-muted-foreground">
            Enregistrez d&apos;abord les règles de passage pour pouvoir ajouter des questions.
          </p>
        )}

        {questions && questions.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
            <HelpCircle className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucune question pour le moment.</p>
          </div>
        )}

        {questions && questions.length > 0 && (
          <ol className="flex flex-col gap-3">
            {questions.map((question, index) => (
              <li key={question.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">{index + 1}.</span>
                      <Badge variant="secondary">{QUESTION_TYPE_LABELS[question.type]}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {question.points} point{question.points > 1 ? "s" : ""}
                      </span>
                    </div>
                    {/* Énoncé affiché en texte brut (jamais injecté en HTML) : saisi via un simple textarea. */}
                    <p className="whitespace-pre-wrap text-sm font-medium">{question.statementHtml}</p>
                    <ul className="mt-2 flex flex-col gap-1">
                      {question.options.map((option) => (
                        <li key={option.id} className="flex items-center gap-2 text-sm">
                          {option.isCorrect ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className={option.isCorrect ? "font-medium" : "text-muted-foreground"}>
                            {option.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {question.explanation && (
                      <p className="mt-2 text-xs text-muted-foreground">Explication : {question.explanation}</p>
                    )}
                  </div>
                  <RowActions label={`Actions pour la question ${index + 1}`}>
                    <DropdownMenuItem destructive onSelect={() => setDeleteId(question.id)}>
                      <Trash2 /> Supprimer
                    </DropdownMenuItem>
                  </RowActions>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Supprimer cette question ?"
        description="La question et ses options seront supprimées. Cette action est irréversible."
        confirmLabel="Supprimer"
        isPending={removeQuestion.isPending}
        onConfirm={() => {
          if (!deleteId) return;
          removeQuestion.mutate(deleteId, { onSettled: () => setDeleteId(null) });
        }}
      />
    </Card>
  );
}
