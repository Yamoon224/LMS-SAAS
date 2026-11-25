import { attestationListItemSchema } from "../schemas/attestation.schema";
import type { AttestationListItem } from "../schemas/attestation.schema";

import { apiClient } from "@/lib/api-client";

/** GET /business/attestations (ENT-44). */
export async function fetchAttestations(): Promise<AttestationListItem[]> {
  const data = await apiClient.get<unknown[]>("/business/attestations");
  return attestationListItemSchema.array().parse(data);
}

/** GET /business/attestations/:id/download-url — URL signée à durée courte (5 min). */
export async function fetchAttestationDownloadUrl(attestationId: string): Promise<string> {
  const data = await apiClient.get<{ url: string }>(`/business/attestations/${attestationId}/download-url`);
  return data.url;
}

/** POST /business/attestations/:id/revoke — motif obligatoire, tracé au journal d'audit. */
export async function revokeAttestation(attestationId: string, reason: string): Promise<{ attestationId: string }> {
  return apiClient.post<{ attestationId: string }, { reason: string }>(
    `/business/attestations/${attestationId}/revoke`,
    { reason },
  );
}
