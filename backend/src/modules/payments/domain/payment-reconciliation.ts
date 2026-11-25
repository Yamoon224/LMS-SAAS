/** Sondage des paiements en attente : un paiement plus récent n'est pas encore interrogé (webhook probablement en route). */
export const PENDING_POLL_MIN_AGE_MS = 2 * 60 * 1000;
/** Au-delà, un paiement toujours en attente est expiré (mobile money : la demande de validation est périmée). */
export const PENDING_EXPIRY_MS = 30 * 60 * 1000;
/** Fenêtre de détection des paiements en double suspects (section 9.6). */
export const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

/** Motif enregistré sur un paiement expiré par la plateforme. */
export const PAYMENT_EXPIRED_REASON = "expiré";

export type PendingPaymentAction = "WAIT" | "POLL";

/** Âge d'un paiement en attente : trop récent (WAIT) ou à re-vérifier auprès du fournisseur (POLL). */
export function classifyPendingPayment(createdAt: Date, now: Date): PendingPaymentAction {
  return now.getTime() - createdAt.getTime() >= PENDING_POLL_MIN_AGE_MS ? "POLL" : "WAIT";
}

/** Un paiement toujours en attente après le délai d'expiration doit être passé en échec (motif « expiré »). */
export function isPendingExpired(createdAt: Date, now: Date): boolean {
  return now.getTime() - createdAt.getTime() >= PENDING_EXPIRY_MS;
}

export interface DuplicateCandidate {
  paymentId: string;
  tenantId: string;
  amount: number;
  currency: string;
  /** Apprenant et formation de l'inscription : deux paiements identiques pour le même couple sont suspects. */
  userId: string;
  courseId: string;
  createdAt: Date;
}

export interface DuplicateGroup {
  /** Premier paiement du groupe : il est légitime, jamais proposé au remboursement. */
  original: DuplicateCandidate;
  /** Paiements suivants, même tenant/apprenant/formation/montant dans la fenêtre. */
  duplicates: DuplicateCandidate[];
}

/**
 * Paiements en double suspects : même entreprise, même apprenant, même formation, même montant et même devise, chaque
 * paiement à moins de `windowMs` du précédent. Des paiements de montants ou formations différents, ou espacés de plus
 * que la fenêtre, restent des achats légitimes distincts. Fonction pure : l'appelant ne fournit que des paiements
 * encaissés.
 */
export function findSuspectedDuplicates(
  candidates: readonly DuplicateCandidate[],
  windowMs: number = DUPLICATE_WINDOW_MS,
): DuplicateGroup[] {
  const byKey = new Map<string, DuplicateCandidate[]>();
  for (const candidate of candidates) {
    const key = [candidate.tenantId, candidate.userId, candidate.courseId, candidate.amount, candidate.currency].join("|");
    const list = byKey.get(key) ?? [];
    list.push(candidate);
    byKey.set(key, list);
  }

  const groups: DuplicateGroup[] = [];
  for (const list of byKey.values()) {
    const sorted = [...list].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    let cluster: DuplicateCandidate[] = [];
    const flush = () => {
      const [original, ...duplicates] = cluster;
      if (original && duplicates.length > 0) groups.push({ original, duplicates });
      cluster = [];
    };
    for (const payment of sorted) {
      const previous = cluster[cluster.length - 1];
      if (previous && payment.createdAt.getTime() - previous.createdAt.getTime() > windowMs) flush();
      cluster.push(payment);
    }
    flush();
  }
  return groups;
}
