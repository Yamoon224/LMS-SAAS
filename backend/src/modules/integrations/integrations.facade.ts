import { Injectable } from "@nestjs/common";

import { ResolveIntegrationUseCase } from "./application/integrations.use-cases";

export type IntegrationName = "AI_TRANSLATION" | "EMAIL_SMTP" | "SMS_GATEWAY" | "GOOGLE_CALENDAR";

/**
 * Seule API publique du module integrations. Les modules qui parlent à un fournisseur externe (e-mail, SMS,
 * traduction IA, Google) y demandent leur configuration effective À CHAQUE UTILISATION, pour qu'une modification
 * saisie dans l'Admin soit prise en compte sans redémarrage.
 */
@Injectable()
export class IntegrationsFacade {
  constructor(private readonly resolveIntegrationUseCase: ResolveIntegrationUseCase) {}

  /** Valeurs effectives (Admin > environnement > défaut), secrets déchiffrés. À ne jamais journaliser. */
  async resolve(provider: IntegrationName): Promise<Record<string, string>> {
    return this.resolveIntegrationUseCase.execute(provider);
  }
}
