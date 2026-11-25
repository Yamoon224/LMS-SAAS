import type {
  TenantAuditEntry,
  TenantContact,
  TenantFinances,
  TenantInvitationRecord,
  TenantProfile,
  TenantSubscriptionRow,
  TenantUsageCounts,
  TenantUser,
} from "./tenant-overview";

/** Lecture seule de la fiche 360° d'une entreprise (ADM-10). */
export interface TenantOverviewRepositoryPort {
  findProfile(tenantId: string): Promise<TenantProfile | null>;
  /** Propriétaires de l'entreprise (rôle « Propriétaire d'entreprise »). */
  findOwners(tenantId: string): Promise<TenantContact[]>;
  /** Dernière invitation envoyée à chaque propriétaire (état du lien + e-mail envoyé, jeton masqué). */
  listOwnerInvitations(tenantId: string): Promise<TenantInvitationRecord[]>;
  /** Abonnements les plus récents d'abord. */
  listSubscriptions(tenantId: string, limit: number): Promise<TenantSubscriptionRow[]>;
  getUsageCounts(tenantId: string, now: Date): Promise<TenantUsageCounts>;
  listUsers(tenantId: string, limit: number): Promise<TenantUser[]>;
  getFinances(tenantId: string, currency: string, limit: number): Promise<TenantFinances>;
  listAudit(tenantId: string, limit: number): Promise<TenantAuditEntry[]>;
}

export const TENANT_OVERVIEW_REPOSITORY = Symbol("TENANT_OVERVIEW_REPOSITORY");
