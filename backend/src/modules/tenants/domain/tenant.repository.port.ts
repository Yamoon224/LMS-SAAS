import type { TenantStatus } from "./tenant-status";
import type { Tenant } from "./tenant.entity";

export interface CreateTenantData {
  name: string;
  slug: string;
  country: string;
  currency: string;
  defaultLocale: string;
}

/** Réglages modifiables par l'entreprise (ENT-08/11/12) ; les JSON sont bruts (forme non contractuelle). */
export interface TenantSettingsRecord {
  name: string;
  branding: unknown;
  legalInfo: unknown;
  contactEmail: string | null;
  contactPhone: string | null;
  offlinePaymentEnabled: boolean;
  offlinePaymentInstructions: string | null;
  /** JSON : `{ type, operator, accountName, last4, encryptedNumber }` (numéro chiffré au repos). */
  payoutAccount: unknown;
  payoutAccountVerified: boolean;
}

/** Réglages modifiables, plus l'identité (pays, devise, langue) que seul l'Admin plateforme modifie (ADM-10). */
export type TenantSettingsPatch = Partial<TenantSettingsRecord> & {
  country?: string;
  currency?: string;
  defaultLocale?: string;
};

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter — inversion des dépendances (13.1). */
export interface TenantRepositoryPort {
  findById(id: string): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
  existsBySlug(slug: string): Promise<boolean>;
  /** ADM-10: liste de toutes les entreprises, tous statuts confondus. */
  listAll(): Promise<Tenant[]>;
  create(data: CreateTenantData): Promise<Tenant>;
  updateStatus(id: string, status: TenantStatus, reason?: string): Promise<void>;
  findSettings(id: string): Promise<TenantSettingsRecord | null>;
  updateSettings(id: string, patch: TenantSettingsPatch): Promise<void>;
}

export const TENANT_REPOSITORY = Symbol("TENANT_REPOSITORY");
