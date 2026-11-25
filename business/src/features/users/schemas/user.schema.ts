import { z } from "zod";

/** Doit rester cohérent avec UserStatus (backend/.../users/domain/user-status.ts). */
export const userStatusSchema = z.enum(["INVITED", "ACTIVE", "SUSPENDED", "DEACTIVATED"]);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  INVITED: "Invité",
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  DEACTIVATED: "Désactivé",
};

/** GET /business/users : DTO aplati (id, email, fullName, status, roleIds). */
export const businessUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string().nullish(),
  status: userStatusSchema,
  roleIds: z.array(z.string()).default([]),
});
export type BusinessUser = z.infer<typeof businessUserSchema>;

/** GET /business/users/roles : { id, name } (route additive, voir rapport). */
export const roleSchema = z.object({ id: z.string(), name: z.string() });
export type Role = z.infer<typeof roleSchema>;

/** Doit rester cohérent avec InviteUserDto (backend/.../users/presentation/dto/invite-user.dto.ts). */
export const inviteUserSchema = z.object({
  email: z.string().email("Adresse e-mail invalide."),
  firstName: z.string().min(1, "Prénom requis.").max(100),
  lastName: z.string().min(1, "Nom requis.").max(100),
  phone: z.string().optional().or(z.literal("")),
  locale: z.string().min(2).max(5),
  roleIds: z.array(z.string()).min(1, "Choisissez au moins un rôle."),
});
export type InviteUserValues = z.infer<typeof inviteUserSchema>;

export const LOCALE_OPTIONS = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
] as const;

/** Rôle « Formateur / Concepteur » (default-tenant-roles.ts) : sélectionne les formateurs assignables aux formations. */
export function isTrainerRole(role: Role): boolean {
  return role.name.toLowerCase().startsWith("formateur");
}

/** Nom du rôle Propriétaire (backend/.../users/domain/default-tenant-roles.ts : TENANT_OWNER_ROLE_NAME). */
export const TENANT_OWNER_ROLE_NAME = "Propriétaire d'entreprise";

/** Le Propriétaire ne peut être ni suspendu ni désactivé (ACTION_INTERDITE_SUR_SOI_OU_PROPRIETAIRE). */
export function isOwnerRole(role: Role): boolean {
  return role.name === TENANT_OWNER_ROLE_NAME;
}

/** GET /business/users/trainers : formateurs ACTIFS, id + nom uniquement (permission courses.manage). */
export const trainerSchema = z.object({ id: z.string(), fullName: z.string().nullish() });
export type Trainer = z.infer<typeof trainerSchema>;

/** Doit rester cohérent avec InviteLearnerDto (invite-learner.dto.ts) : jamais de roleIds. */
export const inviteLearnerSchema = z.object({
  email: z.string().email("Adresse e-mail invalide."),
  firstName: z.string().min(1, "Prénom requis.").max(100),
  lastName: z.string().min(1, "Nom requis.").max(100),
  phone: z
    .string()
    .refine((value) => value === "" || (value.length >= 5 && value.length <= 20), "Entre 5 et 20 caractères.")
    .optional(),
  locale: z.string().min(2).max(5),
});
export type InviteLearnerValues = z.infer<typeof inviteLearnerSchema>;

/** Transitions autorisées (miroir de user-status.ts côté backend ; le backend reste l'autorité). */
export const ALLOWED_USER_STATUS_TRANSITIONS: Record<UserStatus, UserStatus[]> = {
  INVITED: ["ACTIVE", "DEACTIVATED"],
  ACTIVE: ["SUSPENDED", "DEACTIVATED"],
  SUSPENDED: ["ACTIVE", "DEACTIVATED"],
  DEACTIVATED: [],
};
