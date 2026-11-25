import { pendingLegalSchema } from "../schemas/pending-legal.schema";
import type { PendingLegal } from "../schemas/pending-legal.schema";

import { apiClient } from "@/lib/api-client";

/** GET /public/legal/pending. */
export async function fetchPendingLegal(): Promise<PendingLegal[]> {
  return pendingLegalSchema.array().parse(await apiClient.get<unknown>("/public/legal/pending"));
}

/** POST /public/legal/:type/accept — la version précise affichée est transmise (refusée si elle a changé). */
export async function acceptLegal(document: PendingLegal): Promise<{ version: number }> {
  return apiClient.post<{ version: number }, { version: number }>(
    `/public/legal/${encodeURIComponent(document.type)}/accept`,
    { version: document.version },
  );
}
