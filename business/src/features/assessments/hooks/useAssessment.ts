import { useQuery } from "@tanstack/react-query";

import { fetchAttemptDetail, fetchAttemptsPage, fetchExam, fetchExamAttempts, fetchQuiz } from "../api/assessments.api";
import type { AttemptFilters } from "../schemas/attempts.schema";

export function quizQueryKey(moduleId: string) {
  return ["modules", moduleId, "quiz"] as const;
}

export function examQueryKey(courseId: string) {
  return ["courses", courseId, "exam"] as const;
}

/** Quiz d'un module (règles + questions) ; `null` tant qu'aucun quiz n'est configuré. */
export function useQuiz(moduleId: string) {
  return useQuery({
    queryKey: quizQueryKey(moduleId),
    queryFn: () => fetchQuiz(moduleId),
    enabled: Boolean(moduleId),
  });
}

/** Examen final d'une formation (règles + questions) ; `null` tant qu'aucun examen n'est configuré. */
export function useExam(courseId: string) {
  return useQuery({
    queryKey: examQueryKey(courseId),
    queryFn: () => fetchExam(courseId),
    enabled: Boolean(courseId),
  });
}

/** Tentatives d'examen de la formation, tous apprenants confondus (ENT-37). */
export function useExamAttempts(courseId: string) {
  return useQuery({
    queryKey: [...examQueryKey(courseId), "attempts"] as const,
    queryFn: () => fetchExamAttempts(courseId),
    enabled: Boolean(courseId),
  });
}

/** Page de tentatives filtrée côté serveur (ENT-37) ; `placeholderData` garde la page précédente pendant le rechargement. */
export function useAttemptsPage(examId: string | undefined, filters: AttemptFilters, page: number, pageSize: number) {
  return useQuery({
    queryKey: ["exams", examId, "attempts-page", filters, page, pageSize] as const,
    queryFn: () => fetchAttemptsPage(examId as string, filters, page, pageSize),
    enabled: Boolean(examId),
    placeholderData: (previous) => previous,
  });
}

/** Détail d'une tentative (réponses données), chargé à l'ouverture. */
export function useAttemptDetail(examId: string | undefined, attemptId: string | null) {
  return useQuery({
    queryKey: ["exams", examId, "attempt", attemptId] as const,
    queryFn: () => fetchAttemptDetail(examId as string, attemptId as string),
    enabled: Boolean(examId && attemptId),
  });
}
