import { Inject, Injectable, Logger } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { MEDIA_ASSET_REPOSITORY } from "../domain/media-asset.repository.port";
import type { MediaAssetRepositoryPort } from "../domain/media-asset.repository.port";

import { ScanUploadedAssetUseCase } from "./scan-uploaded-asset.use-case";

/**
 * Déclenché quand le client confirme la fin du PUT vers l'URL présignée (section 12, étape 1→2 du pipeline AWS,
 * section 15.4). Le fichier passe en attente d'analyse antivirus (SCAN_PENDING) ; l'analyse, puis le transcodage
 * HLS d'une vidéo ou la mise à disposition d'un autre média, se font en arrière-plan : la réponse ne dépend pas de
 * la taille du fichier. Le client suit l'état par `GET business/media/:id`.
 */
@Injectable()
export class ConfirmUploadUseCase {
  private readonly logger = new Logger(ConfirmUploadUseCase.name);

  constructor(
    @Inject(MEDIA_ASSET_REPOSITORY) private readonly mediaAssetRepository: MediaAssetRepositoryPort,
    private readonly scanUploadedAsset: ScanUploadedAssetUseCase,
  ) {}

  /** `tenantId`: l'asset doit appartenir au tenant de l'appelant (404 sinon, jamais 403). */
  async execute(mediaAssetId: string, tenantId: string): Promise<void> {
    const asset = await this.mediaAssetRepository.findByIdInTenant(mediaAssetId, tenantId);
    if (!asset) {
      throw new NotFoundDomainError(`Asset média introuvable: ${mediaAssetId}`);
    }

    // Une confirmation répétée d'un asset déjà en attente est inoffensive ; tout autre état lève une transition invalide.
    if (!asset.isScanPending()) {
      asset.markScanPending();
      await this.mediaAssetRepository.save(asset);
    }

    void this.scanUploadedAsset.execute(asset.id).catch((error: unknown) => {
      this.logger.error(`Analyse de l'asset ${asset.id} en échec, reprise par la tâche planifiée : ${String(error)}`);
    });
  }
}
