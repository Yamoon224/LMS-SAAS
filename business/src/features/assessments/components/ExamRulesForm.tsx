"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { useSaveExamRules } from "../hooks/useAssessmentMutations";
import type { Exam, ExamRulesValues } from "../schemas/assessment.schema";
import { examRulesSchema } from "../schemas/assessment.schema";

import { NumberField, SwitchField } from "./RuleFields";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api-client";

function toDefaults(exam: Exam | null): ExamRulesValues {
  return {
    passingScorePercent: exam?.passingScorePercent ?? 60,
    maxAttempts: exam?.maxAttempts ?? undefined,
    delayBetweenAttemptsMinutes: exam?.delayBetweenAttemptsMinutes ?? undefined,
    timeLimitMinutes: exam?.timeLimitMinutes ?? 60,
    questionsPerModule: exam?.questionsPerModule ?? undefined,
    allowReentry: exam?.allowReentry ?? false,
    weight: exam?.weight ?? 1,
  };
}

/** Règles de l'examen final d'une formation (ENT-34). Pré-rempli si l'examen existe, sinon valeurs par défaut du DTO. */
export function ExamRulesForm({ courseId, exam }: { courseId: string; exam: Exam | null }) {
  const saveRules = useSaveExamRules(courseId);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ExamRulesValues>({
    resolver: zodResolver(examRulesSchema),
    defaultValues: toDefaults(exam),
  });

  async function onSubmit(values: ExamRulesValues) {
    await saveRules.mutateAsync(values);
    reset(values);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Règles de l&apos;examen</CardTitle>
      </CardHeader>
      <CardContent>
        {!exam && (
          <p className="mb-4 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            Aucun examen final n&apos;est configuré pour cette formation. Enregistrez les règles pour le
            créer, puis ajoutez des questions.
          </p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField
              register={register}
              name="passingScorePercent"
              label="Note minimale (%)"
              min={0}
              error={errors.passingScorePercent?.message}
            />
            <NumberField
              register={register}
              name="timeLimitMinutes"
              label="Durée limite (minutes)"
              min={1}
              error={errors.timeLimitMinutes?.message}
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
              name="questionsPerModule"
              label="Questions tirées par module"
              hint="Vide = toutes les questions."
              min={1}
              error={errors.questionsPerModule?.message}
            />
            <NumberField
              register={register}
              name="weight"
              label="Poids dans la note finale"
              hint="Défaut 1 ; 0 = exclu de la note finale pondérée."
              min={0}
              max={100}
              error={errors.weight?.message}
            />
          </div>

          <SwitchField
            control={control}
            name="allowReentry"
            label="Autoriser la reprise"
            hint="L'apprenant peut reprendre l'examen en cours après interruption."
          />

          {saveRules.isError && (
            <p className="text-xs text-danger">
              {saveRules.error instanceof ApiError ? saveRules.error.message : "Enregistrement impossible."}
            </p>
          )}
          {saveRules.isSuccess && !isDirty && <p className="text-xs text-success">Règles enregistrées.</p>}

          <div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              {exam ? "Enregistrer les règles" : "Créer l'examen"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
