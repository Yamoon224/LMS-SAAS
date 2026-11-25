import { InvalidStateTransitionError } from "@shared/errors";

import type { MediaAssetKind } from "./media-asset-kind";
import { canTransitionMediaAssetStatus, MediaAssetStatus } from "./media-asset-status";

export interface MediaAssetProps {
  id: string;
  tenantId: string;
  kind: MediaAssetKind;
  status: MediaAssetStatus;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  hlsPrefix: string | null;
  durationSeconds: number | null;
  downloadAllowed: boolean;
  failureReason: string | null;
}

/**
 * Entité pure du domaine MediaAsset : aucune dépendance à NestJS, à l'ORM ou
 * à un SDK AWS (section 13.2). Porte le cycle de vie upload → transcodage →
 * prêt (section 15.4).
 */
export class MediaAsset {
  private constructor(private props: MediaAssetProps) {}

  static fromPersistence(props: MediaAssetProps): MediaAsset {
    return new MediaAsset(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get kind(): MediaAssetKind {
    return this.props.kind;
  }

  get status(): MediaAssetStatus {
    return this.props.status;
  }

  get storageKey(): string {
    return this.props.storageKey;
  }

  get hlsPrefix(): string | null {
    return this.props.hlsPrefix;
  }

  get originalFilename(): string {
    return this.props.originalFilename;
  }

  get mimeType(): string {
    return this.props.mimeType;
  }

  get sizeBytes(): number {
    return this.props.sizeBytes;
  }

  /** Motif générique d'un échec ou d'un refus (jamais le nom d'une menace détectée). */
  get failureReason(): string | null {
    return this.props.failureReason;
  }

  get downloadAllowed(): boolean {
    return this.props.downloadAllowed;
  }

  isReady(): boolean {
    return this.props.status === MediaAssetStatus.READY;
  }

  private transitionTo(status: MediaAssetStatus): void {
    if (!canTransitionMediaAssetStatus(this.props.status, status)) {
      throw new InvalidStateTransitionError(
        `Transition d'asset média invalide: ${this.props.status} → ${status}.`,
      );
    }
    this.props.status = status;
  }

  isScanPending(): boolean {
    return this.props.status === MediaAssetStatus.SCAN_PENDING;
  }

  /** Fin du téléversement : le fichier attend son analyse antivirus avant tout transcodage ou diffusion. */
  markScanPending(): void {
    this.transitionTo(MediaAssetStatus.SCAN_PENDING);
  }

  /** Refus après analyse antivirus : état terminal, `reason` est un motif générique montrable au client. */
  reject(reason: string): void {
    this.transitionTo(MediaAssetStatus.REJECTED);
    this.props.failureReason = reason;
  }

  /** Démarre le transcodage HLS (vidéo uniquement, section 15.4). */
  startProcessing(): void {
    this.transitionTo(MediaAssetStatus.PROCESSING);
  }

  /** Marque l'asset prêt — directement depuis UPLOADING pour un fichier non vidéo, ou après transcodage. */
  markReady(hlsPrefix?: string, durationSeconds?: number): void {
    this.transitionTo(MediaAssetStatus.READY);
    this.props.hlsPrefix = hlsPrefix ?? null;
    this.props.durationSeconds = durationSeconds ?? null;
  }

  markFailed(reason: string): void {
    this.transitionTo(MediaAssetStatus.FAILED);
    this.props.failureReason = reason;
  }

  /** Permet une nouvelle tentative de téléversement après un échec. */
  retry(): void {
    this.transitionTo(MediaAssetStatus.UPLOADING);
    this.props.failureReason = null;
  }

  /** Réservé à l'infrastructure (repository) pour persister l'état courant après mutation. */
  toSnapshot(): Readonly<MediaAssetProps> {
    return { ...this.props };
  }
}
