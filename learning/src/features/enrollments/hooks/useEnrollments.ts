"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  enrollInCourse,
  fetchCourse,
  fetchExamAccess,
  fetchModulesAccess,
  fetchMyEnrollments,
} from "../api/enrollments.api";
import type { EnrollInput } from "../api/enrollments.api";
import type { Enrollment } from "../schemas/enrollment.schema";

import { useLocale } from "@/lib/i18n/client";

export const enrollmentsKey = ["my-enrollments"] as const;

/** `refetchInterval` : sonde douce (ex. attente de confirmation d'un paiement). */
export function useMyEnrollments(enabled = true, refetchInterval?: (enrollments: Enrollment[] | undefined) => number | false) {
  return useQuery({
    queryKey: enrollmentsKey,
    queryFn: fetchMyEnrollments,
    enabled,
    refetchInterval: refetchInterval ? (query) => refetchInterval(query.state.data) : false,
  });
}

export function useEnroll() {
  const queryClient = useQueryClient();
  const locale = useLocale();
  return useMutation({
    mutationFn: (input: EnrollInput) => enrollInCourse(input, locale),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: enrollmentsKey }),
  });
}

export function useCourse(courseId: string) {
  return useQuery({
    queryKey: ["course", courseId],
    queryFn: () => fetchCourse(courseId),
    staleTime: 5 * 60_000,
    enabled: courseId !== "",
  });
}

export function useModulesAccess(enrollmentId: string, courseId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["modules-access", enrollmentId, courseId],
    queryFn: () => fetchModulesAccess(enrollmentId, courseId),
    enabled,
  });
}

export function useExamAccess(enrollmentId: string, courseId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["exam-access", enrollmentId, courseId],
    queryFn: () => fetchExamAccess(enrollmentId, courseId),
    enabled,
  });
}
