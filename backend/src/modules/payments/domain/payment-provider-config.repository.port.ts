import type { PaymentMethod } from "./payment-method";

export interface PaymentProviderConfigRecord {
  id: string;
  code: string;
  label: string;
  isActive: boolean;
  isTestMode: boolean;
  priority: number;
  supportedMethods: PaymentMethod[];
}

export interface SetProviderConfigData {
  code: string;
  label: string;
  isActive: boolean;
  isTestMode: boolean;
  priority: number;
  supportedMethods: PaymentMethod[];
  /** Jamais loggées ni renvoyées en clair (section 11, "secrets chiffrés"). */
  credentials: Record<string, string>;
}

/** ADM-20: activer/désactiver chaque fournisseur, clés test/production, priorité par moyen. */
export interface PaymentProviderConfigRepositoryPort {
  findById(id: string): Promise<PaymentProviderConfigRecord | null>;
  findActiveByMethod(method: PaymentMethod): Promise<PaymentProviderConfigRecord[]>;
  findByCode(code: string): Promise<PaymentProviderConfigRecord | null>;
  /** ADM-20: tous les fournisseurs configurés (actifs ou non), pour l'écran d'administration. */
  listAll(): Promise<PaymentProviderConfigRecord[]>;
  upsert(data: SetProviderConfigData): Promise<PaymentProviderConfigRecord>;
  setActive(code: string, isActive: boolean): Promise<void>;
  /**
   * Supprime la configuration d'un fournisseur, sauf s'il a déjà traité des paiements (l'historique financier en dépend).
   * `null` si le fournisseur n'existe pas ; sinon `deleted` et le nombre de paiements qui l'ont utilisé.
   */
  deleteByCode(code: string): Promise<{ deleted: boolean; paymentCount: number } | null>;
}

export const PAYMENT_PROVIDER_CONFIG_REPOSITORY = Symbol("PAYMENT_PROVIDER_CONFIG_REPOSITORY");
