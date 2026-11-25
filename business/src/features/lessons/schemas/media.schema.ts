import { z } from "zod";

import type { ResourceType } from "./lesson.schema";

/**
 * Règles de téléversement (ENT-24). Doit rester cohérent avec la liste blanche et les plafonds du backend
 * (media/domain/media-asset-kind.ts) : le backend reste l'autorité et refuse tout le reste.
 */
export type MediaKind = "VIDEO" | "AUDIO" | "IMAGE" | "DOCUMENT";

const ALLOWED_MIME_TYPES: Record<MediaKind, readonly string[]> = {
  VIDEO: ["video/mp4", "video/webm", "video/quicktime"],
  AUDIO: ["audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg"],
  IMAGE: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  DOCUMENT: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ],
};

const MAX_SIZE_BYTES: Record<MediaKind, number> = {
  VIDEO: 2 * 1024 * 1024 * 1024 - 1, // plafond technique du backend (colonne entière) sous les 2 Go
  AUDIO: 200 * 1024 * 1024,
  IMAGE: 10 * 1024 * 1024,
  DOCUMENT: 50 * 1024 * 1024,
};

const KIND_BY_RESOURCE_TYPE: Partial<Record<ResourceType, MediaKind>> = {
  VIDEO: "VIDEO",
  AUDIO: "AUDIO",
  IMAGE: "IMAGE",
  PDF: "DOCUMENT",
  DOCUMENT: "DOCUMENT",
};

/** Types de leçon qui portent un fichier téléversé. */
export function acceptsUploadedFile(resourceType: ResourceType): boolean {
  return resourceType in KIND_BY_RESOURCE_TYPE;
}

/** Valeur de l'attribut `accept` du sélecteur de fichier pour un type de leçon. */
export function acceptAttribute(resourceType: ResourceType): string {
  if (resourceType === "PDF") return "application/pdf";
  const kind = KIND_BY_RESOURCE_TYPE[resourceType];
  return kind ? ALLOWED_MIME_TYPES[kind].join(",") : "";
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} Go`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} Mo`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${bytes} o`;
}

/** Contrôle côté client avant toute demande d'URL : retourne un message en français, ou null si le fichier est accepté. */
export function validateMediaFile(
  file: { name: string; type: string; size: number },
  resourceType: ResourceType,
): string | null {
  const kind = KIND_BY_RESOURCE_TYPE[resourceType];
  if (!kind) return "Ce type de leçon n'accepte pas de fichier.";
  if (file.size <= 0) return "Le fichier est vide.";
  if (/[\\/]/.test(file.name) || file.name.length > 255) return "Nom de fichier invalide.";
  const allowed = resourceType === "PDF" ? ["application/pdf"] : ALLOWED_MIME_TYPES[kind];
  if (!allowed.includes(file.type)) {
    return resourceType === "PDF" ? "Seuls les fichiers PDF sont acceptés." : "Ce type de fichier n'est pas accepté pour cette leçon.";
  }
  if (file.size > MAX_SIZE_BYTES[kind]) {
    return `Le fichier dépasse la taille maximale de ${formatBytes(MAX_SIZE_BYTES[kind])}.`;
  }
  return null;
}

export const mediaStatusSchema = z.enum(["UPLOADING", "SCAN_PENDING", "PROCESSING", "READY", "FAILED", "REJECTED"]);
export type MediaStatus = z.infer<typeof mediaStatusSchema>;

export const MEDIA_STATUS_LABELS: Record<MediaStatus, string> = {
  UPLOADING: "Téléversement en cours",
  SCAN_PENDING: "Analyse antivirus en cours",
  PROCESSING: "En transcodage",
  READY: "Prêt",
  FAILED: "Échec",
  REJECTED: "Refusé (fichier non sûr)",
};

/** États transitoires : l'écran interroge le backend tant que le média est dans l'un d'eux. */
export function isMediaSettled(status: MediaStatus): boolean {
  return status === "READY" || status === "FAILED" || status === "REJECTED";
}

/** GET /business/media/:id et `media` de la fiche de leçon. */
export const mediaViewSchema = z.object({
  mediaAssetId: z.string(),
  kind: z.string(),
  filename: z.string(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().optional(),
  status: mediaStatusSchema,
  reason: z.string().nullish(),
});
export type MediaView = z.infer<typeof mediaViewSchema>;

export const uploadRequestResponseSchema = z.object({
  mediaAssetId: z.string(),
  uploadUrl: z.string().url(),
  requiredHeaders: z.record(z.string()),
});
export type UploadRequestResponse = z.infer<typeof uploadRequestResponseSchema>;
