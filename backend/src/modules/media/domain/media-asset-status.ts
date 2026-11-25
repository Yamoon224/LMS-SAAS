/**
 * Cycle de vie d'un asset média : téléversé (UPLOADING), en cours de
 * analyse antivirus (SCAN_PENDING, puis REJECTED si le fichier est infecté),
 * en cours de transcodage le cas échéant (PROCESSING, vidéo uniquement), prêt à être
 * diffusé (READY), ou échoué (FAILED). Un fichier non vidéo (PDF, image)
 * passe directement de UPLOADING à READY sans étape PROCESSING.
 */
export enum MediaAssetStatus {
  UPLOADING = "UPLOADING",
  /** Téléversé, en attente d'analyse antivirus (étape 28) : jamais servi tant que l'analyse n'a pas conclu. */
  SCAN_PENDING = "SCAN_PENDING",
  PROCESSING = "PROCESSING",
  READY = "READY",
  FAILED = "FAILED",
  /** Refusé par l'analyse antivirus : le fichier est supprimé du stockage (état terminal). */
  REJECTED = "REJECTED",
}

const ALLOWED_TRANSITIONS: Record<MediaAssetStatus, MediaAssetStatus[]> = {
  [MediaAssetStatus.UPLOADING]: [
    MediaAssetStatus.SCAN_PENDING,
    MediaAssetStatus.PROCESSING,
    MediaAssetStatus.READY,
    MediaAssetStatus.FAILED,
  ],
  [MediaAssetStatus.SCAN_PENDING]: [
    MediaAssetStatus.PROCESSING,
    MediaAssetStatus.READY,
    MediaAssetStatus.REJECTED,
    MediaAssetStatus.FAILED,
  ],
  [MediaAssetStatus.PROCESSING]: [MediaAssetStatus.READY, MediaAssetStatus.FAILED],
  [MediaAssetStatus.READY]: [],
  [MediaAssetStatus.FAILED]: [MediaAssetStatus.UPLOADING],
  [MediaAssetStatus.REJECTED]: [],
};

export function canTransitionMediaAssetStatus(from: MediaAssetStatus, to: MediaAssetStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
