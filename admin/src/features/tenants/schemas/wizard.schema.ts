import { z } from "zod";

import { brandingFormSchema, createTenantSchema, updateTenantSchema } from "./tenant.schema";

/** Pourcentage de commission : « 12 », « 7.5 » ; vide = on garde la règle globale de la plateforme. */
const commissionPercent = z
  .string()
  .trim()
  .refine((value) => value === "" || (/^\d{1,3}(\.\d{1,2})?$/.test(value) && Number(value) <= 100), "Pourcentage entre 0 et 100 (ex. 12 ou 7.5).");

/** Étapes de l'assistant de création, dans l'ordre. */
export type WizardStepId = "company" | "identity" | "owner" | "billing" | "review";

/** Champs validés avant de quitter chaque étape. */
export const STEP_FIELDS: Record<WizardStepId, readonly string[]> = {
  company: ["name", "slug", "country", "currency", "defaultLocale"],
  identity: ["contactEmail", "contactPhone", "logoUrl", "primaryColor", "secondaryColor"],
  owner: ["owner.email", "owner.firstName", "owner.lastName", "owner.password", "owner.confirmPassword"],
  billing: ["planPriceId", "onlineCommission", "offlineCommission"],
  review: [],
};

const ownerBase = createTenantSchema.innerType().shape.owner;

/** Valeurs de l'assistant : identité de l'entreprise, contacts, charte, propriétaire, facturation, activation. */
export const wizardSchema = z
  .object({
    name: updateTenantSchema.shape.name,
    slug: createTenantSchema.innerType().shape.slug,
    country: updateTenantSchema.shape.country,
    currency: updateTenantSchema.shape.currency,
    defaultLocale: updateTenantSchema.shape.defaultLocale,
    contactEmail: updateTenantSchema.shape.contactEmail,
    contactPhone: updateTenantSchema.shape.contactPhone,
    logoUrl: brandingFormSchema.shape.logoUrl,
    primaryColor: brandingFormSchema.shape.primaryColor,
    secondaryColor: brandingFormSchema.shape.secondaryColor,
    owner: ownerBase,
    /** Prix de plan à attribuer (vide = aucun plan pour l'instant). */
    planPriceId: z.string(),
    startWithTrial: z.boolean(),
    onlineCommission: commissionPercent,
    offlineCommission: commissionPercent,
    activateNow: z.boolean(),
  })
  .refine((values) => (values.owner.password ?? "") === (values.owner.confirmPassword ?? ""), {
    path: ["owner", "confirmPassword"],
    message: "Les deux mots de passe ne correspondent pas.",
  });

export type WizardValues = z.infer<typeof wizardSchema>;

export const WIZARD_DEFAULTS: WizardValues = {
  name: "",
  slug: "",
  country: "CI",
  currency: "XOF",
  defaultLocale: "fr",
  contactEmail: "",
  contactPhone: "",
  logoUrl: "",
  primaryColor: "",
  secondaryColor: "",
  owner: { email: "", firstName: "", lastName: "", password: "", confirmPassword: "" },
  planPriceId: "",
  startWithTrial: false,
  onlineCommission: "",
  offlineCommission: "",
  activateNow: false,
};
