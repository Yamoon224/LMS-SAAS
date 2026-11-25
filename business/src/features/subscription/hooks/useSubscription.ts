import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelPendingPlanChange,
  changePlan,
  fetchCurrentSubscription,
  fetchInvoices,
  fetchPublicPlans,
  fetchQuotaUsage,
  previewPlanChange,
  setAutoRenew,
  subscribeToPlan,
} from "../api/subscription.api";
import type { ChangePlanValues, SubscribeValues } from "../schemas/subscription.schema";

import { ApiError } from "@/lib/api-client";

const SUBSCRIPTION_KEY = ["subscription"] as const;

/** Abonnement courant ; un 404 signifie « aucun abonnement » et n'est pas retenté. */
export function useCurrentSubscription() {
  return useQuery({
    queryKey: [...SUBSCRIPTION_KEY, "current"],
    queryFn: fetchCurrentSubscription,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
}

export function usePublicPlans() {
  return useQuery({ queryKey: [...SUBSCRIPTION_KEY, "plans"], queryFn: fetchPublicPlans });
}

export function useQuotaUsage() {
  return useQuery({ queryKey: [...SUBSCRIPTION_KEY, "usage"], queryFn: fetchQuotaUsage });
}

export function useInvoices() {
  return useQuery({ queryKey: [...SUBSCRIPTION_KEY, "invoices"], queryFn: fetchInvoices });
}

export function useSubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Abonnement enregistré." },
    mutationFn: (values: SubscribeValues) => subscribeToPlan(values),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY }),
  });
}

export function useChangePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Changement de plan enregistré." },
    mutationFn: (values: ChangePlanValues) => changePlan(values),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY }),
  });
}

/** Aperçu du prorata, chargé seulement quand la confirmation est ouverte. */
export function usePlanChangePreview(newPlanPriceId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...SUBSCRIPTION_KEY, "preview", newPlanPriceId],
    queryFn: () => previewPlanChange(newPlanPriceId as string),
    enabled: enabled && newPlanPriceId !== undefined,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useCancelPendingPlanChange() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Changement de plan annulé." },
    mutationFn: cancelPendingPlanChange,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY }),
  });
}

export function useSetAutoRenew() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Renouvellement automatique mis à jour." },
    mutationFn: (autoRenew: boolean) => setAutoRenew(autoRenew),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY }),
  });
}
