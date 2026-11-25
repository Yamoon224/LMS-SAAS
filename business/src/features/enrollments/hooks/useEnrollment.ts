import { useQuery } from "@tanstack/react-query";

import { fetchEnrollmentById } from "../api/enrollments.api";

export function enrollmentQueryKey(enrollmentId: string) {
  return ["enrollments", "detail", enrollmentId] as const;
}

/** Fiche d'une inscription : statut, accès, progression. */
export function useEnrollment(enrollmentId: string) {
  return useQuery({
    queryKey: enrollmentQueryKey(enrollmentId),
    queryFn: () => fetchEnrollmentById(enrollmentId),
    enabled: Boolean(enrollmentId),
  });
}
