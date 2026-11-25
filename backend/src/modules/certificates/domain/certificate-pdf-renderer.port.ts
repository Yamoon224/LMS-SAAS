import type { CertificateDesign } from "./certificate-template.entity";

export interface CertificatePdfData {
  learnerName: string;
  courseTitle: string;
  number: string;
  issuedAt: Date;
  scorePercent: number | null;
  qrVerificationUrl: string;
  /** Durée estimée de la formation, en minutes (affichée si le design le demande). */
  durationMinutes?: number | null;
  design: CertificateDesign;
}

/**
 * Port de génération du PDF (section 12.4). Séparé de l'entité Certificate
 * elle-même car la mise en page est un détail d'infrastructure (PDFKit),
 * jamais une règle métier.
 */
export interface CertificatePdfRendererPort {
  render(data: CertificatePdfData): Promise<Buffer>;
}

export const CERTIFICATE_PDF_RENDERER = Symbol("CERTIFICATE_PDF_RENDERER");
