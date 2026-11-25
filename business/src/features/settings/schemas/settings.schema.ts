import { z } from "zod";

/** GET /business/settings (backend/.../tenants/application/tenant-settings.use-cases.ts, TenantSettingsView). */
export const payoutAccountViewSchema = z.object({
  type: z.enum(["MOBILE_MONEY", "BANK"]),
  operator: z.string().nullable(),
  accountName: z.string(),
  /** `***1234` : le numéro en clair n'est jamais renvoyé par l'API. */
  maskedNumber: z.string(),
});

export const tenantSettingsSchema = z.object({
  displayName: z.string(),
  branding: z.object({
    logoUrl: z.string().nullable(),
    primaryColor: z.string().nullable(),
    secondaryColor: z.string().nullable(),
  }),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  legalInfo: z.object({
    legalName: z.string().nullable(),
    registrationNumber: z.string().nullable(),
    taxId: z.string().nullable(),
    address: z.string().nullable(),
  }),
  offlinePayment: z.object({ enabled: z.boolean(), instructions: z.string().nullable() }),
  payoutAccount: payoutAccountViewSchema.nullable(),
  payoutAccountVerified: z.boolean(),
});
export type TenantSettings = z.infer<typeof tenantSettingsSchema>;

export const MOBILE_MONEY_OPERATORS = ["ORANGE_MONEY", "MTN_MOMO", "MOOV_MONEY", "WAVE"] as const;
export const MOBILE_OPERATOR_LABELS: Record<(typeof MOBILE_MONEY_OPERATORS)[number], string> = {
  ORANGE_MONEY: "Orange Money",
  MTN_MOMO: "MTN MoMo",
  MOOV_MONEY: "Moov Money",
  WAVE: "Wave",
};

export const OFFLINE_INSTRUCTIONS_MAX_LENGTH = 2000;

/** Un champ vide devient `null` (effacement) ; sinon texte rogné. */
const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} : ${max} caractères maximum.`)
    .transform((value) => (value === "" ? null : value));

const hexColor = z
  .string()
  .trim()
  .refine((value) => value === "" || /^#[0-9a-fA-F]{6}$/.test(value), "Format attendu : #RRGGBB (ex. #1D4ED8).")
  .transform((value) => (value === "" ? null : value.toUpperCase()));

/** Doit rester cohérent avec UpdateBrandingDto / normalizeHttpsUrl (https uniquement). */
const httpsUrl = z
  .string()
  .trim()
  .max(500, "500 caractères maximum.")
  .refine((value) => {
    if (value === "") return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Une URL https:// valide est requise.")
  .transform((value) => (value === "" ? null : value));

export const brandingFormSchema = z.object({
  displayName: z.string().trim().min(1, "Le nom d’affichage est obligatoire.").max(120, "120 caractères maximum."),
  logoUrl: httpsUrl,
  primaryColor: hexColor,
  secondaryColor: hexColor,
});
export type BrandingFormInput = z.input<typeof brandingFormSchema>;
export type BrandingFormValues = z.output<typeof brandingFormSchema>;

export const contactsFormSchema = z.object({
  contactEmail: z
    .string()
    .trim()
    .max(254, "254 caractères maximum.")
    .refine((value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value), "Adresse e-mail invalide.")
    .transform((value) => (value === "" ? null : value)),
  contactPhone: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (/^\+?[0-9 .-]+$/.test(value) && /^\+?[0-9]{8,15}$/.test(value.replace(/[ .-]/g, ""))),
      "8 à 15 chiffres, « + » initial autorisé.",
    )
    .transform((value) => (value === "" ? null : value)),
  legalName: optionalText("Raison sociale", 200),
  registrationNumber: optionalText("Numéro d’immatriculation", 60),
  taxId: optionalText("Identifiant fiscal", 60),
  address: optionalText("Adresse", 300),
});
export type ContactsFormInput = z.input<typeof contactsFormSchema>;
export type ContactsFormValues = z.output<typeof contactsFormSchema>;

export const offlinePaymentFormSchema = z
  .object({
    enabled: z.boolean(),
    instructions: z
      .string()
      .trim()
      .max(OFFLINE_INSTRUCTIONS_MAX_LENGTH, `${OFFLINE_INSTRUCTIONS_MAX_LENGTH} caractères maximum.`)
      .refine((value) => !/[<>]/.test(value), "Le HTML n’est pas autorisé (texte brut uniquement)."),
  })
  .refine((value) => !value.enabled || value.instructions.length > 0, {
    path: ["instructions"],
    message: "Des instructions sont obligatoires pour activer le paiement hors plateforme.",
  });
export type OfflinePaymentFormValues = z.infer<typeof offlinePaymentFormSchema>;

/** IBAN : forme + clé modulo 97 (même contrôle que le backend). */
export function isValidIban(value: string): boolean {
  const iban = value.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const numeric = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55));
  let remainder = 0;
  for (const digit of numeric) remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder === 1;
}

/** RIB à 23 caractères : seule la forme est vérifiée ici, la clé est contrôlée par le backend. */
export function looksLikeRib(value: string): boolean {
  return /^\d{10}[A-Z0-9]{11}\d{2}$/.test(value.replace(/[\s-]/g, "").toUpperCase());
}

export const payoutAccountFormSchema = z
  .object({
    type: z.enum(["MOBILE_MONEY", "BANK"]),
    operator: z.enum(MOBILE_MONEY_OPERATORS).optional(),
    accountNumber: z.string().trim().min(1, "Le numéro est obligatoire.").max(60, "60 caractères maximum."),
    accountName: z.string().trim().min(2, "Le titulaire est obligatoire.").max(120, "120 caractères maximum."),
    currentPassword: z.string().min(1, "Le mot de passe actuel est obligatoire.").max(200),
  })
  .superRefine((value, ctx) => {
    if (value.type === "MOBILE_MONEY") {
      if (!value.operator) ctx.addIssue({ code: "custom", path: ["operator"], message: "Choisissez un opérateur." });
      const compact = value.accountNumber.replace(/[ .-]/g, "");
      if (!/^\+?[0-9]{8,15}$/.test(compact)) {
        ctx.addIssue({ code: "custom", path: ["accountNumber"], message: "Numéro invalide (8 à 15 chiffres)." });
      }
    } else if (!isValidIban(value.accountNumber) && !looksLikeRib(value.accountNumber)) {
      ctx.addIssue({ code: "custom", path: ["accountNumber"], message: "IBAN ou RIB invalide (clé de contrôle incorrecte)." });
    }
  });
export type PayoutAccountFormValues = z.infer<typeof payoutAccountFormSchema>;
