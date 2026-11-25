import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { LanguageRepositoryPort } from "../domain/language.repository.port";

@Injectable()
export class LanguagePrismaRepository implements LanguageRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listDisabledCodes(): Promise<string[]> {
    const rows = await this.prisma.languageSetting.findMany({ where: { enabled: false }, select: { code: true } });
    return rows.map((row) => row.code);
  }

  async setEnabled(code: string, enabled: boolean): Promise<void> {
    await this.prisma.languageSetting.upsert({
      where: { code },
      create: { code, enabled },
      update: { enabled },
    });
  }
}
