import { z } from "zod";

/** GET /admin/languages (backend/.../languages/domain/language.ts). */
export const languageSchema = z.object({
  code: z.string(),
  nativeName: z.string(),
  rtl: z.boolean(),
  enabled: z.boolean(),
  /** Vrai pour le français, langue par défaut : l'interrupteur est verrouillé. */
  locked: z.boolean(),
});
export type Language = z.infer<typeof languageSchema>;
