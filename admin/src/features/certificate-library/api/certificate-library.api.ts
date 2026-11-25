import { libraryTemplateSchema, toDesign } from "../schemas/certificate-library.schema";
import type { LibraryDesign, LibraryFormValues, LibraryTemplate } from "../schemas/certificate-library.schema";

import { apiClient } from "@/lib/api-client";

const BASE = "/admin/certificate-library";

/** GET — tous les modèles de la bibliothèque (ADM-39). */
export async function fetchLibraryTemplates(): Promise<LibraryTemplate[]> {
  return libraryTemplateSchema.array().parse(await apiClient.get<unknown[]>(BASE));
}

function toBody(values: LibraryFormValues) {
  return { name: values.name, description: values.description || undefined, design: toDesign(values) };
}

export async function createLibraryTemplate(values: LibraryFormValues): Promise<{ id: string }> {
  return apiClient.post<{ id: string }, ReturnType<typeof toBody>>(BASE, toBody(values));
}

export async function updateLibraryTemplate(id: string, values: LibraryFormValues): Promise<unknown> {
  return apiClient.put<unknown, ReturnType<typeof toBody>>(`${BASE}/${encodeURIComponent(id)}`, toBody(values));
}

export async function setLibraryTemplatePublished(id: string, published: boolean): Promise<unknown> {
  return apiClient.post<unknown>(`${BASE}/${encodeURIComponent(id)}/${published ? "publish" : "unpublish"}`, {});
}

export async function deleteLibraryTemplate(id: string): Promise<unknown> {
  return apiClient.delete<unknown>(`${BASE}/${encodeURIComponent(id)}`);
}

/**
 * POST /preview — PDF d'aperçu avec des données fictives, sans rien enregistrer. Renvoie un Blob : les erreurs du
 * backend (design invalide) sont relues en JSON pour afficher leur message.
 */
export async function fetchDesignPreview(design: LibraryDesign): Promise<Blob> {
  const response = await fetch(`/api/backend${BASE}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ design }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(data.message) ? data.message.join(" ") : data.message;
    throw new Error(message ?? "Aperçu impossible.");
  }
  return response.blob();
}
