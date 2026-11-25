import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, Public, SkipSubscriptionCheck } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import {
  EnrollmentTwoFactorUseCases,
  VerifyTwoFactorLoginUseCase,
} from "../application/two-factor-login.use-cases";
import {
  BeginTwoFactorSetupUseCase,
  DisableTwoFactorUseCase,
  EnableTwoFactorUseCase,
  GetTwoFactorStatusUseCase,
  RegenerateRecoveryCodesUseCase,
} from "../application/two-factor-settings.use-cases";

import {
  ChallengeDto,
  ConfirmTwoFactorDto,
  EnrollTwoFactorDto,
  PasswordAndCodeDto,
  VerifyTwoFactorDto,
} from "./dto/two-factor.dto";

/**
 * Double authentification TOTP (sections 4.1 et 11, ADM-36, ENT-11).
 *
 * - Routes PUBLIQUES `verify` et `enrollment/*` : c'est le jeton de défi (opaque, 5 min, usage unique), et non un
 *   Bearer, qui prouve l'identité. Un défi n'est pas un JWT : il n'ouvre aucune autre route.
 * - Autres routes : authentifiées (Bearer). Ce sont des opérations sur son PROPRE compte : l'identité vient du
 *   jeton, aucun identifiant n'est accepté en entrée, donc pas de permission de rôle à exiger.
 *   `@SkipSubscriptionCheck` : sécuriser son compte ne dépend pas de l'abonnement de l'entreprise.
 */
@ApiTags("Auth / 2FA")
@Controller("auth/2fa")
export class TwoFactorController {
  constructor(
    private readonly verifyLogin: VerifyTwoFactorLoginUseCase,
    private readonly enrollment: EnrollmentTwoFactorUseCases,
    private readonly beginSetup: BeginTwoFactorSetupUseCase,
    private readonly enable: EnableTwoFactorUseCase,
    private readonly disable: DisableTwoFactorUseCase,
    private readonly regenerate: RegenerateRecoveryCodesUseCase,
    private readonly getStatus: GetTwoFactorStatusUseCase,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("verify")
  @HttpCode(200)
  @ApiOperation({ summary: "Seconde étape de la connexion : code TOTP ou de récupération" })
  async verify(@Body() dto: VerifyTwoFactorDto) {
    return this.verifyLogin.execute({ challengeToken: dto.challengeToken, code: dto.code });
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("enrollment/setup")
  @HttpCode(200)
  @ApiOperation({ summary: "Enrôlement obligatoire : secret, URI otpauth et QR code" })
  async enrollmentSetup(@Body() dto: ChallengeDto) {
    return this.enrollment.setup(dto.challengeToken);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("enrollment/enable")
  @HttpCode(200)
  @ApiOperation({ summary: "Enrôlement obligatoire : confirme avec un code, rend les codes de récupération et la session" })
  async enrollmentEnable(@Body() dto: EnrollTwoFactorDto) {
    return this.enrollment.complete({ challengeToken: dto.challengeToken, code: dto.code });
  }

  @Get("status")
  @SkipSubscriptionCheck()
  @ApiOperation({ summary: "État de la 2FA de mon compte" })
  async status(@CurrentUser() user: AuthenticatedUser) {
    return this.getStatus.execute(user.userId);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("setup")
  @HttpCode(200)
  @SkipSubscriptionCheck()
  @ApiOperation({ summary: "Activation volontaire : secret, URI otpauth et QR code" })
  async setup(@CurrentUser() user: AuthenticatedUser) {
    return this.beginSetup.execute(user.userId);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("enable")
  @HttpCode(200)
  @SkipSubscriptionCheck()
  @ApiOperation({ summary: "Confirme l'activation avec un premier code ; rend les codes de récupération (une fois)" })
  async confirm(@CurrentUser() user: AuthenticatedUser, @Body() dto: ConfirmTwoFactorDto) {
    return this.enable.execute(user.userId, dto.code);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("disable")
  @HttpCode(200)
  @SkipSubscriptionCheck()
  @ApiOperation({ summary: "Désactive la 2FA (mot de passe + code) ; refusé si elle est obligatoire" })
  async disableTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() dto: PasswordAndCodeDto) {
    await this.disable.execute({ userId: user.userId, password: dto.password, code: dto.code });
    return { disabled: true };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("recovery-codes")
  @HttpCode(200)
  @SkipSubscriptionCheck()
  @ApiOperation({ summary: "Régénère les codes de récupération (mot de passe + code)" })
  async recoveryCodes(@CurrentUser() user: AuthenticatedUser, @Body() dto: PasswordAndCodeDto) {
    return this.regenerate.execute({ userId: user.userId, password: dto.password, code: dto.code });
  }
}
