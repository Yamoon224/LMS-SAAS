import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { LoginUseCase } from "./application/login.use-case";
import { RevokeSessionsOnPasswordChangeListener } from "./application/revoke-sessions-on-password-change.listener";
import { TokenService } from "./application/token.service";
import { TwoFactorChallengeService } from "./application/two-factor-challenge.service";
import { TwoFactorCodeVerifier } from "./application/two-factor-code-verifier.service";
import { EnrollmentTwoFactorUseCases, VerifyTwoFactorLoginUseCase } from "./application/two-factor-login.use-cases";
import {
  BeginTwoFactorSetupUseCase,
  DisableTwoFactorUseCase,
  EnableTwoFactorUseCase,
  GetTwoFactorStatusUseCase,
  RegenerateRecoveryCodesUseCase,
  ResetTwoFactorUseCase,
} from "./application/two-factor-settings.use-cases";
import { AUTH_REPOSITORY } from "./domain/auth.repository.port";
import { QR_CODE_GENERATOR, TWO_FACTOR_REPOSITORY } from "./domain/two-factor.repository.port";
import { AuthPrismaRepository } from "./infrastructure/auth.prisma-repository";
import { JwtStrategy } from "./infrastructure/jwt.strategy";
import { QrCodeGenerator } from "./infrastructure/qr-code.generator";
import { TwoFactorPrismaRepository } from "./infrastructure/two-factor.prisma-repository";
import { AdminTenantTwoFactorController, AdminTwoFactorController } from "./presentation/admin-two-factor.controller";
import { AuthController } from "./presentation/auth.controller";
import { TwoFactorController } from "./presentation/two-factor.controller";

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController, TwoFactorController, AdminTwoFactorController, AdminTenantTwoFactorController],
  providers: [
    LoginUseCase,
    TokenService,
    JwtStrategy,
    TwoFactorChallengeService,
    TwoFactorCodeVerifier,
    VerifyTwoFactorLoginUseCase,
    EnrollmentTwoFactorUseCases,
    BeginTwoFactorSetupUseCase,
    EnableTwoFactorUseCase,
    DisableTwoFactorUseCase,
    RegenerateRecoveryCodesUseCase,
    GetTwoFactorStatusUseCase,
    ResetTwoFactorUseCase,
    RevokeSessionsOnPasswordChangeListener,
    { provide: AUTH_REPOSITORY, useClass: AuthPrismaRepository },
    { provide: TWO_FACTOR_REPOSITORY, useClass: TwoFactorPrismaRepository },
    { provide: QR_CODE_GENERATOR, useClass: QrCodeGenerator },
  ],
})
export class AuthModule {}
