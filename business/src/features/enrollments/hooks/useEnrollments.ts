import { useQuery } from "@tanstack/react-query";

import { fetchEnrollments } from "../api/enrollments.api";
import type { EnrollmentStatus } from "../schemas/enrollment.schema";

export function enrollmentsQueryKey(courseId: string, status?: EnrollmentStatus) {
  return ["enrollments", courseId, status ?? "ALL"] as const;
}

/** Liste des inscrits d'une formation, filtrable par statut (ENT-60). */
export function useEnrollments(courseId: string, status?: EnrollmentStatus) {
  return useQuery({
    queryKey: enrollmentsQueryKey(courseId, status),
    queryFn: () => fetchEnrollments(courseId, status),
    enabled: Boolean(courseId),
  });
}
