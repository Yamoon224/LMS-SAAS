import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchIntegrations, resetIntegration, saveIntegration, sendSmtpTest } from "../api/integration.api";

const INTEGRATIONS_KEY = ["integrations"] as const;

export function useIntegrations() {
  return useQuery({ queryKey: INTEGRATIONS_KEY, queryFn: fetchIntegrations });
}

export function useSaveIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Intégration enregistrée." },
    mutationFn: ({ provider, body }: { provider: string; body: { values: Record<string, string>; clearSecrets: string[] } }) =>
      saveIntegration(provider, body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: INTEGRATIONS_KEY }),
  });
}

export function useResetIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Configuration supprimée : retour aux variables d'environnement." },
    mutationFn: (provider: string) => resetIntegration(provider),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: INTEGRATIONS_KEY }),
  });
}

export function useSmtpTest() {
  return useMutation({
    meta: { successMessage: "E-mail d'essai envoyé." },
    mutationFn: (to: string) => sendSmtpTest(to),
  });
}
