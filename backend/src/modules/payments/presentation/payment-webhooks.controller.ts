import { Controller, Headers, HttpCode, Param, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "@shared/decorators";
import type { Request } from "express";


import { ProcessWebhookUseCase } from "../application/process-webhook.use-case";

/**
 * BE-05: point d'entrée des webhooks de paiement, un par fournisseur
 * (ex. /v1/payments/webhooks/paystack). Le corps brut (Buffer) est exigé
 * pour la vérification HMAC — voir shared/middleware/raw-body.middleware.ts
 * et son branchement dans main.ts, appliqué uniquement sur ce préfixe.
 */
@ApiTags("Webhooks paiement")
@Controller("payments/webhooks")
export class PaymentWebhooksController {
  constructor(private readonly processWebhookUseCase: ProcessWebhookUseCase) {}

  @Public()
  @Post(":providerCode")
  @HttpCode(200)
  @ApiOperation({ summary: "Réception d'un webhook de paiement (BE-05)" })
  async handle(
    @Param("providerCode") providerCode: string,
    @Req() request: Request & { rawBody?: Buffer },
    @Headers() headers: Record<string, string>,
  ) {
    const rawBody = request.rawBody?.toString("utf8") ?? JSON.stringify(request.body);

    await this.processWebhookUseCase.execute(providerCode.toUpperCase(), { headers, rawBody });

    return { received: true };
  }
}
