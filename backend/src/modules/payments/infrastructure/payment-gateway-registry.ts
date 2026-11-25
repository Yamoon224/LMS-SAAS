import { Injectable, Logger } from "@nestjs/common";
import { decryptSecret } from "@shared/crypto/secrets-cipher";
import { NotFoundDomainError } from "@shared/errors";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { PaymentGatewayRegistryPort } from "../domain/payment-gateway-registry.port";
import type { PaymentGateway } from "../domain/payment-gateway.port";
import type { PaymentMethod } from "../domain/payment-method";

import { PaystackGateway } from "./gateways/paystack.gateway";
import { PixelInnovGateway } from "./gateways/pixel-innov.gateway";

/**
 * BE-04: "ajout d'un agrégateur sans modifier le métier" (principe
 * ouvert/fermé, section 13.1). Construit l'adaptateur correspondant à
 * chaque configuration active trouvée en base, avec ses identifiants
 * déchiffrés ; les use cases ne connaissent que PaymentGatewayRegistryPort.
 */
@Injectable()
export class PaymentGatewayRegistry implements PaymentGatewayRegistryPort {
  private readonly logger = new Logger(PaymentGatewayRegistry.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolveForMethod(method: PaymentMethod): Promise<PaymentGateway> {
    const configs = await this.prisma.paymentProvider.findMany({
      where: { isActive: true },
      orderBy: { priority: "asc" },
    });

    const eligible = configs.filter((config) => (config.supportedMethods as string[]).includes(method));

    for (const config of eligible) {
      try {
        return this.buildGateway(config.code, config.encryptedCredentials as Record<string, string>);
      } catch (error) {
        // Bascule vers le fournisseur suivant si celui-ci est mal configuré ou indisponible.
        this.logger.warn(`Fournisseur ${config.code} indisponible, bascule vers le suivant: ${error}`);
      }
    }

    throw new NotFoundDomainError(
      `Aucun fournisseur de paiement actif ne couvre le moyen de paiement: ${method}`,
    );
  }

  async findByCode(code: string): Promise<PaymentGateway | null> {
    const config = await this.prisma.paymentProvider.findUnique({ where: { code: code as never } });
    if (!config) return null;
    return this.buildGateway(config.code, config.encryptedCredentials as Record<string, string>);
  }

  private buildGateway(code: string, encryptedCredentials: Record<string, string>): PaymentGateway {
    switch (code) {
      case "PAYSTACK":
        return new PaystackGateway(
          decryptSecret(this.requireCredential(encryptedCredentials, "secretKey", code)),
        );
      case "PIXEL_INNOV":
        return new PixelInnovGateway(
          decryptSecret(this.requireCredential(encryptedCredentials, "apiKey", code)),
          decryptSecret(this.requireCredential(encryptedCredentials, "apiSecret", code)),
        );
      default:
        throw new NotFoundDomainError(`Aucun adaptateur implémenté pour le fournisseur: ${code}`);
    }
  }

  private requireCredential(
    credentials: Record<string, string>,
    key: string,
    providerCode: string,
  ): string {
    const value = credentials[key];
    if (!value) {
      throw new NotFoundDomainError(
        `Identifiant "${key}" manquant dans la configuration du fournisseur ${providerCode}.`,
      );
    }
    return value;
  }
}
