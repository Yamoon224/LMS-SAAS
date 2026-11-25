import { businessUserSchema, roleSchema, trainerSchema } from "../schemas/user.schema";
import type { BusinessUser, InviteLearnerValues, InviteUserValues, Role, Trainer } from "../schemas/user.schema";

import { apiClient } from "@/lib/api-client";

/** GET /business/users (ENT-10) : utilisateurs internes (company) uniquement. */
export async function fetchBusinessUsers(): Promise<BusinessUser[]> {
  const data = await apiClient.get<unknown[]>("/business/users");
  return businessUserSchema.array().parse(data);
}

/** GET /business/users/roles — rôles du tenant (le rôle « Apprenant » est masqué par le backend). */
export async function fetchBusinessRoles(): Promise<Role[]> {
  const data = await apiClient.get<unknown[]>("/business/users/roles");
  return roleSchema.array().parse(data);
}

/** POST /business/users — invitation d'un gestionnaire / formateur. */
export async function inviteBusinessUser(values: InviteUserValues): Promise<{ id: string; status: string }> {
  const payload = { ...values, phone: values.phone ? values.phone : undefined };
  return apiClient.post<{ id: string; status: string }, typeof payload>("/business/users", payload);
}

/** POST /business/users/:id/resend-invitation. */
export async function resendInvitation(userId: string): Promise<unknown> {
  return apiClient.post(`/business/users/${userId}/resend-invitation`);
}

/** POST /business/users/:id/suspend. */
export async function suspendBusinessUser(userId: string): Promise<unknown> {
  return apiClient.post(`/business/users/${userId}/suspend`);
}

/** POST /business/users/:id/reactivate (SUSPENDED → ACTIVE). */
export async function reactivateBusinessUser(userId: string): Promise<unknown> {
  return apiClient.post(`/business/users/${userId}/reactivate`);
}

/** POST /business/users/:id/deactivate — définitif (DEACTIVATED est un état terminal). */
export async function deactivateBusinessUser(userId: string): Promise<unknown> {
  return apiClient.post(`/business/users/${userId}/deactivate`);
}

/** PUT /business/users/:id/roles. */
export async function assignBusinessUserRoles(userId: string, roleIds: string[]): Promise<unknown> {
  return apiClient.put(`/business/users/${userId}/roles`, { roleIds });
}

/** GET /business/users/trainers (courses.manage) : formateurs ACTIFS, sans exiger business-users.manage. */
export async function fetchTrainers(): Promise<Trainer[]> {
  const data = await apiClient.get<unknown[]>("/business/users/trainers");
  return trainerSchema.array().parse(data);
}

/** POST /business/users/learners (learners.manage) : invitation d'un apprenant. */
export async function inviteLearner(values: InviteLearnerValues): Promise<{ id: string; status: string }> {
  const payload = { ...values, phone: values.phone ? values.phone : undefined };
  return apiClient.post<{ id: string; status: string }, typeof payload>("/business/users/learners", payload);
}
