import { DomainError } from "@shared/errors";

import type { CertificateDesign } from "./certificate-design";
import type { CertificatePdfData } from "./certificate-pdf-renderer.port";

/** ADM-39 : modèle de la bibliothèque de la plateforme. */
export interface LibraryTemplate {
  id: string;
  name: string;
  description: string | null;
  design: CertificateDesign;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class LibraryTemplateNameTakenError extends DomainError {
  readonly code = "NOM_MODELE_BIBLIOTHEQUE_PRIS";
}

export const LIBRARY_NAME_MIN = 2;
export const LIBRARY_NAME_MAX = 120;

/** Nom normalisé (espaces superflus retirés) ; l'unicité est contrôlée sans tenir compte de la casse. */
export function normalizeLibraryName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function sameLibraryName(a: string, b: string): boolean {
  return normalizeLibraryName(a).toLowerCase() === normalizeLibraryName(b).toLowerCase();
}

/**
 * Données fictives d'un aperçu : jamais d'apprenant, de formation ni de numéro réels. Le lien de vérification
 * pointe vers un domaine réservé à la documentation (RFC 2606).
 */
export function buildPreviewData(design: CertificateDesign): CertificatePdfData {
  return {
    learnerName: "Prénom Nom",
    courseTitle: "Intitulé de la formation",
    number: "CERT-EXEMPLE-0001",
    issuedAt: new Date("2026-01-15T00:00:00Z"),
    scorePercent: 92,
    qrVerificationUrl: "https://example.com/verify/CERT-EXEMPLE-0001",
    durationMinutes: 150,
    design,
  };
}
