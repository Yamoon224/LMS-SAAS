import { notificationTemplateSchema } from "../schemas/notification-template.schema";
import type { NotificationTemplate, TemplateFormValues } from "../schemas/notification-template.schema";

import { apiClient } from "@/lib/api-client";

/** GET /admin/notification-templates — tous les modèles et leur texte d'origine (ADM-38). */
export async function fetchNotificationTemplates(): Promise<NotificationTemplate[]> {
  return notificationTemplateSchema.array().parse(await apiClient.get<unknown[]>("/admin/notification-templates"));
}

function path(templateKey: string, locale: string): string {
  return `/admin/notification-templates/${encodeURIComponent(templateKey)}/${encodeURIComponent(locale)}`;
}

/** PUT — remplace le sujet et le contenu d'un modèle pour une langue. */
export async function saveNotificationTemplate(
  templateKey: string,
  locale: string,
  values: TemplateFormValues,
): Promise<unknown> {
  return apiClient.put<unknown, TemplateFormValues>(path(templateKey, locale), values);
}

/** DELETE — revient au texte d'origine. */
export async function resetNotificationTemplate(templateKey: string, locale: string): Promise<unknown> {
  return apiClient.delete<unknown>(path(templateKey, locale));
}
