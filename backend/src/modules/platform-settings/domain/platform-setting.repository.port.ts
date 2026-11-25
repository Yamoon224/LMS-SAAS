import type { FinanceSettingKey, StoredSettingRow } from "./finance-settings";

export interface SettingHistoryEntry {
  key: string;
  value: string;
  effectiveFrom: Date;
  changedByUserId: string | null;
}

/** Table clé/valeur versionnée : on n'écrit que par insertion, jamais de mise à jour ni de suppression. */
export interface PlatformSettingRepositoryPort {
  /** Toutes les lignes des clés financières (peu nombreuses : une par changement). */
  listFinanceRows(): Promise<StoredSettingRow[]>;
  append(key: FinanceSettingKey, value: string, effectiveFrom: Date, changedByUserId: string | null): Promise<void>;
  /** Historique des changements, du plus récent au plus ancien. */
  listHistory(limit: number): Promise<SettingHistoryEntry[]>;
}

export const PLATFORM_SETTING_REPOSITORY = Symbol("PLATFORM_SETTING_REPOSITORY");
