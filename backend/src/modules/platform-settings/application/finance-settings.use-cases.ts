import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import {
  FIELD_BY_KEY,
  FINANCE_SETTING_KEYS,
  resolveFinanceSettings,
  validateFinanceSetting,
} from "../domain/finance-settings";
import type { FinanceSettingKey, FinanceSettings } from "../domain/finance-settings";
import { PLATFORM_SETTING_REPOSITORY } from "../domain/platform-setting.repository.port";
import type { PlatformSettingRepositoryPort, SettingHistoryEntry } from "../domain/platform-setting.repository.port";
import { FinanceSettingChangedEvent } from "../platform-settings.events";

/** Durée de vie du cache de lecture : les ventes et reversements lisent les paramètres à chaque usage. */
export const SETTINGS_CACHE_TTL_MS = 30_000;

/**
 * Lecture des paramètres financiers en vigueur, mise en cache brièvement. Un changement invalide le cache de CE
 * processus ; les autres instances rattrapent en au plus `SETTINGS_CACHE_TTL_MS`.
 */
@Injectable()
export class GetFinanceSettingsUseCase {
  private cache: { settings: FinanceSettings; expiresAt: number } | null = null;

  constructor(@Inject(PLATFORM_SETTING_REPOSITORY) private readonly repository: PlatformSettingRepositoryPort) {}

  async execute(now: Date = new Date()): Promise<FinanceSettings> {
    if (this.cache && this.cache.expiresAt > now.getTime()) {
      return { ...this.cache.settings };
    }
    const settings = resolveFinanceSettings(await this.repository.listFinanceRows(), now);
    this.cache = { settings, expiresAt: now.getTime() + SETTINGS_CACHE_TTL_MS };
    return { ...settings };
  }

  invalidate(): void {
    this.cache = null;
  }
}

export type FinanceSettingsPatch = Partial<FinanceSettings>;

/**
 * ADM-21/ADM-23 : met à jour un ou plusieurs paramètres. Tout est validé AVANT la première écriture (un paramètre
 * invalide ne laisse aucun changement partiel). Seuls les champs réellement modifiés sont écrits et audités ; une
 * valeur identique à l'actuelle est ignorée. Les ventes déjà comptabilisées ne sont jamais recalculées.
 */
@Injectable()
export class UpdateFinanceSettingsUseCase {
  constructor(
    @Inject(PLATFORM_SETTING_REPOSITORY) private readonly repository: PlatformSettingRepositoryPort,
    private readonly getFinanceSettings: GetFinanceSettingsUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(patch: FinanceSettingsPatch, actorUserId: string | null): Promise<FinanceSettings> {
    this.getFinanceSettings.invalidate();
    const current = await this.getFinanceSettings.execute();

    const changes: { key: FinanceSettingKey; field: keyof FinanceSettings; value: FinanceSettings[keyof FinanceSettings] }[] = [];
    for (const key of FINANCE_SETTING_KEYS) {
      const field = FIELD_BY_KEY[key];
      if (patch[field] === undefined) continue;
      const value = validateFinanceSetting(field, patch[field]);
      if (value !== current[field]) changes.push({ key, field, value });
    }

    const effectiveFrom = new Date();
    for (const change of changes) {
      await this.repository.append(change.key, String(change.value), effectiveFrom, actorUserId);
    }
    this.getFinanceSettings.invalidate();

    for (const change of changes) {
      this.eventEmitter.emit(
        "finance-setting.changed",
        new FinanceSettingChangedEvent(change.field, current[change.field], change.value, actorUserId),
      );
    }
    return this.getFinanceSettings.execute();
  }
}

@Injectable()
export class ListFinanceSettingsHistoryUseCase {
  constructor(@Inject(PLATFORM_SETTING_REPOSITORY) private readonly repository: PlatformSettingRepositoryPort) {}

  execute(limit = 50): Promise<SettingHistoryEntry[]> {
    return this.repository.listHistory(Math.min(Math.max(limit, 1), 200));
  }
}
