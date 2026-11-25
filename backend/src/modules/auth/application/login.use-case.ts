import { Inject, Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

import { AUTH_REPOSITORY } from "../domain/auth.repository.port";
import type { AuthRepositoryPort } from "../domain/auth.repository.port";
import { AccountNotActiveError, InvalidCredentialsError } from "../domain/invalid-credentials.error";
import { isTwoFactorMandatory } from "../domain/two-factor.policy";

import { TokenService } from "./token.service";
import type { TokenPair } from "./token.types";
import { TwoFactorChallengeService } from "./two-factor-challenge.service";
import type { IssuedChallenge } from "./two-factor-challenge.service";

/** Paire de jetons, ou défi 2FA (`twoFactor`: VERIFY = fournir un code, ENROLL = activer la 2FA obligatoire). */
export type LoginResult = TokenPair | IssuedChallenge;

export interface LoginInput {
  tenantId: string | null;
  email: string;
  password: string;
}

/**
 * Connexion (module Auth, section 4.1). Le message d'erreur ne distingue
 * jamais "e-mail inconnu" de "mot de passe incorrect" pour ne pas faciliter
 * l'énumération de comptes.
 */
@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepository: AuthRepositoryPort,
    private readonly tokenService: TokenService,
    private readonly challenges: TwoFactorChallengeService,
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const user = await this.authRepository.findByEmail(input.tenantId, input.email);
    if (!user || !user.passwordHash) {
      throw new InvalidCredentialsError("E-mail ou mot de passe incorrect.");
    }

    const passwordMatches = await argon2.verify(user.passwordHash, input.password);
    if (!passwordMatches) {
      throw new InvalidCredentialsError("E-mail ou mot de passe incorrect.");
    }

    if (user.status !== "ACTIVE") {
      throw new AccountNotActiveError("Ce compte n'est pas actif.");
    }

    // Seconde étape : aucun jeton de session tant que la 2FA n'est pas prouvée (ou, si elle est obligatoire et
    // pas encore activée, tant que le compte n'est pas enrôlé). Les comptes sans 2FA reçoivent la réponse d'avant.
    if (user.twoFactorEnabled) {
      return this.challenges.issue(user.id, "VERIFY");
    }
    if (isTwoFactorMandatory(user)) {
      return this.challenges.issue(user.id, "ENROLL");
    }

    return this.tokenService.issueForUser(user);
  }
}
