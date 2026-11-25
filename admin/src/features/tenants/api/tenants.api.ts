import type { BrandingFormValues, CreateTenantValues, SuspendTenantValues, Tenant, TenantBranding, UpdateTenantValues } from "../schemas/tenant.schema";
import { tenantBrandingSchema, tenantSchema, toBrandingPayload, toCreateTenantPayload } from "../schemas/tenant.schema";

import { apiClient } from "@/lib/api-client";

/**
 * GET /admin/tenants (liste) et GET /admin/tenants/:id (fiche 360°) renvoient
 * désormais tous deux un DTO aplati {id, name, slug, status, ...} — corrigé
 * côté backend dans cette itération (voir rapport de livraison : les deux
 * routes renvoyaient auparavant soit un 404, soit l'entité de domaine brute
 * `{ props: {...} }`).
 */
export async function fetchTenants(): Promise<Tenant[]> {
  const data = await apiClient.get<unknown[]>("/admin/tenants");
  return tenantSchema.array().parse(data);
}

export async function fetchTenantById(id: string): Promise<Tenant> {
  const data = await apiClient.get<unknown>(`/admin/tenants/${id}`);
  return tenantSchema.parse(data);
}

export interface CreateTenantResponse {
  id: string;
  slug: string;
  status: string;
}

export async function createTenant(values: CreateTenantValues): Promise<CreateTenantResponse> {
  return apiClient.post<CreateTenantResponse, ReturnType<typeof toCreateTenantPayload>>(
    "/admin/tenants",
    toCreateTenantPayload(values),
  );
}

export interface SuspendTenantResponse {
  id: string;
  status: string;
}

export async function suspendTenant(
  id: string,
  values: SuspendTenantValues,
): Promise<SuspendTenantResponse> {
  return apiClient.post<SuspendTenantResponse, SuspendTenantValues>(
    `/admin/tenants/${id}/suspend`,
    values,
  );
}

export interface ActivateTenantResponse {
  id: string;
  status: string;
}

/** DRAFT ou SUSPENDED → ACTIVE (POST /admin/tenants/:id/activate, permission tenants.activate). */
export async function activateTenant(id: string): Promise<ActivateTenantResponse> {
  return apiClient.post<ActivateTenantResponse>(`/admin/tenants/${id}/activate`);
}

export interface ArchiveTenantResponse {
  id: string;
  status: string;
}

/** ACTIVE ou SUSPENDED → ARCHIVED, définitif (POST /admin/tenants/:id/archive, permission tenants.suspend). */
export async function archiveTenant(id: string): Promise<ArchiveTenantResponse> {
  return apiClient.post<ArchiveTenantResponse>(`/admin/tenants/${id}/archive`);
}

/** PATCH /admin/tenants/:id (permission tenants.update) : mise à jour des informations ; le slug est immuable. */
export async function updateTenant(id: string, values: UpdateTenantValues): Promise<Tenant> {
  return tenantSchema.parse(await apiClient.patch<unknown, UpdateTenantValues>(`/admin/tenants/${id}`, values));
}

/** Taille et formats acceptés pour un logo téléversé (le serveur contrôle aussi le vrai type du fichier). */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp";

/** POST /admin/tenants/branding/logo (permission tenants.update) : renvoie l'adresse publique du fichier enregistré. */
export async function uploadTenantLogo(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const result = await apiClient.post<{ logoUrl: string }, FormData>("/admin/tenants/branding/logo", body);
  return result.logoUrl;
}

export async function fetchTenantBranding(id: string): Promise<TenantBranding> {
  return tenantBrandingSchema.parse(await apiClient.get<unknown>(`/admin/tenants/${id}/branding`));
}

/** PUT /admin/tenants/:id/branding (permission tenants.update) : logo https et couleurs #RRGGBB ; vide = effacer. */
export async function updateTenantBranding(id: string, values: BrandingFormValues): Promise<TenantBranding> {
  return tenantBrandingSchema.parse(
    await apiClient.put<unknown, ReturnType<typeof toBrandingPayload>>(`/admin/tenants/${id}/branding`, toBrandingPayload(values)),
  );
}
