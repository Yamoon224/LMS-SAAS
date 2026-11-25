import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchFinanceSettings, updateFinanceSettings } from "../api/finance-settings.api";

const FINANCE_SETTINGS_KEY = ["finance-settings"] as const;

export function useFinanceSettings() {
  return useQuery({ queryKey: FINANCE_SETTINGS_KEY, queryFn: fetchFinanceSettings });
}

export function useUpdateFinanceSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Paramètres financiers enregistrés (ventes futures uniquement)." },
    mutationFn: updateFinanceSettings,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: FINANCE_SETTINGS_KEY }),
  });
}
