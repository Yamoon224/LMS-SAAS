import { attestationSchema } from "../schemas/certificate.schema";
import type { Attestation } from "../schemas/certificate.schema";

import { apiClient } from "@/lib/api-client";

export async function fetchMyAttestations(): Promise<Attestation[]> {
  const data = await apiClient.get<unknown>("/public/attestations/mine");
  return attestationSchema.array().parse(data);
}

/** URL signée à durée limitée : demandée au clic (elle expire en quelques minutes). */
export async function fetchAttestationDownloadUrl(id: string): Promise<string> {
  const data = await apiClient.get<{ url: string }>(`/public/attestations/${encodeURIComponent(id)}/download-url`);
  return data.url;
}
