import { Inject, Injectable } from "@nestjs/common";
import { decryptSecret } from "@shared/crypto/secrets-cipher";

import type { PublicBranding } from "./domain/public-branding";
import { PayoutAccountNotVerifiedError } from "./domain/tenant-settings";
import type { Tenant } from "./domain/tenant.entity";
import { TENANT_REPOSITORY } from "./domain/tenant.repository.port";
import type { TenantRepositoryPort } from "./domain/tenant.repository.port";

export interface PublicTenantProfile {
  name: string;
  slug: string;
  branding: PublicBranding;
  /** ENT-12 : liste blanche — instructions de paiement hors plateforme (null si désactivé). */
  offlinePaymentEnabled: boolean;
  offlinePaymentInstructions: string | null;
}

/** Destination de reversement déchiffrée d'un compte VÉRIFIÉ (usage interne du module wallets, jamais exposée). */
export interface VerifiedPayoutDestination {
  type: "BANK" | "MOBILE_MONEY";
  accountNumber: string;
  accountName: string;
}

/**
 * Seule API publique du module tenants. Les autres modules (guards,
 * subscriptions, courses...) ne doivent dépendre que de cette façade,
 * jamais des fichiers internes de domain/application/infrastructure
 * (section 13.2, "communication entre modules").
 */
@Injectable()
export class TenantsFacade {
  constructor(@Inject(TENANT_REPOSITORY) private readonly tenantRepository: TenantRepositoryPort) {}

  async findById(id: string): Promise<Tenant | null> {
    return this.tenantRepository.findById(id);
  }

  /** ADM-10: liste de toutes les entreprises, tous statuts confondus. */
  async listAll(): Promise<Tenant[]> {
    return this.tenantRepository.listAll();
  }

  /** Carte d'identité publique d'une entreprise (page d'accueil apprenant) : jamais de champ interne. */
  async getPublicProfile(id: string): Promise<PublicTenantProfile | null> {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) return null;
    const offline = tenant.offlinePaymentEnabled && !!tenant.offlinePaymentInstructions;
    return {
      name: tenant.name,
      slug: tenant.slug,
      branding: tenant.publicBranding,
      offlinePaymentEnabled: offline,
      offlinePaymentInstructions: offline ? tenant.offlinePaymentInstructions : null,
    };
  }

  /**
   * RG-23 / ENT-11 : destination de reversement de l'entreprise, déchiffrée, UNIQUEMENT si le compte est vérifié.
   * @throws PayoutAccountNotVerifiedError (`COMPTE_REVERSEMENT_NON_VERIFIE`) si absent ou non vérifié.
   */
  async getVerifiedPayoutDestination(tenantId: string): Promise<VerifiedPayoutDestination> {
    const settings = await this.tenantRepository.findSettings(tenantId);
    const stored = (settings?.payoutAccount ?? null) as Record<string, unknown> | null;
    if (
      !settings?.payoutAccountVerified ||
      !stored ||
      (stored.type !== "BANK" && stored.type !== "MOBILE_MONEY") ||
      typeof stored.encryptedNumber !== "string" ||
      typeof stored.accountName !== "string"
    ) {
      throw new PayoutAccountNotVerifiedError(
        "Les coordonnées de reversement de l'entreprise ne sont pas renseignées ou n'ont pas été vérifiées.",
      );
    }
    return { type: stored.type, accountNumber: decryptSecret(stored.encryptedNumber), accountName: stored.accountName };
  }

  async findActiveBySlug(slug: string): Promise<Tenant | null> {
    const tenant = await this.tenantRepository.findBySlug(slug);
    return tenant && tenant.isOperational() ? tenant : null;
  }
}
