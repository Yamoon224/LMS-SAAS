import { IntegrationsFacade } from "@modules/integrations/integrations.facade";
import { Injectable, Logger } from "@nestjs/common";

import type { TranslationProviderPort, TranslationRequest } from "../domain/translation-provider.port";

interface DeepLResponse {
  translations: { text: string }[];
}

/**
 * Adaptateur HTTP vers un fournisseur de traduction automatique compatible
 * DeepL (section 12.5). URL de base et clé API injectées via variables
 * d'environnement (TRANSLATION_API_URL / TRANSLATION_API_KEY) plutôt qu'un
 * SDK dédié — même approche que les passerelles de paiement (fetch natif,
 * testable sans appel réseau réel).
 */
@Injectable()
export class HttpTranslationProviderAdapter implements TranslationProviderPort {
  private readonly logger = new Logger(HttpTranslationProviderAdapter.name);
  constructor(private readonly integrations: IntegrationsFacade) {}

  async translate(request: TranslationRequest): Promise<string> {
    const config = await this.integrations.resolve("AI_TRANSLATION");
    const apiUrl = config.apiUrl ?? "";
    const apiKey = config.apiKey ?? "";
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [request.content],
        source_lang: request.sourceLocale.toUpperCase(),
        target_lang: request.targetLocale.toUpperCase(),
        tag_handling: "html",
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Échec de l'appel au fournisseur de traduction (${response.status}): ${body}`);
      throw new Error(`Le fournisseur de traduction a répondu avec le statut ${response.status}.`);
    }

    const data = (await response.json()) as DeepLResponse;
    const translated = data.translations[0]?.text;
    if (translated === undefined) {
      throw new Error("Réponse du fournisseur de traduction vide ou invalide.");
    }

    return translated;
  }
}
