"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { useSaveQuizRules } from "../hooks/useAssessmentMutations";
import type { Quiz, QuizRulesValues, ResultsDisplay } from "../schemas/assessment.schema";
import { quizRulesSchema, RESULTS_DISPLAY_LABELS } from "../schemas/assessment.schema";

import { NumberField, SwitchField } from "./RuleFields";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api-client";

const DEFAULT_RULES: QuizRulesValues = {
  passingScorePercent: 60,
  shuffleQuestions: true,
  shuffleAnswers: true,
  resultsDisplay: "SCORE_ONLY",
  requireLiveAttendance: false,
};

function toDefaults(quiz: Quiz | null): QuizRulesValues {
  if (!quiz) return DEFAULT_RULES;
  return {
    ...quiz,
    maxAttempts: quiz.maxAttempts ?? undefined,
    delayBetweenAttemptsMinutes: quiz.delayBetweenAttemptsMinutes ?? undefined,
    timeLimitMinutes: quiz.timeLimitMinutes ?? undefined,
    questionsToDraw: quiz.questionsToDraw ?? undefined,
  };
}

/** Règles de passage du quiz d'un module (ENT-28/ENT-30). Pré-rempli si un quiz existe, sinon valeurs par défaut du DTO. */
export function QuizRulesForm({ moduleId, quiz }: { moduleId: string; quiz: Quiz | null }) {
  const saveRules = useSaveQuizRules(moduleId);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<QuizRulesValues>({
    resolver: zodResolver(quizRulesSchema),
    defaultValues: toDefaults(quiz),
  });

  async function onSubmit(values: QuizRulesValues) {
    await saveRules.mutateAsync(values);
    reset(values);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Règles de passage</CardTitle>
      </CardHeader>
      <CardContent>
        {!quiz && (
          <p className="mb-4 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            Aucun quiz n&apos;est configuré pour ce module. Enregistrez les règles pour le créer, puis
            ajoutez des questions.
          </p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField
              register={register}
              name="passingScorePercent"
              label="Note minimale (%)"
              min={0}
              max={100}
              error={errors.passingScorePercent?.message}
            />
            <NumberField
              register={register}
              name="maxAttempts"
              label="Tentatives maximum"
              hint="Vide = illimité."
              min={1}
              error={errors.maxAttempts?.message}
            />
            <NumberField
              register={register}
              name="delayBetweenAttemptsMinutes"
              label="Délai entre tentatives (minutes)"
              hint="Vide = aucun délai."
              min={0}
              error={errors.delayBetweenAttemptsMinutes?.message}
            />
            <NumberField
              register={register}
              name="timeLimitMinutes"
              label="Durée limite (minutes)"
              hint="Vide = sans limite."
              min={1}
              error={errors.timeLimitMinutes?.message}
            />
            <NumberField
              register={register}
              name="questionsToDraw"
              label="Questions tirées au sort"
              hint="Vide = toutes les questions."
              min={1}
              error={errors.questionsToDraw?.message}
            />
            <div className="flex flex-col gap-1.5">
              <Label>Affichage des résultats</Label>
              <Controller
                control={control}
                name="resultsDisplay"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => field.onChange(value as ResultsDisplay)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RESULTS_DISPLAY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SwitchField control={control} name="shuffleQuestions" label="Mélanger les questions" />
            <SwitchField control={control} name="shuffleAnswers" label="Mélanger les réponses" />
            <SwitchField
              control={control}
              name="requireLiveAttendance"
              label="Présence au live requise"
              hint="L'apprenant doit avoir assisté au live du module."
            />
          </div>

          {saveRules.isError && (
            <p className="text-xs text-danger">
              {saveRules.error instanceof ApiError ? saveRules.error.message : "Enregistrement impossible."}
            </p>
          )}
          {saveRules.isSuccess && !isDirty && <p className="text-xs text-success">Règles enregistrées.</p>}

          <div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              {quiz ? "Enregistrer les règles" : "Créer le quiz"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
