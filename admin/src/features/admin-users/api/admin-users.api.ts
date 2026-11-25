import type {
  AdminUser,
  AssignRolesValues,
  InviteAdminUserValues,
  Role,
} from "../schemas/admin-user.schema";
import { adminUserSchema, roleSchema } from "../schemas/admin-user.schema";

import { apiClient } from "@/lib/api-client";

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const data = await apiClient.get<unknown[]>("/admin/users");
  return adminUserSchema.array().parse(data);
}

export async function fetchPlatformRoles(): Promise<Role[]> {
  const data = await apiClient.get<unknown[]>("/admin/users/roles");
  return roleSchema.array().parse(data);
}

export interface InviteAdminUserResponse {
  id: string;
  status: string;
}

export async function inviteAdminUser(
  values: InviteAdminUserValues,
): Promise<InviteAdminUserResponse> {
  const payload = { ...values, phone: values.phone || undefined };
  return apiClient.post<InviteAdminUserResponse, typeof payload>("/admin/users", payload);
}

export interface ResendInvitationResponse {
  id: string;
  invitationResent: boolean;
}

export async function resendInvitation(id: string): Promise<ResendInvitationResponse> {
  return apiClient.post<ResendInvitationResponse>(`/admin/users/${id}/resend-invitation`);
}

export interface SuspendAdminUserResponse {
  id: string;
  status: string;
}

export async function suspendAdminUser(id: string): Promise<SuspendAdminUserResponse> {
  return apiClient.post<SuspendAdminUserResponse>(`/admin/users/${id}/suspend`);
}

export interface ReactivateAdminUserResponse {
  id: string;
  status: string;
}

export async function reactivateAdminUser(id: string): Promise<ReactivateAdminUserResponse> {
  return apiClient.post<ReactivateAdminUserResponse>(`/admin/users/${id}/reactivate`);
}

export interface DeactivateAdminUserResponse {
  id: string;
  status: string;
}

export async function deactivateAdminUser(id: string): Promise<DeactivateAdminUserResponse> {
  return apiClient.post<DeactivateAdminUserResponse>(`/admin/users/${id}/deactivate`);
}

export interface AssignRolesResponse {
  id: string;
  roleIds: string[];
}

export async function assignRoles(
  id: string,
  values: AssignRolesValues,
): Promise<AssignRolesResponse> {
  return apiClient.put<AssignRolesResponse, AssignRolesValues>(`/admin/users/${id}/roles`, values);
}

export interface ResetTwoFactorResponse {
  id: string;
  twoFactorReset: boolean;
}

/** Réinitialise la 2FA d'un AUTRE administrateur (appareil perdu) : révoque ses sessions, ré-enrôlement à la prochaine connexion. */
export async function resetAdminTwoFactor(id: string): Promise<ResetTwoFactorResponse> {
  return apiClient.post<ResetTwoFactorResponse>(`/admin/users/${id}/2fa/reset`);
}
