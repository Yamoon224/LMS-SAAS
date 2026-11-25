/** Cycle de vie d'une entreprise (section 8.1): Brouillon → Actif → Suspendu ↔ Actif → Archivé. */
export enum TenantStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  ARCHIVED = "ARCHIVED",
}

const ALLOWED_TRANSITIONS: Record<TenantStatus, TenantStatus[]> = {
  [TenantStatus.DRAFT]: [TenantStatus.ACTIVE],
  [TenantStatus.ACTIVE]: [TenantStatus.SUSPENDED, TenantStatus.ARCHIVED],
  [TenantStatus.SUSPENDED]: [TenantStatus.ACTIVE, TenantStatus.ARCHIVED],
  [TenantStatus.ARCHIVED]: [],
};

export function canTransitionTenantStatus(from: TenantStatus, to: TenantStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
