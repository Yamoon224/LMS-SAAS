import { InvalidStateTransitionError } from "@shared/errors";

import { extractPublicBranding } from "./public-branding";
import type { PublicBranding } from "./public-branding";
import { canTransitionTenantStatus, TenantStatus } from "./tenant-status";

export interface TenantProps {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  statusReason: string | null;
  country: string;
  currency: string;
  defaultLocale: string;
  /** JSON libre `Tenant.branding` (forme non contractuelle) ; ne jamais l'exposer tel quel, voir `extractPublicBranding`. */
  branding?: unknown;
  /** ENT-12 : paiement hors plateforme (instructions affichées à l'apprenant). */
  offlinePaymentEnabled?: boolean;
  offlinePaymentInstructions?: string | null;
  createdAt: Date;
}

/**
 * Entité pure du domaine Tenant : aucune dépendance à NestJS ou à l'ORM
 * (section 13.2). Porte les règles de cycle de vie (RG, section 8.1).
 */
export class Tenant {
  private constructor(private props: TenantProps) {}

  static fromPersistence(props: TenantProps): Tenant {
    return new Tenant(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get status(): TenantStatus {
    return this.props.status;
  }

  get statusReason(): string | null {
    return this.props.statusReason;
  }

  get country(): string {
    return this.props.country;
  }

  get currency(): string {
    return this.props.currency;
  }

  get defaultLocale(): string {
    return this.props.defaultLocale;
  }

  get publicBranding(): PublicBranding {
    return extractPublicBranding(this.props.branding);
  }

  get offlinePaymentEnabled(): boolean {
    return this.props.offlinePaymentEnabled ?? false;
  }

  get offlinePaymentInstructions(): string | null {
    return this.props.offlinePaymentInstructions ?? null;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** Une entreprise n'est "opérationnelle" que si elle est active (RG-01). */
  isOperational(): boolean {
    return this.props.status === TenantStatus.ACTIVE;
  }

  suspend(reason: string): { status: TenantStatus; statusReason: string } {
    if (!canTransitionTenantStatus(this.props.status, TenantStatus.SUSPENDED)) {
      throw new InvalidStateTransitionError(
        `Impossible de suspendre une entreprise au statut ${this.props.status}.`,
      );
    }
    this.props.status = TenantStatus.SUSPENDED;
    this.props.statusReason = reason;
    return { status: TenantStatus.SUSPENDED, statusReason: reason };
  }

  reactivate(): { status: TenantStatus } {
    if (!canTransitionTenantStatus(this.props.status, TenantStatus.ACTIVE)) {
      throw new InvalidStateTransitionError(
        `Impossible de réactiver une entreprise au statut ${this.props.status}.`,
      );
    }
    this.props.status = TenantStatus.ACTIVE;
    return { status: TenantStatus.ACTIVE };
  }

  archive(): { status: TenantStatus } {
    if (!canTransitionTenantStatus(this.props.status, TenantStatus.ARCHIVED)) {
      throw new InvalidStateTransitionError(
        `Impossible d'archiver une entreprise au statut ${this.props.status}.`,
      );
    }
    this.props.status = TenantStatus.ARCHIVED;
    return { status: TenantStatus.ARCHIVED };
  }
}
