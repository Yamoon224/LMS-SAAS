import { PlansFacade } from "@modules/plans/plans.facade";
import { Inject, Injectable } from "@nestjs/common";

import { assertWithinSizeLimit, assertWithinStorageQuota, resolveMediaKind } from "../domain/media-asset-kind";
import { MEDIA_ASSET_REPOSITORY } from "../domain/media-asset.repository.port";
import type { MediaAssetRepositoryPort } from "../domain/media-asset.repository.port";
import { OBJECT_STORAGE } from "../domain/object-storage.port";
import type { ObjectStoragePort, PresignedUploadUrl } from "../domain/object-storage.port";

export interface RequestUploadInput {
  tenantId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  downloadAllowed: boolean;
}

export interface RequestUploadResult {
  mediaAssetId: string;
  upload: PresignedUploadUrl;
}

/**
 * ENT-24/BE-09: point d'entrée du téléversement — valide le type MIME et la
 * taille contre la liste blanche avant de délivrer une URL présignée.
 * Le fichier ne transite jamais par le serveur applicatif (section 12).
 */
@Injectable()
export class RequestUploadUseCase {
  constructor(
    @Inject(MEDIA_ASSET_REPOSITORY) private readonly mediaAssetRepository: MediaAssetRepositoryPort,
    @Inject(OBJECT_STORAGE) private readonly objectStorage: ObjectStoragePort,
    private readonly plansFacade: PlansFacade,
  ) {}

  async execute(input: RequestUploadInput): Promise<RequestUploadResult> {
    const kind = resolveMediaKind(input.mimeType);
    assertWithinSizeLimit(kind, input.sizeBytes);

    // Quota de stockage du plan (ENT-24) : contrôlé avant de délivrer une URL de téléversement.
    const [quota, usedBytes] = await Promise.all([
      this.plansFacade.checkQuota(input.tenantId, "storageGb"),
      this.mediaAssetRepository.sumSizeBytesForTenant(input.tenantId),
    ]);
    assertWithinStorageQuota(usedBytes, input.sizeBytes, quota.limit);

    const upload = await this.objectStorage.createPresignedUpload({
      tenantId: input.tenantId,
      filename: input.filename,
      mimeType: input.mimeType,
    });

    const asset = await this.mediaAssetRepository.create({
      tenantId: input.tenantId,
      kind,
      originalFilename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageKey: upload.storageKey,
      downloadAllowed: input.downloadAllowed,
    });

    return { mediaAssetId: asset.id, upload };
  }
}
