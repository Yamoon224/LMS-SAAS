import { isWithinAutomaticWindow } from "./refund-request";

/** Progression strictement inférieure à ce pourcentage pour un remboursement intégral automatique (section 9.5). */
export const AUTOMATIC_REFUND_MAX_PROGRESS_PERCENT = 20;

/** Note enregistrée sur une demande acceptée automatiquement. */
export const AUTO_ACCEPT_NOTE = "acceptation automatique : conditions de la politique remplies";

export interface RefundEligibilityInput {
  /** Date de l'achat en ligne. */
  paidAt: Date;
  /** Date de la demande. */
  requestedAt: Date;
  /** Leçons terminées par l'apprenant et nombre total de leçons de la formation (0 leçon = progression nulle). */
  completedLessons: number;
  totalLessons: number;
  /** Tentatives de quiz ou d'examen SOUMISES (une tentative simplement démarrée ne compte pas). */
  submittedAssessmentAttempts: number;
  certificateIssued: boolean;
}

/** Critères de la politique, évalués à la demande puis figés avec elle. `eligible` = tous remplis. */
export interface RefundEligibility {
  eligible: boolean;
  /** Achat en ligne de 7 jours au plus (exactement 7 jours : encore dans la fenêtre). */
  withinWindow: boolean;
  /** Progression strictement inférieure à 20 % (exactement 20 % : non remplie). */
  progressBelowLimit: boolean;
  /** Aucune tentative de quiz ou d'examen soumise. */
  noAssessmentSubmitted: boolean;
  /** Aucun certificat délivré. */
  noCertificate: boolean;
  /** Progression arrondie à l'entier inférieur, pour l'affichage uniquement. */
  progressPercent: number;
}

/**
 * Section 9.5 : éligible au remboursement intégral automatique si (achat en ligne ≤ 7 jours) ET (progression < 20 %)
 * ET (aucune tentative de quiz/examen soumise) ET (aucun certificat délivré). Règle pure. La comparaison de la
 * progression se fait en entiers (completed × 100 < 20 × total) : aucun arrondi flottant ne peut franchir la limite.
 */
export function evaluateRefundEligibility(input: RefundEligibilityInput): RefundEligibility {
  const completed = Math.max(0, input.completedLessons);
  const total = Math.max(0, input.totalLessons);
  const progressBelowLimit = total === 0 || completed * 100 < AUTOMATIC_REFUND_MAX_PROGRESS_PERCENT * total;
  const withinWindow = isWithinAutomaticWindow(input.paidAt, input.requestedAt);
  const noAssessmentSubmitted = input.submittedAssessmentAttempts <= 0;
  const noCertificate = !input.certificateIssued;

  return {
    eligible: withinWindow && progressBelowLimit && noAssessmentSubmitted && noCertificate,
    withinWindow,
    progressBelowLimit,
    noAssessmentSubmitted,
    noCertificate,
    progressPercent: total === 0 ? 0 : Math.min(100, Math.floor((completed * 100) / total)),
  };
}

/** Critères que l'infrastructure sait fournir (sans la date) : lus auprès des modules enrollments, assessments, certificates. */
export interface RefundEligibilityData {
  completedLessons: number;
  totalLessons: number;
  submittedAssessmentAttempts: number;
  certificateIssued: boolean;
}

export interface RefundEligibilityDataPort {
  load(enrollmentId: string): Promise<RefundEligibilityData>;
}

export const REFUND_ELIGIBILITY_DATA = Symbol("REFUND_ELIGIBILITY_DATA");
