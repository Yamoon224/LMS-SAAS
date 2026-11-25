/** ENT-23/ENT-24: type de contenu d'une leçon. */
export enum ResourceType {
  TEXT = "TEXT",
  PDF = "PDF",
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
  IMAGE = "IMAGE",
  DOCUMENT = "DOCUMENT",
  LINK = "LINK",
}

/** ENT-25: critère de consultation obligatoire selon le type de ressource. */
export interface CompletionCriteria {
  /** Pour VIDEO/AUDIO: pourcentage visionné requis (ex. 90). */
  watchedPercent?: number;
  /** Pour PDF/DOCUMENT: simple ouverture suffit. */
  requiresOpen?: boolean;
}
