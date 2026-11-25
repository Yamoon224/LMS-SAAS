import { DomainError } from "@shared/errors/domain-error";

/** ADM-21/ADM-23 : fréquence du reversement automatique. MANUAL = aucune demande générée par le système. */
export const PAYOUT_FREQUENCIES = ["MANUAL", "WEEKLY", "MONTHLY"] as const;
export type PayoutFrequency = (typeof PAYOUT_FREQUENCIES)[number];

/** ADM-21 : qui supporte les frais de transaction du fournisseur de paiement. */
export const FEE_BEARERS = ["TENANT", "PLATFORM"] as const;
export type FeeBearer = (typeof FEE_BEARERS)[number];

/** Clés persistées (table clé/valeur). Ne jamais renommer : elles sont stockées. */
export const FINANCE_SETTING_KEYS = [
  "RETENTION_DAYS",
  "MINIMUM_PAYOUT_THRESHOLD",
  "PAYOUT_FREQUENCY",
  "TRANSACTION_FEE_BEARER",
] as const;
export type FinanceSettingKey = (typeof FINANCE_SETTING_KEYS)[number];

export interface FinanceSettings {
  /** Jours de rétention avant qu'une vente nette devienne disponible (0 à 90). */
  retentionDays: number;
  /** Seuil minimal de reversement, en plus petite unité de la devise (entier ≥ 0). */
  minimumPayoutThreshold: number;
  payoutFrequency: PayoutFrequency;
  transactionFeeBearer: FeeBearer;
}

/** Valeurs par défaut = comportement historique (RETENTION 7 j, seuil 10 000, frais à la charge de l'entreprise). */
export const DEFAULT_FINANCE_SETTINGS: FinanceSettings = {
  retentionDays: 7,
  minimumPayoutThreshold: 10000,
  payoutFrequency: "MANUAL",
  transactionFeeBearer: "TENANT",
};

export const MAX_RETENTION_DAYS = 90;
/** Plafond défensif : un seuil absurde (erreur de saisie) bloquerait tous les reversements. */
export const MAX_PAYOUT_THRESHOLD = 1_000_000_000;

export class InvalidFinanceSettingError extends DomainError {
  readonly code = "PARAMETRE_FINANCIER_INVALIDE";
}

/** Champ de `FinanceSettings` correspondant à chaque clé persistée. */
export const FIELD_BY_KEY: Record<FinanceSettingKey, keyof FinanceSettings> = {
  RETENTION_DAYS: "retentionDays",
  MINIMUM_PAYOUT_THRESHOLD: "minimumPayoutThreshold",
  PAYOUT_FREQUENCY: "payoutFrequency",
  TRANSACTION_FEE_BEARER: "transactionFeeBearer",
};

function assertInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new InvalidFinanceSettingError(`${label} doit être un nombre entier.`);
  }
  return value;
}

/** Valide une valeur candidate et la renvoie typée. Lève `InvalidFinanceSettingError` hors bornes. */
export function validateFinanceSetting<K extends keyof FinanceSettings>(field: K, value: unknown): FinanceSettings[K] {
  switch (field) {
    case "retentionDays": {
      const days = assertInteger(value, "Le délai de rétention");
      if (days < 0 || days > MAX_RETENTION_DAYS) {
        throw new InvalidFinanceSettingError(`Le délai de rétention doit être compris entre 0 et ${MAX_RETENTION_DAYS} jours.`);
      }
      return days as FinanceSettings[K];
    }
    case "minimumPayoutThreshold": {
      const threshold = assertInteger(value, "Le seuil de reversement");
      if (threshold < 0 || threshold > MAX_PAYOUT_THRESHOLD) {
        throw new InvalidFinanceSettingError(`Le seuil de reversement doit être compris entre 0 et ${MAX_PAYOUT_THRESHOLD}.`);
      }
      return threshold as FinanceSettings[K];
    }
    case "payoutFrequency":
      if (!(PAYOUT_FREQUENCIES as readonly unknown[]).includes(value)) {
        throw new InvalidFinanceSettingError(`La fréquence de reversement doit être : ${PAYOUT_FREQUENCIES.join(", ")}.`);
      }
      return value as FinanceSettings[K];
    case "transactionFeeBearer":
      if (!(FEE_BEARERS as readonly unknown[]).includes(value)) {
        throw new InvalidFinanceSettingError(`Les frais de transaction sont supportés par : ${FEE_BEARERS.join(", ")}.`);
      }
      return value as FinanceSettings[K];
    default:
      throw new InvalidFinanceSettingError("Paramètre financier inconnu.");
  }
}

/** Interprète une valeur stockée. Une valeur stockée illisible retombe sur le défaut (jamais d'exception à la lecture). */
export function parseStoredSetting(key: FinanceSettingKey, raw: string): FinanceSettings[keyof FinanceSettings] {
  const field = FIELD_BY_KEY[key];
  const candidate = field === "retentionDays" || field === "minimumPayoutThreshold" ? Number(raw) : raw;
  try {
    return validateFinanceSetting(field, candidate);
  } catch {
    return DEFAULT_FINANCE_SETTINGS[field];
  }
}

export interface StoredSettingRow {
  key: string;
  value: string;
  effectiveFrom: Date;
}

/**
 * Résout les paramètres en vigueur à `at` : pour chaque clé, la ligne la plus récente dont la date d'effet est passée ;
 * à défaut, la valeur par défaut. Les lignes d'une clé inconnue sont ignorées.
 */
export function resolveFinanceSettings(rows: readonly StoredSettingRow[], at: Date): FinanceSettings {
  const result: FinanceSettings = { ...DEFAULT_FINANCE_SETTINGS };
  for (const key of FINANCE_SETTING_KEYS) {
    const current = rows
      .filter((row) => row.key === key && row.effectiveFrom.getTime() <= at.getTime())
      .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0];
    if (current) {
      (result as unknown as Record<string, unknown>)[FIELD_BY_KEY[key]] = parseStoredSetting(key, current.value);
    }
  }
  return result;
}
