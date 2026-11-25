import { Injectable } from "@nestjs/common";

import { DeleteMediaAssetUseCase } from "./application/delete-media-asset.use-case";
import { GetMediaAssetStatusUseCase } from "./application/get-media-asset-status.use-case";
import type { MediaAssetStatusView } from "./application/get-media-asset-status.use-case";
import { GetPlaybackUrlUseCase } from "./application/get-playback-url.use-case";
import type { SignedPlaybackUrl } from "./domain/object-storage.port";

export type { MediaAssetStatusView };

/**
 * Seule API publique du module media. Utilisée par le futur lecteur de
 * formation (PUB-09) pour obtenir une URL de lecture signée à durée limitée
 * sans jamais exposer l'URL S3/CloudFront brute.
 */
@Injectable()
export class MediaFacade {
  constructor(
    private readonly getPlaybackUrlUseCase: GetPlaybackUrlUseCase,
    private readonly getMediaAssetStatusUseCase: GetMediaAssetStatusUseCase,
    private readonly deleteMediaAssetUseCase: DeleteMediaAssetUseCase,
  ) {}

  async getPlaybackUrl(mediaAssetId: string, tenantId: string): Promise<SignedPlaybackUrl> {
    return this.getPlaybackUrlUseCase.execute(mediaAssetId, tenantId);
  }

  /** ENT-24 : état et nature d'un média du tenant ; NotFoundDomainError (404) s'il est inconnu OU d'un autre tenant. */
  async getAssetInTenant(mediaAssetId: string, tenantId: string): Promise<MediaAssetStatusView> {
    return this.getMediaAssetStatusUseCase.execute(mediaAssetId, tenantId);
  }

  /** ENT-24 : supprime un média du tenant (fichier du stockage + ligne). 404 s'il est inconnu OU d'un autre tenant. */
  async deleteAsset(mediaAssetId: string, tenantId: string): Promise<void> {
    await this.deleteMediaAssetUseCase.execute(mediaAssetId, tenantId);
  }
}
