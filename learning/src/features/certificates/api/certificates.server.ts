import "server-only";

import { verificationSchema } from "../schemas/certificate.schema";

import { serverGet } from "@/lib/server-api";

/** Vérification publique (lien du QR code), rendue côté serveur. */
export function verifyCertificate(number: string) {
  return serverGet(`/public/certificates/verify/${encodeURIComponent(number)}`, verificationSchema);
}
