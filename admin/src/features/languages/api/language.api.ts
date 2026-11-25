import { languageSchema } from "../schemas/language.schema";
import type { Language } from "../schemas/language.schema";

import { apiClient } from "@/lib/api-client";

/** GET /admin/languages — les huit langues et leur état (ADM-40). */
export async function fetchLanguages(): Promise<Language[]> {
  return languageSchema.array().parse(await apiClient.get<unknown[]>("/admin/languages"));
}

/** PUT /admin/languages/:code — active ou désactive une langue (interface et traduction IA). */
export async function setLanguageEnabled(code: string, enabled: boolean): Promise<unknown> {
  return apiClient.put<unknown, { enabled: boolean }>(`/admin/languages/${encodeURIComponent(code)}`, { enabled });
}
