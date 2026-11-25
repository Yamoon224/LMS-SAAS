import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { TemplateOverride, TemplateOverrideRepositoryPort } from "../domain/template-override.repository.port";

@Injectable()
export class TemplateOverridePrismaRepository implements TemplateOverrideRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async find(templateKey: string, locale: string): Promise<TemplateOverride | null> {
    return this.prisma.notificationTemplateOverride.findUnique({
      where: { templateKey_locale: { templateKey, locale } },
      select: { templateKey: true, locale: true, subject: true, body: true, updatedAt: true },
    });
  }

  async listAll(): Promise<TemplateOverride[]> {
    return this.prisma.notificationTemplateOverride.findMany({
      select: { templateKey: true, locale: true, subject: true, body: true, updatedAt: true },
    });
  }

  async upsert(templateKey: string, locale: string, subject: string, body: string): Promise<void> {
    await this.prisma.notificationTemplateOverride.upsert({
      where: { templateKey_locale: { templateKey, locale } },
      create: { templateKey, locale, subject, body },
      update: { subject, body },
    });
  }

  async remove(templateKey: string, locale: string): Promise<void> {
    await this.prisma.notificationTemplateOverride.deleteMany({ where: { templateKey, locale } });
  }
}
