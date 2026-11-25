import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchTenantPayoutAccount, verifyTenantPayoutAccount } from "../api/payout-account.api";

const payoutAccountKey = (tenantId: string) => ["tenants", tenantId, "payout-account"] as const;

/** Compte de reversement masqué d'une entreprise (ENT-11). */
export function useTenantPayoutAccount(tenantId: string) {
  return useQuery({ queryKey: payoutAccountKey(tenantId), queryFn: () => fetchTenantPayoutAccount(tenantId) });
}

/** Vérification du compte : débloque les demandes de reversement de l'entreprise. */
export function useVerifyTenantPayoutAccount(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Compte de reversement vérifié." },
    mutationFn: () => verifyTenantPayoutAccount(tenantId),
    onSuccess: (data) => queryClient.setQueryData(payoutAccountKey(tenantId), data),
  });
}
