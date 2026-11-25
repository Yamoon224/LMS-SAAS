import { z } from "zod";

import {
  BORDER_LABELS,
  DEFAULT_DESIGN_VALUES,
  designFormSchema,
  designFromFormValues,
  designSchema,
  FONT_LABELS,
  ORIENTATION_LABELS,
} from "./certificate-design-form";

/** Doit rester cohérent avec CertificateStatus (backend/.../certificates/domain/certificate-status.ts). */
export const certificateStatusSchema = z.enum(["VALID", "REVOKED", "REISSUED"]);
export type CertificateStatus = z.infer<typeof certificateStatusSchema>;

export const CERTIFICATE_STATUS_LABELS: Record<CertificateStatus, string> = {
  VALID: "Valide",
  REVOKED: "Révoqué",
  REISSUED: "Réémis",
};

/** GET /business/certificates (ENT-42/ENT-43) — DTO aplati. */
export const certificateListItemSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: certificateStatusSchema,
  learnerName: z.string(),
  courseTitle: z.string(),
  scorePercent: z.number().nullish(),
  issuedAt: z.coerce.date(),
  revocationReason: z.string().nullish(),
});
export type CertificateListItem = z.infer<typeof certificateListItemSchema>;

/** GET /business/certificates/templates (ENT-38). */
export const certificateTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
});
export type CertificateTemplate = z.infer<typeof certificateTemplateSchema>;

/** Doit rester cohérent avec RevokeCertificateDto (motif obligatoire, ENT-44). */
export const revokeCertificateSchema = z.object({
  reason: z.string().trim().min(1, "Le motif de révocation est obligatoire."),
});
export type RevokeCertificateValues = z.infer<typeof revokeCertificateSchema>;

/** Doit rester cohérent avec CreateCertificateTemplateDto / CertificateDesignDto (ENT-38). */
export const createTemplateSchema = designFormSchema.extend({
  name: z.string().trim().min(2, "Au moins 2 caractères.").max(200),
  isDefault: z.boolean(),
});
export type CreateTemplateValues = z.infer<typeof createTemplateSchema>;

/** Valeurs initiales d'un nouveau modèle. */
export const DEFAULT_TEMPLATE_VALUES: CreateTemplateValues = { ...DEFAULT_DESIGN_VALUES, name: "", isDefault: false };

/** Corps attendu par le backend : les champs de design vides sont omis (valeurs par défaut côté rendu). */
export function toCreateTemplateBody(values: CreateTemplateValues) {
  const { name, isDefault, ...design } = values;
  return { name, isDefault, design: designFromFormValues(design) };
}

/** GET /business/certificate-library — modèles publiés de la plateforme (ADM-39). */
export const libraryTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  design: designSchema,
});
export type LibraryTemplate = z.infer<typeof libraryTemplateSchema>;

export { BORDER_LABELS, FONT_LABELS, ORIENTATION_LABELS };
