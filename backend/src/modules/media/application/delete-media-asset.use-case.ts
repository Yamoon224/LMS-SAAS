import { Inject, Injectable, Logger } from "@nestjs/common";
import { InvalidStateTransitionError, NotFoundDomainError } from "@shared/errors";

import { MediaAssetStatus } from "../domain/media-asset-status";
import { MEDIA_ASSET_REPOSITORY } from "../domain/media-asset.repository.port";
import type { MediaAssetRepositoryPort } from "../domain/media-asset.repository.port";
import { OBJECT_STORAGE } from "../domain/object-storage.port";
import type { ObjectStoragePort } from "../domain/object-storage.port";

/**
 * ENT-24 : suppression d'un média par l'entreprise (libère le quota de stockage). L'asset doit appartenir au tenant de
 * l'appelant (404 sinon, jamais 403). La ligne est supprimée même si le fichier est déjà absent du stockage ; une
 * erreur de stockage est journalisée (le fichier orphelin est alors à purger), elle ne bloque pas l'entreprise.
 * Le contrôle « le média n'est plus rattaché à une leçon » incombe à l'appelant (module course-content).
 */
@Injectable()
export class DeleteMediaAssetUseCase {
  private readonly logger = new Logger(DeleteMediaAssetUseCase.name);

  constructor(
    @Inject(MEDIA_ASSET_REPOSITORY) private readonly mediaAssetRepository: MediaAssetRepositoryPort,
    @Inject(OBJECT_STORAGE) private readonly objectStorage: ObjectStoragePort,
  ) {}

  /** Annulation d'un téléversement par l'entreprise : uniquement un média jamais servi (en cours ou échoué). */
  async abandon(mediaAssetId: string, tenantId: string): Promise<void> {
    const asset = await this.mediaAssetRepository.findByIdInTenant(mediaAssetId, tenantId);
    if (!asset) throw new NotFoundDomainError(`Asset média introuvable: ${mediaAssetId}`);
    if (asset.status !== MediaAssetStatus.UPLOADING && asset.status !== MediaAssetStatus.FAILED) {
      throw new InvalidStateTransitionError(
        "Seul un téléversement en cours ou échoué peut être annulé ; retirez le fichier depuis la leçon.",
      );
    }
    await this.remove(asset);
  }

  async execute(mediaAssetId: string, tenantId: string): Promise<void> {
    const asset = await this.mediaAssetRepository.findByIdInTenant(mediaAssetId, tenantId);
    if (!asset) throw new NotFoundDomainError(`Asset média introuvable: ${mediaAssetId}`);

    await this.remove(asset);
  }

  private async remove(asset: { id: string; storageKey: string }): Promise<void> {
    try {
      await this.objectStorage.deleteObject(asset.storageKey);
    } catch (error) {
      this.logger.warn(`Suppression du fichier ${asset.storageKey} impossible : ${String(error)}`);
    }
    await this.mediaAssetRepository.delete(asset.id);
  }
}
