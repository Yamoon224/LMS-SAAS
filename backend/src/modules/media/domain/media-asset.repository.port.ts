import type { MediaAssetKind } from "./media-asset-kind";
import type { MediaAsset } from "./media-asset.entity";

export interface CreateMediaAssetData {
  tenantId: string;
  kind: MediaAssetKind;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  downloadAllowed: boolean;
}

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface MediaAssetRepositoryPort {
  findById(id: string): Promise<MediaAsset | null>;
  findByIdInTenant(id: string, tenantId: string): Promise<MediaAsset | null>;
  create(data: CreateMediaAssetData): Promise<MediaAsset>;
  save(asset: MediaAsset): Promise<void>;
  /** ENT-24 : supprime la ligne de l'asset (le fichier est supprimé du stockage par l'appelant). */
  delete(id: string): Promise<void>;
  /** ENT-24 : octets occupés par le tenant (hors assets refusés ou échoués, dont le fichier est purgé). */
  sumSizeBytesForTenant(tenantId: string): Promise<number>;
  /** Pour le worker de rapprochement des jobs de transcodage en cours (BE-08). */
  listProcessing(): Promise<MediaAsset[]>;
  /** Assets en attente d'analyse antivirus, les plus anciens d'abord (reprise par tâche planifiée). */
  listScanPending(limit: number): Promise<MediaAsset[]>;
}

export const MEDIA_ASSET_REPOSITORY = Symbol("MEDIA_ASSET_REPOSITORY");
