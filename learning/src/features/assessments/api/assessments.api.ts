import {
  assessmentInfoSchema,
  attemptSchema,
  resultSchema,
  startAttemptSchema,
} from "../schemas/assessment.schema";
import type { AssessmentInfo, AssessmentTarget, Attempt, AttemptResult } from "../schemas/assessment.schema";

import { apiClient } from "@/lib/api-client";

const enc = encodeURIComponent;

export async function fetchAssessmentInfo(enrollmentId: string, target: AssessmentTarget): Promise<AssessmentInfo> {
  const path =
    target.kind === "quiz"
      ? `/public/enrollments/${enc(enrollmentId)}/modules/${enc(target.moduleId)}/quiz`
      : `/public/enrollments/${enc(enrollmentId)}/exam`;
  return assessmentInfoSchema.parse(await apiClient.get<unknown>(path));
}

export async function startAttempt(enrollmentId: string, kind: "quiz" | "exam", assessmentId: string): Promise<string> {
  const data = await apiClient.post<unknown>(`/public/attempts/${kind}/${enc(assessmentId)}/start`, { enrollmentId });
  return startAttemptSchema.parse(data).attemptId;
}

export async function fetchAttempt(attemptId: string): Promise<Attempt> {
  return attemptSchema.parse(await apiClient.get<unknown>(`/public/attempts/${enc(attemptId)}`));
}

export async function saveAnswer(attemptId: string, questionId: string, selectedOptionIds: string[]): Promise<void> {
  await apiClient.post(`/public/attempts/${enc(attemptId)}/answers`, { questionId, selectedOptionIds });
}

export async function submitAttempt(attemptId: string): Promise<void> {
  await apiClient.post(`/public/attempts/${enc(attemptId)}/submit`);
}

export async function fetchResult(attemptId: string): Promise<AttemptResult> {
  return resultSchema.parse(await apiClient.get<unknown>(`/public/attempts/${enc(attemptId)}/result`));
}
