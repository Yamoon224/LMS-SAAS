import { Injectable } from "@nestjs/common";
import type { MediaAsset as PrismaMediaAsset } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { MediaAssetKind } from "../domain/media-asset-kind";
import { MediaAssetStatus } from "../domain/media-asset-status";
import { MediaAsset } from "../domain/media-asset.entity";
import type {
  CreateMediaAssetData,
  MediaAssetRepositoryPort,
} from "../domain/media-asset.repository.port";

@Injectable()
export class MediaAssetPrismaRepository implements MediaAssetRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<MediaAsset | null> {
    const record = await this.prisma.mediaAsset.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByIdInTenant(id: string, tenantId: string): Promise<MediaAsset | null> {
    const record = await this.prisma.mediaAsset.findFirst({ where: { id, tenantId } });
    return record ? this.toDomain(record) : null;
  }

  async create(data: CreateMediaAssetData): Promise<MediaAsset> {
    const record = await this.prisma.mediaAsset.create({
      data: {
        tenantId: data.tenantId,
        kind: data.kind,
        originalFilename: data.originalFilename,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        storageKey: data.storageKey,
        downloadAllowed: data.downloadAllowed,
        status: "UPLOADING",
      },
    });
    return this.toDomain(record);
  }

  async save(asset: MediaAsset): Promise<void> {
    const snapshot = asset.toSnapshot();
    await this.prisma.mediaAsset.update({
      where: { id: snapshot.id },
      data: {
        status: snapshot.status,
        hlsPrefix: snapshot.hlsPrefix,
        durationSeconds: snapshot.durationSeconds,
        failureReason: snapshot.failureReason,
        readyAt: snapshot.status === MediaAssetStatus.READY ? new Date() : undefined,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.mediaAsset.delete({ where: { id } });
  }

  async sumSizeBytesForTenant(tenantId: string): Promise<number> {
    const result = await this.prisma.mediaAsset.aggregate({
      where: { tenantId, status: { notIn: ["REJECTED", "FAILED"] } },
      _sum: { sizeBytes: true },
    });
    return result._sum.sizeBytes ?? 0;
  }

  async listProcessing(): Promise<MediaAsset[]> {
    const records = await this.prisma.mediaAsset.findMany({ where: { status: "PROCESSING" } });
    return records.map((record) => this.toDomain(record));
  }

  async listScanPending(limit: number): Promise<MediaAsset[]> {
    const records = await this.prisma.mediaAsset.findMany({
      where: { status: "SCAN_PENDING" },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: PrismaMediaAsset): MediaAsset {
    return MediaAsset.fromPersistence({
      id: record.id,
      tenantId: record.tenantId,
      kind: record.kind as MediaAssetKind,
      status: record.status as MediaAssetStatus,
      originalFilename: record.originalFilename,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      storageKey: record.storageKey,
      hlsPrefix: record.hlsPrefix,
      durationSeconds: record.durationSeconds,
      downloadAllowed: record.downloadAllowed,
      failureReason: record.failureReason,
    });
  }
}
