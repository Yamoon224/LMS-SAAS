export interface AttestationPdfData {
  learnerName: string;
  courseTitle: string;
  number: string;
  issuedAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  durationMinutes: number | null;
  progressPercent: number;
  qrVerificationUrl: string;
  /** Langue du document (fr par défaut). */
  locale?: string;
}

/** Port de génération du PDF d'attestation (mise en page = détail d'infrastructure). */
export interface AttestationPdfRendererPort {
  render(data: AttestationPdfData): Promise<Buffer>;
}

export const ATTESTATION_PDF_RENDERER = Symbol("ATTESTATION_PDF_RENDERER");
