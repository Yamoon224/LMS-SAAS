import type { Payout, PayoutDestination } from "./payout.entity";

export interface CreatePayoutData {
  tenantId: string;
  amount: number;
  currency: string;
  destination: PayoutDestination;
}

export interface PayoutRepositoryPort {
  findById(id: string): Promise<Payout | null>;
  create(data: CreatePayoutData): Promise<Payout>;
  save(payout: Payout): Promise<void>;
  listByStatus(status: string): Promise<Payout[]>;
  /** ENT-69: historique des reversements de l'entreprise, du plus récent au plus ancien. */
  listByTenant(tenantId: string): Promise<Payout[]>;
  /** Vrai s'il existe une demande non terminée (REQUESTED, VALIDATED ou APPROVED) pour cette entreprise. */
  hasOpenPayout(tenantId: string): Promise<boolean>;
}

export const PAYOUT_REPOSITORY = Symbol("PAYOUT_REPOSITORY");
