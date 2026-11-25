import type { SubscriptionStatus } from "./subscription-status";
import type { Subscription } from "./subscription.entity";

export interface CreateSubscriptionData {
  tenantId: string;
  planPriceId: string;
  status: SubscriptionStatus;
}

/**
 * Vue en lecture seule de l'abonnement le plus récent d'une entreprise,
 * enrichie du plan et du prix auxquels il est rattaché (relation Prisma
 * Subscription → PlanPrice → Plan, interne à ce module au sens du schéma de
 * base de données — aucun import des fichiers internes du module plans).
 * Utilisée uniquement par la lecture admin (ADM-09 : consulter l'abonnement
 * courant d'une entreprise).
 */
export interface SubscriptionWithPlanDetails {
  id: string;
  status: SubscriptionStatus;
  autoRenew: boolean;
  startedAt: Date | null;
  currentPeriodEnd: Date | null;
  graceEndsAt: Date | null;
  canceledAt: Date | null;
  planPriceId: string;
  planName: string;
  period: string;
  currency: string;
  amount: number;
  discountPercent: number | null;
  discountAmount: number | null;
  discountPeriodsRemaining: number | null;
  isComplimentary: boolean;
}

/**
 * Prix de plan tel que vu pour une sélection par une entreprise (contrôles
 * d'éligibilité côté serveur: plan public, non archivé, prix actif, essai).
 */
export interface PlanPriceSelection {
  id: string;
  planIsPublic: boolean;
  planIsArchived: boolean;
  isActive: boolean;
  amount: number;
  currency: string;
  period: string;
  trialDays: number;
  /** Nom du plan (notifications, ADM-09). */
  planName?: string;
}

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface SubscriptionRepositoryPort {
  /** Prix de plan et statut de son plan, ou null si le prix n'existe pas. */
  findPlanPriceSelection(planPriceId: string): Promise<PlanPriceSelection | null>;
  findById(id: string): Promise<Subscription | null>;
  /** La plus récente, active ou non — utilisée pour l'historique et les transitions. */
  findLatestForTenant(tenantId: string): Promise<Subscription | null>;
  findActiveForTenant(tenantId: string): Promise<Subscription | null>;
  /** ADM-09: lecture admin de l'abonnement courant d'une entreprise, avec le plan/prix associés. */
  findLatestForTenantWithPlanDetails(tenantId: string): Promise<SubscriptionWithPlanDetails | null>;
  create(data: CreateSubscriptionData): Promise<Subscription>;
  save(subscription: Subscription): Promise<void>;
  /** RG-02: abonnements actifs dont la période se termine, pour le cron de renouvellement. */
  listDueForRenewal(before: Date): Promise<Subscription[]>;
  /** RG-02: abonnements en grâce dont le délai est dépassé, pour le cron d'expiration. */
  listGraceElapsed(now: Date): Promise<Subscription[]>;
  /** Étape 31: candidats au renouvellement (ACTIVE échus, ou en grâce après échec) ; l'entité tranche (`canStartRenewal`). */
  listRenewalCandidates(now: Date): Promise<Subscription[]>;
  /** Étape 31: abonnements ACTIVE sans renouvellement automatique dont l'échéance est passée. */
  listNonRenewingEnded(now: Date): Promise<Subscription[]>;
  /**
   * Étape 31 (idempotence): enregistre la demande de renouvellement SEULEMENT si l'état persisté est encore celui
   * observé (`expected`) — mise à jour conditionnelle atomique. Retourne false si un autre passage a gagné la course.
   */
  claimRenewalRequest(subscription: Subscription, expected: RenewalClaimExpectation): Promise<boolean>;
}

export interface RenewalClaimExpectation {
  status: SubscriptionStatus;
  renewalForPeriodEnd: Date | null;
  lastRenewalStatus: string | null;
  lastRenewalAt: Date | null;
}

export const SUBSCRIPTION_REPOSITORY = Symbol("SUBSCRIPTION_REPOSITORY");
