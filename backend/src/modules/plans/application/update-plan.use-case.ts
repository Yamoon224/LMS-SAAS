import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainError, NotFoundDomainError } from "@shared/errors";

import type { PlanFeatures, PlanQuotas } from "../domain/plan-quotas";
import { PLAN_REPOSITORY } from "../domain/plan.repository.port";
import type { PlanRepositoryPort, UpdatePlanData } from "../domain/plan.repository.port";
import { PlanUpdatedEvent } from "../plans.events";

export class InvalidPlanUpdateError extends DomainError {
  readonly code = "MODIFICATION_PLAN_INVALIDE";
}

export interface UpdatePlanInput {
  planId: string;
  actorId: string;
  name?: string;
  description?: string | null;
  quotas?: PlanQuotas;
  features?: PlanFeatures;
}

const QUOTA_KEYS = ["maxCourses", "maxActiveLearners", "maxManagers", "storageGb", "liveSessionsPerMonth"] as const;
const FEATURE_BOOLEANS = ["aiTranslation", "customCertificates", "customDomain"] as const;

/** Quotas : clés connues uniquement, entiers positifs ou nuls ; `null` = illimité (la clé est retirée). */
export function normalizeQuotas(input: PlanQuotas): PlanQuotas {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!(QUOTA_KEYS as readonly string[]).includes(key)) {
      throw new InvalidPlanUpdateError(`Quota inconnu: ${key}.`);
    }
    if (value === null || value === undefined) continue;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      throw new InvalidPlanUpdateError(`Le quota ${key} doit être un entier positif ou nul.`);
    }
    result[key] = value;
  }
  return result as PlanQuotas;
}

export function normalizeFeatures(input: PlanFeatures): PlanFeatures {
  const result: Record<string, boolean | number> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if ((FEATURE_BOOLEANS as readonly string[]).includes(key)) {
      if (typeof value !== "boolean") throw new InvalidPlanUpdateError(`La fonctionnalité ${key} doit être un booléen.`);
      result[key] = value;
    } else if (key === "aiTranslationCreditsIncluded") {
      if (value === null || value === undefined) continue;
      if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
        throw new InvalidPlanUpdateError("Les crédits inclus doivent être un entier positif ou nul.");
      }
      result[key] = value;
    } else {
      throw new InvalidPlanUpdateError(`Fonctionnalité inconnue: ${key}.`);
    }
  }
  return result as PlanFeatures;
}

/**
 * ADM-13/ADM-14 : modifier le nom, la description, les quotas et les fonctionnalités d'un plan existant. Le prix
 * n'est jamais modifié ici (versionné, ADM-17). Les quotas/fonctionnalités remplacent l'ensemble précédent ; les
 * abonnés actuels voient les nouvelles limites immédiatement (les quotas sont lus à la demande).
 */
@Injectable()
export class UpdatePlanUseCase {
  constructor(
    @Inject(PLAN_REPOSITORY) private readonly planRepository: PlanRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: UpdatePlanInput): Promise<void> {
    const plan = await this.planRepository.findById(input.planId);
    if (!plan) throw new NotFoundDomainError(`Plan introuvable: ${input.planId}`);

    const data: UpdatePlanData = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length < 2 || name.length > 100) throw new InvalidPlanUpdateError("Le nom doit compter de 2 à 100 caractères.");
      if (name !== plan.name) data.name = name;
    }
    if (input.description !== undefined) {
      const description = input.description?.trim() || null;
      if (description !== plan.description) data.description = description;
    }
    if (input.quotas !== undefined) data.quotas = normalizeQuotas(input.quotas);
    if (input.features !== undefined) data.features = normalizeFeatures(input.features);

    const changedFields = Object.keys(data);
    if (changedFields.length === 0) return;

    await this.planRepository.update(input.planId, data);
    this.eventEmitter.emit("plan.updated", new PlanUpdatedEvent(input.planId, input.actorId, changedFields));
  }
}
