import { certificateSchema } from "../schemas/certificate.schema";
import type { Certificate } from "../schemas/certificate.schema";

import { ApiError, apiClient } from "@/lib/api-client";

/** Certificat d'une inscription ; `null` si aucun n'a été délivré (404). */
export async function fetchCertificate(enrollmentId: string): Promise<Certificate | null> {
  try {
    const data = await apiClient.get<unknown>(`/public/certificates/by-enrollment/${encodeURIComponent(enrollmentId)}`);
    return certificateSchema.parse(data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
