export interface CreditPackRecord {
  id: string;
  name: string;
  creditsAmount: number;
  price: number;
  currency: string;
  isArchived: boolean;
}

export interface CreateCreditPackData {
  name: string;
  creditsAmount: number;
  price: number;
  currency: string;
}

/** ADM-18: packs de crédits IA et leur prix. */
export interface CreditPackRepositoryPort {
  findById(id: string): Promise<CreditPackRecord | null>;
  listActive(): Promise<CreditPackRecord[]>;
  /** ADM-18: vue Admin incluant les packs archivés. */
  listAll(): Promise<CreditPackRecord[]>;
  create(data: CreateCreditPackData): Promise<CreditPackRecord>;
  archive(id: string): Promise<void>;
}

export const CREDIT_PACK_REPOSITORY = Symbol("CREDIT_PACK_REPOSITORY");
