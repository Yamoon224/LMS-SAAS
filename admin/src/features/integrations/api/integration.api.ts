import { integrationSchema } from "../schemas/integration.schema";
import type { Integration } from "../schemas/integration.schema";

import { apiClient } from "@/lib/api-client";

/** GET /admin/integrations — état et valeurs non secrètes (les secrets ne sont jamais renvoyés). */
export async function fetchIntegrations(): Promise<Integration[]> {
  return integrationSchema.array().parse(await apiClient.get<unknown[]>("/admin/integrations"));
}

/** PUT /admin/integrations/:provider */
export async function saveIntegration(
  provider: string,
  body: { values: Record<string, string>; clearSecrets: string[] },
): Promise<unknown> {
  return apiClient.put<unknown, typeof body>(`/admin/integrations/${encodeURIComponent(provider)}`, body);
}

/** DELETE /admin/integrations/:provider — retour aux variables d'environnement. */
export async function resetIntegration(provider: string): Promise<unknown> {
  return apiClient.delete<unknown>(`/admin/integrations/${encodeURIComponent(provider)}`);
}

/** POST /admin/integrations/EMAIL_SMTP/test — e-mail d'essai avec la configuration effective. */
export async function sendSmtpTest(to: string): Promise<unknown> {
  return apiClient.post<unknown, { to: string }>("/admin/integrations/EMAIL_SMTP/test", { to });
}
