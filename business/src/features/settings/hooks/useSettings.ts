import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchSettings, saveBranding, saveContacts, saveOfflinePayment, savePayoutAccount } from "../api/settings.api";
import type { TenantSettings } from "../schemas/settings.schema";

export const settingsQueryKey = ["business-settings"] as const;

export function useSettings() {
  return useQuery({ queryKey: settingsQueryKey, queryFn: fetchSettings });
}

/** Fabrique un hook de sauvegarde : le serveur renvoie les réglages à jour, qui remplacent le cache. */
function useSaveMutation<TValues>(save: (values: TValues) => Promise<TenantSettings>, successMessage: string) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage },
    mutationFn: save,
    onSuccess: (settings) => queryClient.setQueryData(settingsQueryKey, settings),
  });
}

export const useSaveBranding = () => useSaveMutation(saveBranding, "Identité visuelle enregistrée.");
export const useSaveContacts = () => useSaveMutation(saveContacts, "Contacts et informations légales enregistrés.");
export const useSaveOfflinePayment = () => useSaveMutation(saveOfflinePayment, "Paiement hors plateforme enregistré.");
export const useSavePayoutAccount = () =>
  useSaveMutation(savePayoutAccount, "Coordonnées enregistrées : elles devront être vérifiées avant tout reversement.");
