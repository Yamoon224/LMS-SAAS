import { z } from "zod";

/** Doit rester cohérent avec AttestationStatus (backend/.../certificates/domain/attestation-status.ts). */
export const attestationStatusSchema = z.enum(["VALID", "REVOKED"]);
export type AttestationStatus = z.infer<typeof attestationStatusSchema>;

export const ATTESTATION_STATUS_LABELS: Record<AttestationStatus, string> = {
  VALID: "Valide",
  REVOKED: "Révoquée",
};

/** GET /business/attestations (ENT-44) — DTO aplati. */
export const attestationListItemSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: attestationStatusSchema,
  learnerName: z.string(),
  courseTitle: z.string(),
  progressPercent: z.number(),
  issuedAt: z.string(),
  revocationReason: z.string().nullish(),
});
export type AttestationListItem = z.infer<typeof attestationListItemSchema>;
