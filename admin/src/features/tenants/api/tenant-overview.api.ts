import {
  tenantAuditEntrySchema,
  tenantFinancesSchema,
  tenantInvitationSchema,
  tenantOverviewSchema,
  tenantUserSchema,
} from "../schemas/tenant-overview.schema";
import type {
  TenantAuditEntry,
  TenantFinances,
  TenantInvitation,
  TenantOverview,
  TenantUser,
} from "../schemas/tenant-overview.schema";

import { apiClient } from "@/lib/api-client";

/** ADM-10 : lectures de la fiche 360° (chaque onglet a sa propre route et sa propre permission). */
export async function fetchTenantOverview(id: string): Promise<TenantOverview> {
  return tenantOverviewSchema.parse(await apiClient.get<unknown>(`/admin/tenants/${id}/overview`));
}

export async function fetchTenantUsers(id: string): Promise<TenantUser[]> {
  return tenantUserSchema.array().parse(await apiClient.get<unknown>(`/admin/tenants/${id}/users`));
}

export async function fetchTenantFinances(id: string): Promise<TenantFinances> {
  return tenantFinancesSchema.parse(await apiClient.get<unknown>(`/admin/tenants/${id}/finances`));
}

export async function fetchTenantAudit(id: string): Promise<TenantAuditEntry[]> {
  return tenantAuditEntrySchema.array().parse(await apiClient.get<unknown>(`/admin/tenants/${id}/audit`));
}

export async function fetchTenantInvitations(id: string): Promise<TenantInvitation[]> {
  return tenantInvitationSchema.array().parse(await apiClient.get<unknown>(`/admin/tenants/${id}/invitations`));
}
