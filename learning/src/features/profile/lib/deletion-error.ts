import { ApiError } from "../../../lib/api-client";
import type { Copy } from "../../../lib/i18n/types";

/** Message localisé selon le code métier du backend (les messages serveur sont en français, donc jamais affichés tels quels). */
export function deletionErrorMessage(error: unknown, copy: Copy["myData"]): string {
  if (error instanceof ApiError) {
    if (error.code === "MOT_DE_PASSE_INCORRECT") return copy.wrongPassword;
    if (error.code === "SUPPRESSION_COMPTE_BLOQUEE") return copy.blocked;
    if (error.status === 429) return copy.tooManyRequests;
  }
  return copy.deleteFailed;
}
