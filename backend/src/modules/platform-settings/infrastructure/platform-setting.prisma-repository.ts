import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import { FINANCE_SETTING_KEYS } from "../domain/finance-settings";
import type { FinanceSettingKey, StoredSettingRow } from "../domain/finance-settings";
import type { PlatformSettingRepositoryPort, SettingHistoryEntry } from "../domain/platform-setting.repository.port";

@Injectable()
export class PlatformSettingPrismaRepository implements PlatformSettingRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listFinanceRows(): Promise<StoredSettingRow[]> {
    const rows = await this.prisma.platformSetting.findMany({
      where: { key: { in: [...FINANCE_SETTING_KEYS] } },
      select: { key: true, value: true, effectiveFrom: true },
    });
    return rows;
  }

  async append(key: FinanceSettingKey, value: string, effectiveFrom: Date, changedByUserId: string | null): Promise<void> {
    await this.prisma.platformSetting.create({ data: { key, value, effectiveFrom, changedByUserId } });
  }

  async listHistory(limit: number): Promise<SettingHistoryEntry[]> {
    return this.prisma.platformSetting.findMany({
      where: { key: { in: [...FINANCE_SETTING_KEYS] } },
      orderBy: { effectiveFrom: "desc" },
      take: limit,
      select: { key: true, value: true, effectiveFrom: true, changedByUserId: true },
    });
  }
}
