import { z } from "zod";

/** GET /public/certificates/by-enrollment/:enrollmentId */
export const certificateSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: z.string(),
  issuedAt: z.string().nullish(),
  downloadUrl: z.string().nullish(),
});
export type Certificate = z.infer<typeof certificateSchema>;

/** GET /public/certificates/verify/:number */
export const verificationSchema = z.object({
  valid: z.boolean(),
  /** ATTESTATION pour un numéro ATT-… ; absent/CERTIFICATE sinon. */
  type: z.string().nullish(),
  progressPercent: z.number().nullish(),
  learnerName: z.string().nullish(),
  courseTitle: z.string().nullish(),
  issuedAt: z.string().nullish(),
  status: z.string().nullish(),
});
export type Verification = z.infer<typeof verificationSchema>;

/** GET /public/attestations/mine (attestation de suivi, formation non certifiante). */
export const attestationSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: z.string(),
  courseTitle: z.string(),
  progressPercent: z.number(),
  durationMinutes: z.number().nullish(),
  startedAt: z.string().nullish(),
  endedAt: z.string().nullish(),
  issuedAt: z.string().nullish(),
});
export type Attestation = z.infer<typeof attestationSchema>;
