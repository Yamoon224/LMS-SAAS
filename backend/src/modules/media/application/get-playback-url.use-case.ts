import { Inject, Injectable } from "@nestjs/common";
import { DomainError, NotFoundDomainError } from "@shared/errors";

import { MEDIA_ASSET_REPOSITORY } from "../domain/media-asset.repository.port";
import type { MediaAssetRepositoryPort } from "../domain/media-asset.repository.port";
import { OBJECT_STORAGE } from "../domain/object-storage.port";
import type { ObjectStoragePort, SignedPlaybackUrl } from "../domain/object-storage.port";

export class MediaAssetNotReadyError extends DomainError {
  readonly code = "MEDIA_NON_PRET";
}

/** Durée de validité par défaut d'une URL de lecture (section 11, "à durée limitée"). */
const DEFAULT_PLAYBACK_TTL_SECONDS = 60 * 30; // 30 minutes

/**
 * Section 11: "URL signées à durée limitée" — jamais d'URL S3 permanente
 * exposée au client. Le téléchargement direct (plutôt que le streaming) ne
 * doit être proposé que si l'asset l'autorise (ENT-24, downloadAllowed).
 */
@Injectable()
export class GetPlaybackUrlUseCase {
  constructor(
    @Inject(MEDIA_ASSET_REPOSITORY) private readonly mediaAssetRepository: MediaAssetRepositoryPort,
    @Inject(OBJECT_STORAGE) private readonly objectStorage: ObjectStoragePort,
  ) {}

  /** `tenantId`: l'asset doit appartenir au tenant de l'appelant (404 sinon, jamais 403). */
  async execute(mediaAssetId: string, tenantId: string): Promise<SignedPlaybackUrl> {
    const asset = await this.mediaAssetRepository.findByIdInTenant(mediaAssetId, tenantId);
    if (!asset) {
      throw new NotFoundDomainError(`Asset média introuvable: ${mediaAssetId}`);
    }

    if (!asset.isReady()) {
      throw new MediaAssetNotReadyError(`L'asset média n'est pas encore prêt: ${mediaAssetId}`);
    }

    const target = asset.hlsPrefix ?? asset.storageKey;
    return this.objectStorage.createSignedPlaybackUrl(target, DEFAULT_PLAYBACK_TTL_SECONDS);
  }
}
