import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  confirmTranslation,
  estimateTranslation,
  fetchCreditBalance,
  fetchCreditLedger,
  fetchCourseTranslations,
  fetchCreditPacks,
  fetchEnabledLanguages,
  fetchTranslationJobs,
  purchaseCreditPack,
  setTranslationPublished,
} from "../api/ai-translation.api";
import type { EstimateTranslationValues, PurchaseCreditPackValues } from "../schemas/ai-translation.schema";

export const creditBalanceQueryKey = ["ai-translation", "balance"] as const;
export const creditLedgerQueryKey = ["ai-translation", "ledger"] as const;
export const creditPacksQueryKey = ["ai-translation", "packs"] as const;
export function translationJobsQueryKey(courseId: string) {
  return ["ai-translation", "jobs", courseId] as const;
}

export function useCreditBalance() {
  return useQuery({ queryKey: creditBalanceQueryKey, queryFn: fetchCreditBalance });
}

export function useCreditLedger() {
  return useQuery({ queryKey: creditLedgerQueryKey, queryFn: fetchCreditLedger });
}

export function useCreditPacks() {
  return useQuery({ queryKey: creditPacksQueryKey, queryFn: fetchCreditPacks });
}

/** Achat d'un pack: renvoie le checkout (URL de paiement ou instructions); le solde ne bouge qu'après confirmation serveur. */
export function usePurchaseCreditPack() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Pack de crédits acheté.", inlineError: true },
    mutationFn: ({ creditPackId, values }: { creditPackId: string; values: PurchaseCreditPackValues }) =>
      purchaseCreditPack(creditPackId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: creditBalanceQueryKey });
      void queryClient.invalidateQueries({ queryKey: creditLedgerQueryKey });
    },
  });
}

/** Estimation (crée un job, aucun débit) puis confirmation (débit immédiat): invalide solde, mouvements et jobs. */
export function useTranslationFlow(courseId: string) {
  const queryClient = useQueryClient();

  const estimate = useMutation({
    meta: { silent: true },
    mutationFn: (values: EstimateTranslationValues) => estimateTranslation(courseId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: translationJobsQueryKey(courseId) });
    },
  });

  const confirm = useMutation({
    meta: { successMessage: "Traduction lancée.", inlineError: true },
    mutationFn: (jobId: string) => confirmTranslation(jobId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: creditBalanceQueryKey });
      void queryClient.invalidateQueries({ queryKey: creditLedgerQueryKey });
      void queryClient.invalidateQueries({ queryKey: translationJobsQueryKey(courseId) });
    },
  });

  return { estimate, confirm };
}

/** Historique des traductions d'une formation. */
export function useTranslationJobs(courseId: string) {
  return useQuery({
    queryKey: translationJobsQueryKey(courseId),
    queryFn: () => fetchTranslationJobs(courseId),
    enabled: Boolean(courseId),
  });
}

/** Langues activées sur la plateforme, pour choisir la langue cible. */
export function useEnabledLanguages() {
  return useQuery({ queryKey: ["enabled-languages"], queryFn: fetchEnabledLanguages });
}

export const courseTranslationsQueryKey = (courseId: string) => ["ai-translation", "translations", courseId] as const;

/** Langues traduites d'une formation (PUB-17). */
export function useCourseTranslations(courseId: string) {
  return useQuery({
    queryKey: courseTranslationsQueryKey(courseId),
    queryFn: () => fetchCourseTranslations(courseId),
    enabled: courseId !== "",
  });
}

/** Publication ou retrait d'une langue : la liste est relue après chaque changement. */
export function useSetTranslationPublished(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Publication mise à jour." },
    mutationFn: ({ locale, published }: { locale: string; published: boolean }) =>
      setTranslationPublished(courseId, locale, published),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: courseTranslationsQueryKey(courseId) }),
  });
}
