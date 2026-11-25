import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { ScanUploadedAssetUseCase } from "./application/scan-uploaded-asset.use-case";
import { MEDIA_ASSET_REPOSITORY } from "./domain/media-asset.repository.port";
import type { MediaAssetRepositoryPort } from "./domain/media-asset.repository.port";

const BATCH_SIZE = 20;

/** Étape 28 : reprend l'analyse antivirus des assets restés SCAN_PENDING (scanner indisponible, redémarrage). */
@Injectable()
export class MediaScheduler {
  private readonly logger = new Logger(MediaScheduler.name);
  private running = false;

  constructor(
    @Inject(MEDIA_ASSET_REPOSITORY) private readonly mediaAssetRepository: MediaAssetRepositoryPort,
    private readonly scanUploadedAsset: ScanUploadedAssetUseCase,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryPendingScans(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const pending = await this.mediaAssetRepository.listScanPending(BATCH_SIZE);
      for (const asset of pending) {
        try {
          await this.scanUploadedAsset.execute(asset.id);
        } catch (error) {
          this.logger.error(`Reprise d'analyse en échec (asset ${asset.id}) : ${String(error)}`);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
