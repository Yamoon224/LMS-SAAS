import { InvalidLessonContentError } from "./lesson.entity";
import type { ResourceType } from "./resource-type";

/**
 * Interprétation de `Lesson.storageUrl` à l'écriture (ENT-23/ENT-24) :
 *  - vide : aucune ressource ;
 *  - UUID : identifiant d'un média (MediaAsset) du tenant, à vérifier auprès du module media ;
 *  - URL https : ressource externe (type LINK) ;
 *  - tout le reste (http, javascript:, data:, clé S3 brute...) est refusé.
 */
export type LessonStorageRef =
  | { kind: "NONE" }
  | { kind: "MEDIA"; mediaAssetId: string }
  | { kind: "EXTERNAL"; url: string };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HTTPS_URL_REGEX = /^https:\/\/[^\s<>"']+$/i;

export function parseLessonStorage(storageUrl: string | null | undefined): LessonStorageRef {
  const value = storageUrl?.trim();
  if (!value) return { kind: "NONE" };
  if (UUID_REGEX.test(value)) return { kind: "MEDIA", mediaAssetId: value.toLowerCase() };
  if (HTTPS_URL_REGEX.test(value) && value.length <= 2048) return { kind: "EXTERNAL", url: value };
  throw new InvalidLessonContentError("La ressource doit être un média téléversé ou une URL https valide.");
}

/** Nature de média attendue par type de leçon (les types TEXT et LINK n'acceptent pas de média téléversé). */
const EXPECTED_MEDIA_KIND: Partial<Record<ResourceType, string>> = {
  VIDEO: "VIDEO",
  AUDIO: "AUDIO",
  IMAGE: "IMAGE",
  PDF: "DOCUMENT",
  DOCUMENT: "DOCUMENT",
};

/** Statuts d'un média à ne pas rattacher à une leçon : téléversement non confirmé, échoué ou refusé par l'analyse. */
const UNUSABLE_MEDIA_STATUSES = new Set(["UPLOADING", "FAILED", "REJECTED"]);

export interface AttachableMedia {
  kind: string;
  mimeType: string;
  status: string;
}

/**
 * Vérifie qu'un média peut être rattaché à une leçon du type donné : nature cohérente (une vidéo dans une leçon vidéo,
 * un PDF dans une leçon PDF...), pas de média refusé par l'analyse ou échoué. Lève InvalidLessonContentError sinon.
 */
export function assertMediaFitsResourceType(resourceType: ResourceType, media: AttachableMedia): void {
  const expected = EXPECTED_MEDIA_KIND[resourceType];
  if (!expected) {
    throw new InvalidLessonContentError("Ce type de leçon n'accepte pas de fichier téléversé.");
  }
  if (media.kind !== expected || (resourceType === "PDF" && media.mimeType !== "application/pdf")) {
    throw new InvalidLessonContentError("Le fichier ne correspond pas au type de la leçon.");
  }
  if (UNUSABLE_MEDIA_STATUSES.has(media.status)) {
    throw new InvalidLessonContentError("Ce fichier n'est pas utilisable (téléversement non terminé, échoué ou refusé) : téléversez-le de nouveau.");
  }
}

/** Une leçon TEXT ne porte aucune ressource ; une leçon LINK n'accepte qu'une URL externe ; les autres un média. */
export function assertStorageRefFitsResourceType(resourceType: ResourceType, ref: LessonStorageRef): void {
  if (ref.kind === "NONE") return;
  if (resourceType === "TEXT") {
    throw new InvalidLessonContentError("Une leçon de type texte ne porte pas de ressource.");
  }
  if (resourceType === "LINK" && ref.kind === "MEDIA") {
    throw new InvalidLessonContentError("Une leçon de type lien attend une URL https.");
  }
  if (resourceType !== "LINK" && ref.kind === "EXTERNAL") {
    throw new InvalidLessonContentError("Cette leçon attend un fichier téléversé.");
  }
}
