import { z } from "zod";

/**
 * Statuts du cycle de vie d'une entreprise (section 8.1), synchronisés avec
 * backend/src/modules/tenants/domain/tenant-status.ts (TenantStatus enum).
 */
export const tenantStatusSchema = z.enum(["DRAFT", "ACTIVE", "SUSPENDED", "ARCHIVED"]);
export type TenantStatus = z.infer<typeof tenantStatusSchema>;

/**
 * Représentation d'une entreprise cliente (tenant) côté admin.
 *
 * NOTE: le backend n'expose pas encore d'endpoint `GET /admin/tenants` de
 * liste (seuls POST /admin/tenants, POST /admin/tenants/:id/suspend et
 * GET /admin/tenants/:id existent à ce jour) — voir le rapport de livraison.
 * Ce schéma est volontairement permissif (passthrough) pour absorber les
 * champs additionnels renvoyés par la fiche 360° (GET /admin/tenants/:id)
 * sans casser au premier changement de forme côté backend.
 */
export const tenantSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    status: tenantStatusSchema,
    statusReason: z.string().nullish(),
    country: z.string(),
    currency: z.string(),
    defaultLocale: z.string(),
    logoUrl: z.string().nullish(),
    createdAt: z.coerce.date().optional(),
  })
  .passthrough();

export type Tenant = z.infer<typeof tenantSchema>;

/** Doit rester cohérent avec CreateTenantDto (backend/.../tenants/presentation/dto/create-tenant.dto.ts). */
export const createTenantSchema = z
  .object({
    name: z.string().min(2, "2 caractères minimum.").max(200),
    slug: z
      .string()
      .min(2, "2 caractères minimum.")
      .max(63, "63 caractères maximum.")
      .regex(/^[a-z0-9-]+$/, "Minuscules, chiffres et tirets uniquement."),
    country: z.string().length(2, "Code pays ISO sur 2 lettres (ex. CI)."),
    currency: z.string().length(3, "Code devise ISO sur 3 lettres (ex. XOF)."),
    defaultLocale: z.string().min(2).max(5),
    owner: z.object({
      email: z.string().min(1, "E-mail requis.").email("Adresse e-mail invalide."),
      firstName: z.string().min(1, "Prénom requis.").max(100),
      lastName: z.string().min(1, "Nom requis.").max(100),
      /** Optionnel : vide = le propriétaire reçoit un lien d'activation. Même politique que l'activation (8-128). */
      password: z
        .string()
        .max(128, "128 caractères maximum.")
        .refine(
          (value) => value === "" || value.length >= 8,
          "Le mot de passe doit contenir au moins 8 caractères.",
        )
        .optional(),
      confirmPassword: z.string().optional(),
    }),
  })
  .refine((values) => (values.owner.password ?? "") === (values.owner.confirmPassword ?? ""), {
    path: ["owner", "confirmPassword"],
    message: "Les deux mots de passe ne correspondent pas.",
  });

export type CreateTenantValues = z.infer<typeof createTenantSchema>;

/** Doit rester cohérent avec SuspendTenantDto. */
export const suspendTenantSchema = z.object({
  reason: z.string().min(3, "3 caractères minimum.").max(500),
});

export type SuspendTenantValues = z.infer<typeof suspendTenantSchema>;

/** Corps envoyé à POST /admin/tenants : sans confirmation, et sans mot de passe s'il est vide. */
export function toCreateTenantPayload(values: CreateTenantValues) {
  const { password, confirmPassword: _confirm, ...owner } = values.owner;
  return { ...values, owner: password ? { ...owner, password } : owner };
}

/** Doit rester cohérent avec UpdateTenantDto (le sous-domaine n'est pas modifiable). */
export const updateTenantSchema = z.object({
  name: z.string().min(2, "2 caractères minimum.").max(200, "200 caractères maximum."),
  country: z.string().length(2, "Code pays ISO sur 2 lettres (ex. CI)."),
  currency: z.string().length(3, "Code devise ISO sur 3 lettres (ex. XOF)."),
  defaultLocale: z.string().min(2, "Code langue requis.").max(5),
  contactEmail: z.string().email("Adresse e-mail invalide.").or(z.literal("")),
  contactPhone: z
    .string()
    .regex(/^\+?[0-9 ().-]{6,20}$/, "Numéro de téléphone invalide.")
    .or(z.literal("")),
});
export type UpdateTenantValues = z.infer<typeof updateTenantSchema>;

/** Logo : lien https, ou fichier téléversé sur la plateforme (`…/assets/logos/<id>.png`, en http possible en développement). */
const UPLOADED_LOGO = /^https?:\/\/[^/?#]+\/(?:[^?#]*\/)?assets\/logos\/[0-9a-f-]{36}\.(?:png|jpg|webp)$/i;
export function isLogoUrl(value: string): boolean {
  return /^https:\/\//i.test(value) || UPLOADED_LOGO.test(value);
}

/** Identité visuelle (GET / PUT /admin/tenants/:id/branding) : logo https, couleurs #RRGGBB, tous facultatifs. */
export const tenantBrandingSchema = z.object({
  displayName: z.string(),
  logoUrl: z.string().nullable(),
  primaryColor: z.string().nullable(),
  secondaryColor: z.string().nullable(),
});
export type TenantBranding = z.infer<typeof tenantBrandingSchema>;

export const brandingFormSchema = z.object({
  logoUrl: z
    .string()
    .trim()
    .max(500, "500 caractères maximum.")
    .refine((value) => value === "" || isLogoUrl(value), "L’URL du logo doit commencer par https://"),
  primaryColor: z.string().trim().regex(/^(#[0-9a-fA-F]{6})?$/, "Couleur au format #RRGGBB."),
  secondaryColor: z.string().trim().regex(/^(#[0-9a-fA-F]{6})?$/, "Couleur au format #RRGGBB."),
});
export type BrandingFormValues = z.infer<typeof brandingFormSchema>;

/** Corps de PUT : une valeur vide efface le champ. */
export function toBrandingPayload(values: BrandingFormValues) {
  return {
    logoUrl: values.logoUrl === "" ? null : values.logoUrl,
    primaryColor: values.primaryColor === "" ? null : values.primaryColor,
    secondaryColor: values.secondaryColor === "" ? null : values.secondaryColor,
  };
}
