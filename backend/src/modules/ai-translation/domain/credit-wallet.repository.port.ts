import type { CreditLedgerType } from "./credit-ledger-type";
import type { CreditWallet } from "./credit-wallet.entity";

export interface CreateLedgerEntryData {
  walletId: string;
  type: CreditLedgerType;
  amount: number;
  translationJobId?: string;
  creditPackId?: string;
  note?: string;
}

export interface CreditLedgerEntryRecord {
  id: string;
  type: CreditLedgerType;
  amount: number;
  note: string | null;
  createdAt: Date;
}

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface CreditWalletRepositoryPort {
  findByTenantId(tenantId: string): Promise<CreditWallet | null>;
  /** ADM-18: le portefeuille est créé automatiquement (solde 0) au premier besoin. */
  createForTenant(tenantId: string): Promise<CreditWallet>;
  save(wallet: CreditWallet): Promise<void>;
  recordLedgerEntry(data: CreateLedgerEntryData): Promise<void>;
  listLedgerForTenant(tenantId: string): Promise<CreditLedgerEntryRecord[]>;
}

export const CREDIT_WALLET_REPOSITORY = Symbol("CREDIT_WALLET_REPOSITORY");
