import { z } from "zod";

import { designFormSchema, designFromFormValues, designSchema, designToFormValues } from "./certificate-design-form";
import type { CertificateDesignData } from "./certificate-design-form";

export * from "./certificate-design-form";

export type LibraryDesign = CertificateDesignData;

/** GET /admin/certificate-library */
export const libraryTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  design: designSchema,
  isPublished: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  warnings: z.string().array(),
});
export type LibraryTemplate = z.infer<typeof libraryTemplateSchema>;

/** Doit rester cohérent avec SaveLibraryTemplateDto côté backend. */
export const libraryFormSchema = designFormSchema.extend({
  name: z.string().trim().min(2, "2 caractères minimum.").max(120, "120 caractères maximum."),
  description: z.string().trim().max(500, "500 caractères maximum."),
});
export type LibraryFormValues = z.infer<typeof libraryFormSchema>;

export function toDesign(values: LibraryFormValues): LibraryDesign {
  return designFromFormValues(values);
}

export function toFormValues(template?: LibraryTemplate): LibraryFormValues {
  return {
    ...designToFormValues(template?.design),
    name: template?.name ?? "",
    description: template?.description ?? "",
  };
}
