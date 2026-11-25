import { Body, Controller, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentTenant, Public } from "@shared/decorators";
import { TenantNotResolvedError } from "@shared/errors";
import type { Request } from "express";

import { RegisterLearnerUseCase } from "../application/register-learner.use-case";

import { InviteLearnerDto } from "./dto/invite-learner.dto";

/** Auto-inscription apprenant (surface « learning » d'un tenant uniquement). */
@ApiTags("Plateforme publique / Compte apprenant")
@Controller("public/auth")
export class PublicAuthController {
  constructor(private readonly registerLearnerUseCase: RegisterLearnerUseCase) {}

  /**
   * Réponse identique que l'e-mail existe déjà ou non (anti-énumération). Plafond strict :
   * 5 inscriptions/minute/IP (chaque appel peut déclencher l'envoi d'un e-mail).
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("register")
  @ApiOperation({ summary: "Créer un compte apprenant (e-mail vérifié via le lien d'activation)" })
  async register(
    @CurrentTenant() tenantId: string | undefined,
    @Req() req: Request,
    @Body() dto: InviteLearnerDto,
  ) {
    if (!tenantId || req.requestSurface !== "learning") {
      throw new TenantNotResolvedError(
        "L'inscription apprenant nécessite le sous-domaine d'apprentissage d'une entreprise.",
      );
    }
    await this.registerLearnerUseCase.execute({
      tenantId,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      locale: dto.locale ?? "fr",
    });
    return { registered: true };
  }
}
