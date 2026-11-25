import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { MALWARE_SCANNER, MalwareScannerUnavailableError } from "../domain/malware-scanner.port";
import type { MalwareScannerPort } from "../domain/malware-scanner.port";
import { MediaAssetKind } from "../domain/media-asset-kind";
import type { MediaAsset } from "../domain/media-asset.entity";
import { MEDIA_ASSET_REPOSITORY } from "../domain/media-asset.repository.port";
import type { MediaAssetRepositoryPort } from "../domain/media-asset.repository.port";
import { OBJECT_STORAGE, StorageObjectNotFoundError } from "../domain/object-storage.port";
import type { ObjectStoragePort } from "../domain/object-storage.port";
import { VIDEO_TRANSCODER } from "../domain/video-transcoder.port";
import type { VideoTranscoderPort } from "../domain/video-transcoder.port";
import { MediaAssetReadyEvent, MediaAssetRejectedEvent, MediaTranscodingStartedEvent } from "../media.events";

/** Motifs génériques montrables à l'entreprise : jamais le nom de la menace détectée. */
export const MEDIA_REJECTED_REASON = "Fichier refusé par l'analyse de sécurité.";
export const MEDIA_TOO_LARGE_REASON = "Fichier trop volumineux pour l'analyse de sécurité.";
export const MEDIA_MISSING_REASON = "Le fichier n'a pas été reçu par le stockage.";

export type ScanOutcome =
  | "RELEASED" // sain (ou analyse désactivée en développement) : transcodage lancé ou asset prêt
  | "REJECTED"
  | "FAILED"
  | "RETRY_LATER" // scanner indisponible : l'asset reste SCAN_PENDING
  | "SKIPPED"; // asset inconnu, déjà traité ou déjà en cours d'analyse

/**
 * Étape 28 (section 4.1 Media, section 11) : analyse antivirus d'un fichier téléversé directement dans le stockage,
 * AVANT tout transcodage ou mise à disposition. Appelé à la confirmation de l'upload puis, tant que l'asset reste
 * SCAN_PENDING, par la tâche planifiée de reprise.
 */
@Injectable()
export class ScanUploadedAssetUseCase {
  private readonly logger = new Logger(ScanUploadedAssetUseCase.name);
  /** Évite qu'une même instance analyse deux fois le même asset en parallèle (confirmation + tâche de reprise). */
  private readonly inFlight = new Set<string>();

  constructor(
    @Inject(MEDIA_ASSET_REPOSITORY) private readonly mediaAssetRepository: MediaAssetRepositoryPort,
    @Inject(OBJECT_STORAGE) private readonly objectStorage: ObjectStoragePort,
    @Inject(MALWARE_SCANNER) private readonly scanner: MalwareScannerPort,
    @Inject(VIDEO_TRANSCODER) private readonly videoTranscoder: VideoTranscoderPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(mediaAssetId: string): Promise<ScanOutcome> {
    if (this.inFlight.has(mediaAssetId)) return "SKIPPED";
    this.inFlight.add(mediaAssetId);
    try {
      const asset = await this.mediaAssetRepository.findById(mediaAssetId);
      if (!asset || !asset.isScanPending()) return "SKIPPED";
      return await this.scanAndDecide(asset);
    } finally {
      this.inFlight.delete(mediaAssetId);
    }
  }

  private async scanAndDecide(asset: MediaAsset): Promise<ScanOutcome> {
    if (!this.scanner.isConfigured()) {
      if (this.scanner.isRequired()) {
        this.logger.error(
          `Analyse antivirus requise (MEDIA_SCAN_REQUIRED=true) mais CLAMAV_HOST est absent : l'asset ${asset.id} reste en attente.`,
        );
        return "RETRY_LATER";
      }
      this.logger.warn(
        `Antivirus désactivé (CLAMAV_HOST absent, MEDIA_SCAN_REQUIRED non activé) : l'asset ${asset.id} est publié SANS analyse. À ne jamais faire en production.`,
      );
      await this.release(asset);
      return "RELEASED";
    }

    let verdict;
    try {
      const content = await this.objectStorage.openObject(asset.storageKey);
      verdict = await this.scanner.scan(content);
    } catch (error) {
      if (error instanceof StorageObjectNotFoundError) {
        asset.markFailed(MEDIA_MISSING_REASON);
        await this.mediaAssetRepository.save(asset);
        return "FAILED";
      }
      const detail = error instanceof MalwareScannerUnavailableError ? error.message : String(error);
      this.logger.warn(`Analyse de l'asset ${asset.id} impossible pour l'instant, nouvelle tentative plus tard : ${detail}`);
      return "RETRY_LATER";
    }

    if (verdict.kind === "CLEAN") {
      await this.release(asset);
      return "RELEASED";
    }

    if (verdict.kind === "INFECTED") {
      // La signature n'est écrite que dans les journaux serveur (asset identifié par son id).
      this.logger.warn(`Asset ${asset.id} (tenant ${asset.tenantId}) infecté : ${verdict.signature}. Fichier supprimé.`);
    } else {
      this.logger.warn(`Asset ${asset.id} (tenant ${asset.tenantId}) trop volumineux pour l'analyse. Fichier supprimé.`);
    }
    await this.discard(asset, verdict.kind === "INFECTED" ? "MALWARE_DETECTED" : "SCAN_SIZE_LIMIT");
    return "REJECTED";
  }

  private async discard(asset: MediaAsset, reason: "MALWARE_DETECTED" | "SCAN_SIZE_LIMIT"): Promise<void> {
    try {
      await this.objectStorage.deleteObject(asset.storageKey);
    } catch (error) {
      // Le refus prime : l'asset n'est de toute façon jamais servi. La suppression sera à reprendre à la main.
      this.logger.error(`Suppression du fichier refusé impossible (asset ${asset.id}) : ${String(error)}`);
    }
    asset.reject(reason === "MALWARE_DETECTED" ? MEDIA_REJECTED_REASON : MEDIA_TOO_LARGE_REASON);
    await this.mediaAssetRepository.save(asset);
    this.eventEmitter.emit("media-asset.rejected", new MediaAssetRejectedEvent(asset.id, asset.tenantId, reason));
  }

  /** Suite normale après une analyse saine : une vidéo démarre son transcodage HLS, tout autre média est prêt. */
  private async release(asset: MediaAsset): Promise<void> {
    if (asset.kind !== MediaAssetKind.VIDEO) {
      asset.markReady();
      await this.mediaAssetRepository.save(asset);
      this.eventEmitter.emit("media-asset.ready", new MediaAssetReadyEvent(asset.id, asset.tenantId));
      return;
    }

    asset.startProcessing();
    await this.mediaAssetRepository.save(asset);
    const job = await this.videoTranscoder.startTranscoding({
      sourceStorageKey: asset.storageKey,
      outputPrefix: `hls/${asset.tenantId}/${asset.id}`,
    });
    this.eventEmitter.emit(
      "media-asset.transcoding-started",
      new MediaTranscodingStartedEvent(asset.id, job.providerJobId),
    );
  }
}
