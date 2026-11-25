import { Body, Controller, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "@shared/decorators";
import type { Request } from "express";

import { RequestPasswordResetUseCase, ResetPasswordUseCase } from "../application/password-reset.use-cases";

import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

/** PUB-04 : mot de passe oublié — routes publiques, utilisées depuis chaque surface (admin, back-office, apprenant). */
@ApiTags("Auth")
@Controller("auth")
export class PasswordResetController {
  constructor(
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  /** Plafond strict (chaque appel peut envoyer un e-mail) ; réponse identique quel que soit l'e-mail. */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("forgot-password")
  @ApiOperation({ summary: "Demander un lien de réinitialisation du mot de passe (réponse toujours identique)" })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    await this.requestPasswordResetUseCase.execute({ tenantId: req.tenantId ?? null, email: dto.email });
    return { accepted: true };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("reset-password")
  @ApiOperation({ summary: "Définir un nouveau mot de passe via le lien reçu par e-mail" })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.resetPasswordUseCase.execute({ token: dto.token, password: dto.password });
    return { reset: true };
  }
}
