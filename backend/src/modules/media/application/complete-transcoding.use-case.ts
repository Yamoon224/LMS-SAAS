import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { MEDIA_ASSET_REPOSITORY } from "../domain/media-asset.repository.port";
import type { MediaAssetRepositoryPort } from "../domain/media-asset.repository.port";
import { MediaTranscodingCompletedEvent, MediaTranscodingFailedEvent } from "../media.events";

/** BE-08: appelé par le worker qui traite la fin (succès ou échec) d'un job de transcodage. */
@Injectable()
export class CompleteTranscodingUseCase {
  constructor(
    @Inject(MEDIA_ASSET_REPOSITORY) private readonly mediaAssetRepository: MediaAssetRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async succeed(mediaAssetId: string, hlsPrefix: string, durationSeconds: number): Promise<void> {
    const asset = await this.getAssetOrThrow(mediaAssetId);
    asset.markReady(hlsPrefix, durationSeconds);
    await this.mediaAssetRepository.save(asset);

    this.eventEmitter.emit(
      "media-asset.transcoding-completed",
      new MediaTranscodingCompletedEvent(asset.id, asset.tenantId),
    );
  }

  async fail(mediaAssetId: string, reason: string): Promise<void> {
    const asset = await this.getAssetOrThrow(mediaAssetId);
    asset.markFailed(reason);
    await this.mediaAssetRepository.save(asset);

    this.eventEmitter.emit(
      "media-asset.transcoding-failed",
      new MediaTranscodingFailedEvent(asset.id, reason),
    );
  }

  private async getAssetOrThrow(mediaAssetId: string) {
    const asset = await this.mediaAssetRepository.findById(mediaAssetId);
    if (!asset) {
      throw new NotFoundDomainError(`Asset média introuvable: ${mediaAssetId}`);
    }
    return asset;
  }
}
