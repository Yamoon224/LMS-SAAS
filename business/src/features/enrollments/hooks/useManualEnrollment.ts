import { useMutation, useQueryClient } from "@tanstack/react-query";

import { enrollLearnerManually } from "../api/enrollments.api";
import type { ManualEnrollmentValues } from "../schemas/enrollment.schema";

/** Inscription manuelle d'un apprenant, sans paiement (ENT-62) + invalidation de la liste des inscrits. */
export function useManualEnrollment(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Apprenant inscrit.", inlineError: true },
    mutationFn: (values: ManualEnrollmentValues) => enrollLearnerManually(courseId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["enrollments", courseId] });
    },
  });
}
