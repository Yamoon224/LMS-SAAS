import { apiClient } from "@/lib/api-client";

/** ADM-06 : actions de l'Admin sur les comptes d'une entreprise (permission `tenants.suspend`). */
const base = (tenantId: string, userId: string) => `/admin/tenants/${tenantId}/users/${userId}`;

export const suspendTenantUser = (tenantId: string, userId: string) =>
  apiClient.post<unknown>(`${base(tenantId, userId)}/suspend`);

export const reactivateTenantUser = (tenantId: string, userId: string) =>
  apiClient.post<unknown>(`${base(tenantId, userId)}/reactivate`);

export const resendTenantUserInvitation = (tenantId: string, userId: string) =>
  apiClient.post<unknown>(`${base(tenantId, userId)}/resend-invitation`);

export const sendTenantUserPasswordReset = (tenantId: string, userId: string) =>
  apiClient.post<unknown>(`${base(tenantId, userId)}/password-reset`);

export const resetTenantUserTwoFactor = (tenantId: string, userId: string) =>
  apiClient.post<unknown>(`${base(tenantId, userId)}/2fa/reset`);

export const transferTenantOwnership = (tenantId: string, newOwnerUserId: string) =>
  apiClient.post<unknown, { newOwnerUserId: string; confirm: true }>(`/admin/tenants/${tenantId}/ownership-transfer`, {
    newOwnerUserId,
    confirm: true,
  });
