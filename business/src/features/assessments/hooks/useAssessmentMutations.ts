import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  addQuestion,
  grantAttempts,
  removeQuestion,
  saveExamRules,
  saveQuizRules,
} from "../api/assessments.api";
import type {
  AssessmentScope,
  CreateQuestionValues,
  ExamRulesValues,
  QuizRulesValues,
} from "../schemas/assessment.schema";

import { examQueryKey, quizQueryKey } from "./useAssessment";

function keyFor(scope: AssessmentScope) {
  return scope.kind === "quiz" ? quizQueryKey(scope.moduleId) : examQueryKey(scope.courseId);
}

/** Enregistrement des règles du quiz (ENT-28, upsert) + invalidation. */
export function useSaveQuizRules(moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Règles du quiz enregistrées.", inlineError: true },
    mutationFn: (values: QuizRulesValues) => saveQuizRules(moduleId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quizQueryKey(moduleId) });
    },
  });
}

/** Enregistrement des règles de l'examen final (ENT-34, upsert) + invalidation. */
export function useSaveExamRules(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Règles de l’examen enregistrées.", inlineError: true },
    mutationFn: (values: ExamRulesValues) => saveExamRules(courseId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: examQueryKey(courseId) });
    },
  });
}

/** Ajout d'une question (ENT-27/ENT-34) + invalidation. */
export function useAddQuestion(scope: AssessmentScope) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Question ajoutée.", inlineError: true },
    mutationFn: (values: CreateQuestionValues) => addQuestion(scope, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keyFor(scope) });
    },
  });
}

/** Suppression d'une question + invalidation. */
export function useRemoveQuestion(scope: AssessmentScope) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Question supprimée." },
    mutationFn: (questionId: string) => removeQuestion(scope, questionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keyFor(scope) });
    },
  });
}

/** Tentatives supplémentaires pour un apprenant (ENT-31). Cible (quiz d'un module ou examen) choisie à l'appel ; aucune donnée affichée n'en dépend : pas d'invalidation. */
export function useGrantAttempts() {
  return useMutation({
    meta: { successMessage: "Tentatives accordées.", inlineError: true },
    mutationFn: ({
      scope,
      enrollmentId,
      extraAttempts,
    }: {
      scope: AssessmentScope;
      enrollmentId: string;
      extraAttempts: number;
    }) => grantAttempts(scope, enrollmentId, extraAttempts),
  });
}
