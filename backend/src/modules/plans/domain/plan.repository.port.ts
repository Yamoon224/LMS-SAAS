import type { PlanFeatures, PlanQuotas } from "./plan-quotas";
import type { Plan } from "./plan.entity";

export interface CreatePlanData {
  name: string;
  description?: string;
  isPublic: boolean;
  quotas: PlanQuotas;
  features: PlanFeatures;
  commissionRatePercent?: number;
}

/** ADM-13 : champs modifiables d'un plan existant (le prix reste versionné via `addPriceVersion`). */
export interface UpdatePlanData {
  name?: string;
  description?: string | null;
  quotas?: PlanQuotas;
  features?: PlanFeatures;
}

export interface CreatePlanPriceData {
  planId: string;
  period: string;
  currency: string;
  amount: number;
  trialDays: number;
}

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface PlanRepositoryPort {
  findById(id: string): Promise<Plan | null>;
  listPublic(): Promise<Plan[]>;
  listAll(): Promise<Plan[]>;
  create(data: CreatePlanData): Promise<Plan>;
  archive(id: string): Promise<void>;
  unarchive(id: string): Promise<void>;
  update(id: string, data: UpdatePlanData): Promise<void>;
  /**
   * ADM-17: une modification de prix crée une nouvelle version sans impacter
   * les abonnements existants, qui restent liés à l'ancienne PlanPrice.
   * Désactive l'ancien prix actif pour la période concernée puis en crée un nouveau.
   */
  addPriceVersion(data: CreatePlanPriceData): Promise<void>;
}

export const PLAN_REPOSITORY = Symbol("PLAN_REPOSITORY");
