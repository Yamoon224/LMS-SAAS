/**
 * Port de stockage objet propre à ce module (section 13.2: un module ne doit
 * jamais dépendre des fichiers internes d'un autre module — y compris le
 * client S3 du module media). Le PDF généré est mis à disposition en lecture
 * publique signée, jamais exposé en accès S3 direct (section 11).
 */
export interface CertificateStoragePort {
  uploadPdf(tenantId: string, certificateNumber: string, pdf: Buffer): Promise<string>;
  createSignedDownloadUrl(storageKey: string, ttlSeconds: number): Promise<string>;
}

export const CERTIFICATE_STORAGE = Symbol("CERTIFICATE_STORAGE");
