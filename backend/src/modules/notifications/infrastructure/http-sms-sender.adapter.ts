import { IntegrationsFacade } from "@modules/integrations/integrations.facade";
import { Injectable, Logger } from "@nestjs/common";

import type { SendSmsRequest, SmsSenderPort } from "../domain/sms-sender.port";

/**
 * Adaptateur HTTP vers une passerelle SMS générique (section 12.7). URL de
 * base et clé API injectées via variables d'environnement
 * (SMS_API_URL/SMS_API_KEY) — même approche que les passerelles de paiement
 * et le fournisseur de traduction (fetch natif, pas de SDK propriétaire).
 */
@Injectable()
export class HttpSmsSenderAdapter implements SmsSenderPort {
  private readonly logger = new Logger(HttpSmsSenderAdapter.name);

  constructor(private readonly integrations: IntegrationsFacade) {}

  async send(request: SendSmsRequest): Promise<void> {
    const { apiUrl, apiKey, senderId } = await this.integrations.resolve("SMS_GATEWAY");
    if (!apiUrl) {
      this.logger.warn(`Passerelle SMS non configurée — SMS non envoyé à ${request.to}.`);
      return;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: request.to, from: senderId, message: request.body }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`La passerelle SMS a répondu avec le statut ${response.status}: ${body}`);
    }
  }
}
