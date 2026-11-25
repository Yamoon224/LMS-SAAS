import type {
  CertificateListItem,
  CertificateTemplate,
  CreateTemplateValues,
  LibraryTemplate,
} from "../schemas/certificate.schema";
import {
  certificateListItemSchema,
  certificateTemplateSchema,
  libraryTemplateSchema,
  toCreateTemplateBody,
} from "../schemas/certificate.schema";

import { apiClient } from "@/lib/api-client";

/** GET /business/certificates (ListCertificatesUseCase.listForTenant) — ENT-42/ENT-43. */
export async function fetchCertificates(): Promise<CertificateListItem[]> {
  const data = await apiClient.get<unknown[]>("/business/certificates");
  return certificateListItemSchema.array().parse(data);
}

/** GET /business/certificates/:id/download-url — URL signée à durée courte (5 min). */
export async function fetchCertificateDownloadUrl(certificateId: string): Promise<string> {
  const data = await apiClient.get<{ url: string }>(`/business/certificates/${certificateId}/download-url`);
  return data.url;
}

/** POST /business/certificates/:id/revoke — motif obligatoire (ENT-44). */
export async function revokeCertificate(certificateId: string, reason: string): Promise<{ certificateId: string }> {
  return apiClient.post<{ certificateId: string }, { reason: string }>(
    `/business/certificates/${certificateId}/revoke`,
    { reason },
  );
}

/** POST /business/certificates/:id/reissue (ENT-44) — l'original passe en REISSUED. */
export async function reissueCertificate(certificateId: string): Promise<{ id: string; number: string }> {
  return apiClient.post<{ id: string; number: string }>(`/business/certificates/${certificateId}/reissue`);
}

/** GET /business/certificates/templates (ENT-38). */
export async function fetchCertificateTemplates(): Promise<CertificateTemplate[]> {
  const data = await apiClient.get<unknown[]>("/business/certificates/templates");
  return certificateTemplateSchema.array().parse(data);
}

/** POST /business/certificates/templates (ENT-38). */
export async function createCertificateTemplate(values: CreateTemplateValues): Promise<CertificateTemplate> {
  const data = await apiClient.post<unknown, ReturnType<typeof toCreateTemplateBody>>(
    "/business/certificates/templates",
    toCreateTemplateBody(values),
  );
  return certificateTemplateSchema.parse(data);
}

/** GET /business/certificate-library — modèles publiés proposés par la plateforme (ADM-39). */
export async function fetchLibraryTemplates(): Promise<LibraryTemplate[]> {
  return libraryTemplateSchema.array().parse(await apiClient.get<unknown[]>("/business/certificate-library"));
}

/** POST …/:id/install — crée une COPIE dans les modèles de l'entreprise. */
export async function installLibraryTemplate(id: string, makeDefault: boolean): Promise<unknown> {
  return apiClient.post<unknown, { makeDefault: boolean }>(
    `/business/certificate-library/${encodeURIComponent(id)}/install`,
    { makeDefault },
  );
}

/** GET …/:id/preview — PDF d'aperçu (données fictives) ; les erreurs du backend sont relues en JSON. */
export async function fetchLibraryPreview(id: string): Promise<Blob> {
  const response = await fetch(`/api/backend/business/certificate-library/${encodeURIComponent(id)}/preview`);
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "Aperçu impossible.");
  }
  return response.blob();
}
