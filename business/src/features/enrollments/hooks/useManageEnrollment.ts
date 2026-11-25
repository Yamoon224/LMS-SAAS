import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  extendEnrollmentAccess,
  reactivateEnrollment,
  rejectOfflinePayment,
  resetEnrollmentProgress,
  suspendEnrollment,
  validateOfflinePayment,
} from "../api/enrollments.api";

import { enrollmentQueryKey } from "./useEnrollment";

/**
 * Actions de gestion d'une inscription (ENT-61/ENT-64) + invalidation liste (toutes variantes de
 * filtre par statut, d'où l'invalidation par préfixe `["enrollments", courseId]`) + fiche.
 */
export function useManageEnrollment(enrollmentId: string, courseId: string) {
  const queryClient = useQueryClient();

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["enrollments", courseId] });
    void queryClient.invalidateQueries({ queryKey: enrollmentQueryKey(enrollmentId) });
  }

  const validatePayment = useMutation({
    meta: { successMessage: "Paiement validé, accès activé.", inlineError: true },
    mutationFn: (values: Parameters<typeof validateOfflinePayment>[1]) =>
      validateOfflinePayment(enrollmentId, values),
    onSuccess: invalidate,
  });

  const rejectPayment = useMutation({
    meta: { successMessage: "Paiement refusé, l'apprenant est prévenu.", inlineError: true },
    mutationFn: (values: Parameters<typeof rejectOfflinePayment>[1]) => rejectOfflinePayment(enrollmentId, values),
    onSuccess: invalidate,
  });

  const suspend = useMutation({
    meta: { successMessage: "Apprenant suspendu." },
    mutationFn: () => suspendEnrollment(enrollmentId),
    onSuccess: invalidate,
  });

  const reactivate = useMutation({
    meta: { successMessage: "Apprenant réactivé." },
    mutationFn: () => reactivateEnrollment(enrollmentId),
    onSuccess: invalidate,
  });

  const extendAccess = useMutation({
    meta: { successMessage: "Accès prolongé.", inlineError: true },
    mutationFn: (values: Parameters<typeof extendEnrollmentAccess>[1]) =>
      extendEnrollmentAccess(enrollmentId, values),
    onSuccess: invalidate,
  });

  const resetProgress = useMutation({
    meta: { successMessage: "Progression réinitialisée." },
    mutationFn: () => resetEnrollmentProgress(enrollmentId),
    onSuccess: invalidate,
  });

  return { validatePayment, rejectPayment, suspend, reactivate, extendAccess, resetProgress };
}
