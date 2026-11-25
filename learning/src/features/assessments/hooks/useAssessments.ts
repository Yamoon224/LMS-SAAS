"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchAssessmentInfo, fetchAttempt, fetchResult } from "../api/assessments.api";
import type { AssessmentTarget } from "../schemas/assessment.schema";

export const assessmentKey = (enrollmentId: string, target: AssessmentTarget) =>
  ["assessment", enrollmentId, target.kind, target.kind === "quiz" ? target.moduleId : "exam"] as const;

export function useAssessmentInfo(enrollmentId: string, target: AssessmentTarget, enabled = true) {
  return useQuery({
    queryKey: assessmentKey(enrollmentId, target),
    queryFn: () => fetchAssessmentInfo(enrollmentId, target),
    enabled,
    retry: false,
    staleTime: 15_000,
  });
}

export function useAttempt(attemptId: string) {
  return useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () => fetchAttempt(attemptId),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useAttemptResult(attemptId: string) {
  return useQuery({
    queryKey: ["attempt-result", attemptId],
    queryFn: () => fetchResult(attemptId),
    retry: false,
    staleTime: 60_000,
  });
}
