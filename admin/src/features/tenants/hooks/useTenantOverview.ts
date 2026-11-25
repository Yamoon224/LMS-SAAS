import { useQuery } from "@tanstack/react-query";

import {
  fetchTenantAudit,
  fetchTenantFinances,
  fetchTenantInvitations,
  fetchTenantOverview,
  fetchTenantUsers,
} from "../api/tenant-overview.api";

const retry = (failureCount: number, error: unknown) =>
  (error as { status?: number }).status === 403 ? false : failureCount < 2;

/** Aperçu 360° (profil, abonnement, usage) : partagé par les onglets Aperçu, Abonnement et Activité. */
export function useTenantOverview(id: string) {
  return useQuery({ queryKey: ["tenants", id, "overview"], queryFn: () => fetchTenantOverview(id), enabled: Boolean(id), retry });
}

/** Les onglets lourds ne chargent qu'à l'ouverture (`enabled`). */
export function useTenantUsers(id: string, enabled: boolean) {
  return useQuery({ queryKey: ["tenants", id, "users"], queryFn: () => fetchTenantUsers(id), enabled, retry });
}

export function useTenantFinances(id: string, enabled: boolean) {
  return useQuery({ queryKey: ["tenants", id, "finances"], queryFn: () => fetchTenantFinances(id), enabled, retry });
}

export function useTenantAudit(id: string, enabled: boolean) {
  return useQuery({ queryKey: ["tenants", id, "audit"], queryFn: () => fetchTenantAudit(id), enabled, retry });
}

/** Invitation(s) envoyée(s) au(x) propriétaire(s) : chargées à l'ouverture de la fenêtre. */
export function useTenantInvitations(id: string, enabled = true) {
  return useQuery({ queryKey: ["tenants", id, "invitations"], queryFn: () => fetchTenantInvitations(id), enabled, retry });
}
