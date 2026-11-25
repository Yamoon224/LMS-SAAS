import type {
  AssessmentScope,
  CreateQuestionValues,
  Exam,
  ExamRulesValues,
  Quiz,
  QuizRulesValues,
} from "../schemas/assessment.schema";
import { examSchema, quizSchema } from "../schemas/assessment.schema";
import type { AttemptDetail, AttemptFilters, AttemptsPage, ExamAttempt } from "../schemas/attempts.schema";
import {
  attemptDetailSchema,
  attemptFiltersToQuery,
  attemptsPageSchema,
  examAttemptSchema,
} from "../schemas/attempts.schema";

import { apiClient, ApiError } from "@/lib/api-client";

/** Les champs optionnels vides sont envoyés en `null` (et non omis) : le backend n'efface une valeur que sur null. */
function nullifyUndefined<T extends object>(values: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value ?? null]));
}

/** GET /business/modules/:moduleId/quiz — 404 si aucun quiz n'est encore configuré => null. */
export async function fetchQuiz(moduleId: string): Promise<Quiz | null> {
  try {
    const data = await apiClient.get<unknown>(`/business/modules/${moduleId}/quiz`);
    return quizSchema.parse(data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** GET /business/courses/:courseId/exam — 404 si aucun examen n'est encore configuré => null. */
export async function fetchExam(courseId: string): Promise<Exam | null> {
  try {
    const data = await apiClient.get<unknown>(`/business/courses/${courseId}/exam`);
    return examSchema.parse(data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export interface SaveRulesResponse {
  id: string;
}

/** PUT /business/modules/:moduleId/quiz (ConfigureQuizUseCase, upsert) — ENT-28. */
export async function saveQuizRules(moduleId: string, values: QuizRulesValues): Promise<SaveRulesResponse> {
  return apiClient.put<SaveRulesResponse>(`/business/modules/${moduleId}/quiz`, nullifyUndefined(values));
}

/** PUT /business/courses/:courseId/exam (ConfigureExamUseCase, upsert) — ENT-34. */
export async function saveExamRules(courseId: string, values: ExamRulesValues): Promise<SaveRulesResponse> {
  return apiClient.put<SaveRulesResponse>(`/business/courses/${courseId}/exam`, nullifyUndefined(values));
}

function basePath(scope: AssessmentScope): string {
  return scope.kind === "quiz"
    ? `/business/modules/${scope.moduleId}/quiz`
    : `/business/courses/${scope.courseId}/exam`;
}

/** POST .../questions — ENT-27 / ENT-34. */
export async function addQuestion(scope: AssessmentScope, values: CreateQuestionValues): Promise<unknown> {
  const body = { ...values, explanation: values.explanation?.trim() ? values.explanation : undefined };
  return apiClient.post(`${basePath(scope)}/questions`, body);
}

/** DELETE .../questions/:questionId. */
export async function removeQuestion(scope: AssessmentScope, questionId: string): Promise<unknown> {
  return apiClient.delete(`${basePath(scope)}/questions/${questionId}`);
}

/** POST .../grant-attempts — ENT-31 / RG-10. */
export async function grantAttempts(
  scope: AssessmentScope,
  enrollmentId: string,
  extraAttempts: number,
): Promise<unknown> {
  return apiClient.post(`${basePath(scope)}/grant-attempts`, { enrollmentId, extraAttempts });
}

/** GET /business/courses/:courseId/exam/attempts : 404 si aucun examen n'est configuré => liste vide (ENT-37). */
export async function fetchExamAttempts(courseId: string): Promise<ExamAttempt[]> {
  try {
    const data = await apiClient.get<unknown[]>(`/business/courses/${courseId}/exam/attempts`);
    return examAttemptSchema.array().parse(data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return [];
    throw error;
  }
}

/** GET /business/assessments/:examId/attempts : filtres et pagination côté serveur (ENT-37). */
export async function fetchAttemptsPage(
  examId: string,
  filters: AttemptFilters,
  page: number,
  pageSize: number,
): Promise<AttemptsPage> {
  const data = await apiClient.get<unknown>(
    `/business/assessments/${examId}/attempts${attemptFiltersToQuery(filters, page, pageSize)}`,
  );
  return attemptsPageSchema.parse(data);
}

/** GET /business/assessments/:examId/attempts/:attemptId : détail en lecture seule. */
export async function fetchAttemptDetail(examId: string, attemptId: string): Promise<AttemptDetail> {
  const data = await apiClient.get<unknown>(`/business/assessments/${examId}/attempts/${attemptId}`);
  return attemptDetailSchema.parse(data);
}

/** GET .../attempts/export.csv : export CSV côté serveur (mêmes filtres), relu en Blob. */
export async function downloadAttemptsCsv(examId: string, filters: AttemptFilters): Promise<Blob> {
  const response = await fetch(
    `/api/backend/business/assessments/${examId}/attempts/export.csv${attemptFiltersToQuery(filters)}`,
  );
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "Export impossible.");
  }
  return response.blob();
}
