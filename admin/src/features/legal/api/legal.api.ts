import { legalDocumentSchema } from "../schemas/legal.schema";
import type { LegalDocument, LegalDraftFormValues, LegalType } from "../schemas/legal.schema";

import { apiClient } from "@/lib/api-client";

/** GET /admin/legal — toutes les versions (ADM-41). */
export async function fetchLegalDocuments(): Promise<LegalDocument[]> {
  return legalDocumentSchema.array().parse(await apiClient.get<unknown[]>("/admin/legal"));
}

/** POST /admin/legal — nouvelle version en brouillon. */
export async function createLegalDraft(type: LegalType, values: LegalDraftFormValues): Promise<{ id: string }> {
  return apiClient.post<{ id: string }, LegalDraftFormValues & { type: LegalType }>("/admin/legal", { type, ...values });
}

/** PUT /admin/legal/:id — modification d'un brouillon. */
export async function updateLegalDraft(id: string, values: LegalDraftFormValues): Promise<{ id: string }> {
  return apiClient.put<{ id: string }, LegalDraftFormValues>(`/admin/legal/${id}`, values);
}

/** POST /admin/legal/:id/publish — la version devient la version courante de son type. */
export async function publishLegalDocument(id: string): Promise<{ id: string }> {
  return apiClient.post<{ id: string }>(`/admin/legal/${id}/publish`);
}
