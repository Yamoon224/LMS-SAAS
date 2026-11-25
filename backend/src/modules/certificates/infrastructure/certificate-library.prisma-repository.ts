import { Injectable } from "@nestjs/common";
import type { CertificateLibraryTemplate as PrismaLibraryTemplate } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { CertificateDesign } from "../domain/certificate-design";
import type { LibraryTemplate } from "../domain/certificate-library";
import type {
  CertificateLibraryRepositoryPort,
  SaveLibraryTemplateData,
} from "../domain/certificate-library.repository.port";

function toDomain(record: PrismaLibraryTemplate): LibraryTemplate {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    design: record.design as CertificateDesign,
    isPublished: record.isPublished,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

@Injectable()
export class CertificateLibraryPrismaRepository implements CertificateLibraryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(): Promise<LibraryTemplate[]> {
    return (await this.prisma.certificateLibraryTemplate.findMany({ orderBy: { createdAt: "desc" } })).map(toDomain);
  }

  async listPublished(): Promise<LibraryTemplate[]> {
    const records = await this.prisma.certificateLibraryTemplate.findMany({
      where: { isPublished: true },
      orderBy: { name: "asc" },
    });
    return records.map(toDomain);
  }

  async findById(id: string): Promise<LibraryTemplate | null> {
    const record = await this.prisma.certificateLibraryTemplate.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async create(data: SaveLibraryTemplateData): Promise<LibraryTemplate> {
    return toDomain(
      await this.prisma.certificateLibraryTemplate.create({
        data: { name: data.name, description: data.description, design: data.design as object },
      }),
    );
  }

  async update(id: string, data: SaveLibraryTemplateData): Promise<void> {
    await this.prisma.certificateLibraryTemplate.update({
      where: { id },
      data: { name: data.name, description: data.description, design: data.design as object },
    });
  }

  async setPublished(id: string, published: boolean): Promise<void> {
    await this.prisma.certificateLibraryTemplate.update({ where: { id }, data: { isPublished: published } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.certificateLibraryTemplate.delete({ where: { id } });
  }
}
