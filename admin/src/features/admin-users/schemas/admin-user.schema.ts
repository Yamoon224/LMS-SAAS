import { z } from "zod";

/** Doit rester cohérent avec UserStatus (backend/.../users/domain/user-status.ts). */
export const userStatusSchema = z.enum(["INVITED", "ACTIVE", "SUSPENDED", "DEACTIVATED"]);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  INVITED: "En attente d'activation",
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  DEACTIVATED: "Désactivé",
};

/** Représentation d'un compte admin plateforme (GET /admin/users). */
export const adminUserSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    fullName: z.string(),
    phone: z.string().nullish(),
    status: userStatusSchema,
    roleIds: z.array(z.string()).default([]),
  })
  .passthrough();
export type AdminUser = z.infer<typeof adminUserSchema>;

/** Rôle plateforme (GET /admin/users/roles), issu de RoleRecord. */
export const roleSchema = z.object({
  id: z.string(),
  tenantId: z.string().nullable(),
  name: z.string(),
});
export type Role = z.infer<typeof roleSchema>;

/** Doit rester cohérent avec InviteUserDto. */
export const inviteAdminUserSchema = z.object({
  email: z.string().min(1, "E-mail requis.").email("Adresse e-mail invalide."),
  firstName: z.string().min(1, "Prénom requis.").max(100),
  lastName: z.string().min(1, "Nom requis.").max(100),
  phone: z.string().max(30).optional().or(z.literal("")),
  locale: z.string().min(2).max(5),
  roleIds: z.array(z.string()).min(1, "Sélectionnez au moins un rôle."),
});
export type InviteAdminUserValues = z.infer<typeof inviteAdminUserSchema>;

/** Doit rester cohérent avec AssignRolesDto. */
export const assignRolesSchema = z.object({
  roleIds: z.array(z.string()).min(1, "Sélectionnez au moins un rôle."),
});
export type AssignRolesValues = z.infer<typeof assignRolesSchema>;
