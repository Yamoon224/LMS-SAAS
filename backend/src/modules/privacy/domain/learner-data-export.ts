/**
 * Export des données personnelles d'un apprenant (droit d'accès, loi 2013-450). Contient uniquement des données
 * du demandeur ; jamais de haché de mot de passe, de secret 2FA, de jeton, de charge brute d'un prestataire de
 * paiement, de contenu de notification (liens à usage unique), ni de donnée d'une autre personne.
 */
export interface LearnerDataExport {
  exportedAt: string;
  profile: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    locale: string;
    status: string;
    createdAt: string;
    lastLoginAt: string | null;
    emailVerifiedAt: string | null;
  };
  enrollments: Array<{
    id: string;
    courseTitle: string;
    status: string;
    pricePaid: number;
    currency: string;
    paymentMethod: string | null;
    startedAt: string | null;
    expiresAt: string | null;
    completedAt: string | null;
    createdAt: string;
  }>;
  progress: Array<{
    enrollmentId: string;
    lessonTitle: string;
    state: string;
    watchedPercent: number | null;
    opened: boolean;
    startedAt: string | null;
    completedAt: string | null;
  }>;
  assessmentAttempts: Array<{
    enrollmentId: string;
    kind: "QUIZ" | "EXAM";
    status: string;
    scorePercent: number | null;
    answers: unknown;
    startedAt: string;
    submittedAt: string | null;
  }>;
  certificates: Array<{
    number: string;
    status: string;
    courseTitle: string;
    holderName: string;
    scorePercent: number | null;
    issuedAt: string;
    revokedAt: string | null;
  }>;
  purchases: Array<{
    enrollmentId: string | null;
    amount: number;
    currency: string;
    method: string;
    status: string;
    reference: string;
    createdAt: string;
    refunds: Array<{
      amount: number;
      reason: string | null;
      status: string;
      requestedAt: string;
      resolvedAt: string | null;
    }>;
  }>;
  legalAcceptances: Array<{ documentType: string; version: number; title: string; acceptedAt: string }>;
  liveSessionAttendances: Array<{
    liveSessionTitle: string;
    attended: boolean;
    joinedAt: string | null;
    leftAt: string | null;
  }>;
  notifications: Array<{
    channel: string;
    templateKey: string;
    status: string;
    createdAt: string;
    sentAt: string | null;
    readAt: string | null;
  }>;
}

/** Nombres d'éléments par catégorie, pour le journal d'audit (jamais le contenu). */
export function summarizeExport(data: LearnerDataExport): Record<string, number> {
  return {
    enrollments: data.enrollments.length,
    attempts: data.assessmentAttempts.length,
    certificates: data.certificates.length,
    purchases: data.purchases.length,
    notifications: data.notifications.length,
  };
}
