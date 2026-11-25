export interface PresignedUploadUrl {
  uploadUrl: string;
  storageKey: string;
  /** En-têtes requis par le client lors du PUT (ex. Content-Type). */
  requiredHeaders: Record<string, string>;
  expiresAt: Date;
}

export interface PresignedUploadRequest {
  tenantId: string;
  filename: string;
  mimeType: string;
}

export interface SignedPlaybackUrl {
  url: string;
  expiresAt: Date;
}

/**
 * Port de stockage objet compatible S3 (section 12 "Stockage"). Séparé en
 * deux responsabilités (upload, lecture) plutôt qu'une interface unique —
 * un futur fournisseur de secours pourrait n'implémenter que l'upload.
 */
export interface ObjectStorageUploader {
  /** BE: "téléversement direct vers S3 (URL présignées)" — jamais via le serveur applicatif. */
  createPresignedUpload(request: PresignedUploadRequest): Promise<PresignedUploadUrl>;
  deleteObject(storageKey: string): Promise<void>;
}

/** L'objet demandé n'existe pas dans le stockage (téléversement jamais effectué ou déjà supprimé). */
export class StorageObjectNotFoundError extends Error {
  constructor(storageKey: string) {
    super(`Objet introuvable dans le stockage: ${storageKey}`);
    this.name = "StorageObjectNotFoundError";
  }
}

export interface ObjectStorageReader {
  /** Flux du contenu d'un objet (analyse antivirus côté serveur). Lève StorageObjectNotFoundError si absent. */
  openObject(storageKey: string): Promise<AsyncIterable<Uint8Array>>;

  /** Section 11: "URL signées à durée limitée" pour la lecture d'un média protégé. */
  createSignedPlaybackUrl(storageKeyOrPrefix: string, ttlSeconds: number): Promise<SignedPlaybackUrl>;
}

export interface ObjectStoragePort extends ObjectStorageUploader, ObjectStorageReader {}

export const OBJECT_STORAGE = Symbol("OBJECT_STORAGE");
