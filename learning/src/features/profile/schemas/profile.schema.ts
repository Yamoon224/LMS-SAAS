import { z } from "zod";

import { LOCALES } from "@/lib/i18n/locales";
import type { Copy } from "@/lib/i18n/types";

/** GET /public/account/me. */
export const profileSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  locale: z.string(),
});
export type Profile = z.infer<typeof profileSchema>;

/** Doit rester cohérent avec UpdateOwnProfileDto (backend/.../users/presentation/dto/update-own-profile.dto.ts). */
export const createProfileFormSchema = (copy: Copy) =>
  z.object({
  firstName: z.string().trim().min(1, copy.profile.firstNameRequired).max(100),
  lastName: z.string().trim().min(1, copy.profile.lastNameRequired).max(100),
  phone: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\+?[0-9 ().-]{6,20}$/.test(value), copy.profile.phoneInvalid),
  locale: z.enum(LOCALES as unknown as [string, ...string[]]),
});
export type ProfileFormValues = z.infer<ReturnType<typeof createProfileFormSchema>>;

/** GET /public/languages — langues activées sur la plateforme (ADM-40). */
export const enabledLanguageSchema = z.object({
  code: z.string(),
  nativeName: z.string(),
  rtl: z.boolean(),
});
export type EnabledLanguage = z.infer<typeof enabledLanguageSchema>;
