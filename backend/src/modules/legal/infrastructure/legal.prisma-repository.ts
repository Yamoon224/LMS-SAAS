import { Injectable } from "@nestjs/common";
import type { LegalDocument as PrismaLegalDocument } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { LegalDocument, LegalDocumentType } from "../domain/legal-document";
import type { LegalDocumentWithStats, LegalRepositoryPort } from "../domain/legal.repository.port";

function toDomain(record: PrismaLegalDocument): LegalDocument {
  return {
    id: record.id,
    type: record.type,
    version: record.version,
    title: record.title,
    content: record.content,
    publishedAt: record.publishedAt,
    createdAt: record.createdAt,
  };
}

@Injectable()
export class LegalPrismaRepository implements LegalRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(): Promise<LegalDocumentWithStats[]> {
    const records = await this.prisma.legalDocument.findMany({
      orderBy: [{ type: "asc" }, { version: "desc" }],
      include: { _count: { select: { acceptances: true } } },
    });
    return records.map((record) => ({ ...toDomain(record), acceptancesCount: record._count.acceptances }));
  }

  async listByType(type: LegalDocumentType): Promise<LegalDocument[]> {
    const records = await this.prisma.legalDocument.findMany({ where: { type }, orderBy: { version: "desc" } });
    return records.map(toDomain);
  }

  async findById(id: string): Promise<LegalDocument | null> {
    const record = await this.prisma.legalDocument.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async createDraft(data: {
    type: LegalDocumentType;
    version: number;
    title: string;
    content: string;
  }): Promise<LegalDocument> {
    // La contrainte unique (type, version) rejette deux créations simultanées du même numéro.
    return toDomain(await this.prisma.legalDocument.create({ data }));
  }

  async updateDraft(id: string, data: { title: string; content: string }): Promise<void> {
    // Garde-fou en base : même si la règle du domaine était contournée, une version publiée n'est jamais modifiée.
    const result = await this.prisma.legalDocument.updateMany({ where: { id, publishedAt: null }, data });
    if (result.count === 0) throw new Error("Aucun brouillon mis à jour (version publiée ou introuvable).");
  }

  async markPublished(id: string, at: Date): Promise<void> {
    await this.prisma.legalDocument.updateMany({ where: { id, publishedAt: null }, data: { publishedAt: at } });
  }

  async findAcceptedDocumentIds(userId: string, documentIds: readonly string[]): Promise<string[]> {
    if (documentIds.length === 0) return [];
    const records = await this.prisma.legalAcceptance.findMany({
      where: { userId, documentId: { in: [...documentIds] } },
      select: { documentId: true },
    });
    return records.map((record) => record.documentId);
  }

  async recordAcceptance(userId: string, documentId: string): Promise<void> {
    await this.prisma.legalAcceptance.upsert({
      where: { userId_documentId: { userId, documentId } },
      create: { userId, documentId },
      update: {},
    });
  }
}
