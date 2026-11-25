import { z } from "zod";

/** Doit rester cohérent avec backend/.../legal/domain/legal-document.ts. */
export const legalTypeSchema = z.enum(["TERMS_OF_USE", "TERMS_OF_SALE", "PRIVACY_POLICY"]);
export type LegalType = z.infer<typeof legalTypeSchema>;

export const LEGAL_TYPES: LegalType[] = ["TERMS_OF_USE", "TERMS_OF_SALE", "PRIVACY_POLICY"];

export const LEGAL_TYPE_LABELS: Record<LegalType, string> = {
  TERMS_OF_USE: "Conditions générales d'utilisation (CGU)",
  TERMS_OF_SALE: "Conditions générales de vente (CGV)",
  PRIVACY_POLICY: "Politique de confidentialité",
};

/** GET /admin/legal */
export const legalDocumentSchema = z.object({
  id: z.string(),
  type: legalTypeSchema,
  version: z.number(),
  title: z.string(),
  content: z.string(),
  publishedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  acceptancesCount: z.number(),
});
export type LegalDocument = z.infer<typeof legalDocumentSchema>;

/** Doit rester cohérent avec CreateLegalDraftDto / UpdateLegalDraftDto. */
export const legalDraftFormSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire.").max(200, "200 caractères maximum."),
  content: z.string().trim().min(1, "Le contenu est obligatoire.").max(200_000, "Contenu trop long."),
});
export type LegalDraftFormValues = z.infer<typeof legalDraftFormSchema>;
