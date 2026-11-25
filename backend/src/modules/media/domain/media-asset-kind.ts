import { DomainError } from "@shared/errors/domain-error";

export enum MediaAssetKind {
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  IMAGE = "IMAGE",
  DOCUMENT = "DOCUMENT",
}

export class UnsupportedMediaTypeError extends DomainError {
  readonly code = "TYPE_MEDIA_NON_SUPPORTE";
}

export class MediaTooLargeError extends DomainError {
  readonly code = "MEDIA_TROP_VOLUMINEUX";
}

/** BE-09: "limites de taille et types MIME" — liste blanche par nature de média (ENT-24). */
const ALLOWED_MIME_TYPES: Record<MediaAssetKind, readonly string[]> = {
  [MediaAssetKind.VIDEO]: ["video/mp4", "video/webm", "video/quicktime"],
  [MediaAssetKind.AUDIO]: ["audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg"],
  [MediaAssetKind.IMAGE]: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  [MediaAssetKind.DOCUMENT]: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    // Ressources téléchargeables (ENT-24) : tableurs et CSV. Aucun exécutable ni archive.
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ],
};

/** Taille maximale par nature de média, en octets. */
const MAX_SIZE_BYTES: Record<MediaAssetKind, number> = {
  [MediaAssetKind.VIDEO]: 2 * 1024 * 1024 * 1024, // 2 Go
  [MediaAssetKind.AUDIO]: 200 * 1024 * 1024, // 200 Mo
  [MediaAssetKind.IMAGE]: 10 * 1024 * 1024, // 10 Mo
  [MediaAssetKind.DOCUMENT]: 50 * 1024 * 1024, // 50 Mo
};

export function resolveMediaKind(mimeType: string): MediaAssetKind {
  for (const kind of Object.values(MediaAssetKind)) {
    if (ALLOWED_MIME_TYPES[kind].includes(mimeType)) {
      return kind;
    }
  }
  throw new UnsupportedMediaTypeError(`Type MIME non supporté: ${mimeType}`);
}

export function assertWithinSizeLimit(kind: MediaAssetKind, sizeBytes: number): void {
  const max = MAX_SIZE_BYTES[kind];
  if (sizeBytes > max) {
    throw new MediaTooLargeError(
      `Le fichier (${sizeBytes} octets) dépasse la limite autorisée pour ${kind} (${max} octets).`,
    );
  }
}

export class StorageQuotaExceededError extends DomainError {
  readonly code = "QUOTA_STOCKAGE_DEPASSE";
}

const BYTES_PER_GB = 1024 * 1024 * 1024;

/**
 * ENT-24 / ENT-07 : quota de stockage du plan (`storageGb`, null = illimité). Le total déjà occupé plus le nouveau
 * fichier ne doit pas dépasser la limite ; un plan sans abonnement actif a une limite de 0 (rien n'est accepté).
 */
export function assertWithinStorageQuota(usedBytes: number, newBytes: number, limitGb: number | null): void {
  if (limitGb === null) return;
  if (usedBytes + newBytes > limitGb * BYTES_PER_GB) {
    throw new StorageQuotaExceededError(
      `Le quota de stockage de votre plan (${limitGb} Go) serait dépassé. Supprimez des fichiers ou changez de plan.`,
    );
  }
}
