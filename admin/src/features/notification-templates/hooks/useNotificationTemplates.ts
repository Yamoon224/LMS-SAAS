import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchNotificationTemplates,
  resetNotificationTemplate,
  saveNotificationTemplate,
} from "../api/notification-template.api";
import type { TemplateFormValues } from "../schemas/notification-template.schema";

const TEMPLATES_KEY = ["notification-templates"] as const;

export function useNotificationTemplates() {
  return useQuery({ queryKey: TEMPLATES_KEY, queryFn: fetchNotificationTemplates });
}

export function useSaveNotificationTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Modèle enregistré." },
    mutationFn: ({ templateKey, locale, values }: { templateKey: string; locale: string; values: TemplateFormValues }) =>
      saveNotificationTemplate(templateKey, locale, values),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}

export function useResetNotificationTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Texte d'origine rétabli." },
    mutationFn: ({ templateKey, locale }: { templateKey: string; locale: string }) =>
      resetNotificationTemplate(templateKey, locale),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}
