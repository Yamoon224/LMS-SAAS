import type { AuditEntry } from "./audit-entry.entity";

export interface CreateAuditEntryData {
  tenantId: string | null;
  actorId: string | null;
  action: string;
  objectType: string;
  objectId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditEntryFilters {
  /** Omis = journal plateforme entier (Admin) ; renseigné = journal d'un tenant (Business). */
  tenantId?: string | null;
  actorId?: string;
  objectType?: string;
  objectId?: string;
  action?: string;
  from?: Date;
  to?: Date;
}

export interface PageInput {
  take: number;
  skip: number;
}

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface AuditEntryRepositoryPort {
  create(data: CreateAuditEntryData): Promise<AuditEntry>;
  list(filters: AuditEntryFilters, page: PageInput): Promise<AuditEntry[]>;
  count(filters: AuditEntryFilters): Promise<number>;
}

export const AUDIT_ENTRY_REPOSITORY = Symbol("AUDIT_ENTRY_REPOSITORY");
