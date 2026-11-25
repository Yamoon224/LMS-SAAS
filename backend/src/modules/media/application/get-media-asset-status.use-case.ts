import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { MediaAssetStatus } from "../domain/media-asset-status";
import { MEDIA_ASSET_REPOSITORY } from "../domain/media-asset.repository.port";
import type { MediaAssetRepositoryPort } from "../domain/media-asset.repository.port";

export interface MediaAssetStatusView {
  mediaAssetId: string;
  kind: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  downloadAllowed: boolean;
  status: MediaAssetStatus;
  /** Motif générique pour REJECTED / FAILED (jamais le détail d'une menace détectée). */
  reason: string | null;
}

/** État d'un média pour l'entreprise : « analyse en cours » (SCAN_PENDING), « refusé » (REJECTED), etc. */
@Injectable()
export class GetMediaAssetStatusUseCase {
  constructor(
    @Inject(MEDIA_ASSET_REPOSITORY) private readonly mediaAssetRepository: MediaAssetRepositoryPort,
  ) {}

  async execute(mediaAssetId: string, tenantId: string): Promise<MediaAssetStatusView> {
    const asset = await this.mediaAssetRepository.findByIdInTenant(mediaAssetId, tenantId);
    if (!asset) throw new NotFoundDomainError(`Asset média introuvable: ${mediaAssetId}`);
    const showReason = asset.status === MediaAssetStatus.REJECTED || asset.status === MediaAssetStatus.FAILED;
    return {
      mediaAssetId: asset.id,
      kind: asset.kind,
      filename: asset.originalFilename,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      downloadAllowed: asset.downloadAllowed,
      status: asset.status,
      reason: showReason ? asset.failureReason : null,
    };
  }
}
