export interface CreateRoleData {
  tenantId: string | null;
  name: string;
  isDefault: boolean;
  permissionCodes: string[];
}

export interface RoleRecord {
  id: string;
  tenantId: string | null;
  name: string;
}

/** Port RBAC (section 4.1 "Users & RBAC"): rôles et permissions par portée plateforme/tenant. */
export interface RoleRepositoryPort {
  create(data: CreateRoleData): Promise<RoleRecord>;
  findByTenantAndName(tenantId: string | null, name: string): Promise<RoleRecord | null>;
  listByTenant(tenantId: string | null): Promise<RoleRecord[]>;
  /** Rôles existants parmi les ids fournis (les ids inconnus sont simplement absents du résultat). */
  findByIds(ids: string[]): Promise<RoleRecord[]>;
}

export const ROLE_REPOSITORY = Symbol("ROLE_REPOSITORY");
