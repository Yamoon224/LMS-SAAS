import { DomainError } from "@shared/errors/domain-error";

import type { PlanFeatures, PlanQuotas } from "./plan-quotas";

export class PlanArchivedError extends DomainError {
  readonly code = "PLAN_ARCHIVE";
}

export interface PlanPriceProps {
  id: string;
  period: string;
  currency: string;
  amount: number;
  trialDays: number;
  version: number;
  isActive: boolean;
}

export interface PlanProps {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  isArchived: boolean;
  quotas: PlanQuotas;
  features: PlanFeatures;
  commissionRatePercent: number | null;
  prices: PlanPriceProps[];
}

/**
 * Entité pure du domaine Plan : aucune dépendance à NestJS ou à l'ORM
 * (section 13.2). Porte les règles ADM-13 à ADM-19.
 */
export class Plan {
  private constructor(private props: PlanProps) {}

  static fromPersistence(props: PlanProps): Plan {
    return new Plan(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get isPublic(): boolean {
    return this.props.isPublic;
  }

  get prices(): readonly PlanPriceProps[] {
    return this.props.prices;
  }

  get quotas(): PlanQuotas {
    return this.props.quotas;
  }

  get features(): PlanFeatures {
    return this.props.features;
  }

  get isArchived(): boolean {
    return this.props.isArchived;
  }

  get commissionRatePercent(): number | null {
    return this.props.commissionRatePercent;
  }

  /** ADM-13: un plan archivé ne peut plus être souscrit (reste visible pour l'historique). */
  assertSubscribable(): void {
    if (this.props.isArchived) {
      throw new PlanArchivedError(`Le plan "${this.props.name}" est archivé et ne peut plus être souscrit.`);
    }
  }

  findActivePrice(period: string): PlanPriceProps | undefined {
    return this.props.prices.find((price) => price.period === period && price.isActive);
  }
}
