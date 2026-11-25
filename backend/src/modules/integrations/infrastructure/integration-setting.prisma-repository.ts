import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { IntegrationProvider } from "../domain/integration-catalog";
import type {
  IntegrationSettingRepositoryPort,
  StoredIntegration,
} from "../domain/integration-setting.repository.port";

function asStringMap(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

@Injectable()
export class IntegrationSettingPrismaRepository implements IntegrationSettingRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(row: {
    provider: string;
    values: unknown;
    secrets: unknown;
    updatedBy: string | null;
    updatedAt: Date;
  }): StoredIntegration {
    return {
      provider: row.provider as IntegrationProvider,
      values: asStringMap(row.values),
      secrets: asStringMap(row.secrets),
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
    };
  }

  async findAll(): Promise<StoredIntegration[]> {
    return (await this.prisma.integrationSetting.findMany()).map((row) => this.toDomain(row));
  }

  async find(provider: IntegrationProvider): Promise<StoredIntegration | null> {
    const row = await this.prisma.integrationSetting.findUnique({ where: { provider } });
    return row ? this.toDomain(row) : null;
  }

  async save(data: {
    provider: IntegrationProvider;
    values: Record<string, string>;
    secrets: Record<string, string>;
    updatedBy: string;
  }): Promise<void> {
    await this.prisma.integrationSetting.upsert({
      where: { provider: data.provider },
      create: data,
      update: { values: data.values, secrets: data.secrets, updatedBy: data.updatedBy },
    });
  }

  async delete(provider: IntegrationProvider): Promise<void> {
    await this.prisma.integrationSetting.deleteMany({ where: { provider } });
  }
}
