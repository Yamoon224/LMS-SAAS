import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { TwoFactorRecoveryCodeUsedEvent } from "../auth.events";
import { AccountNotActiveError } from "../domain/invalid-credentials.error";
import { InvalidChallengeError } from "../domain/two-factor.errors";
import { TWO_FACTOR_REPOSITORY } from "../domain/two-factor.repository.port";
import type { TwoFactorRepositoryPort, TwoFactorUserRecord } from "../domain/two-factor.repository.port";

import { TokenService } from "./token.service";
import type { TokenPair } from "./token.types";
import { TwoFactorChallengeService } from "./two-factor-challenge.service";
import { TwoFactorCodeVerifier } from "./two-factor-code-verifier.service";
import { BeginTwoFactorSetupUseCase, EnableTwoFactorUseCase } from "./two-factor-settings.use-cases";
import type { TwoFactorSetupResult } from "./two-factor-settings.use-cases";

async function loadChallengeUser(repository: TwoFactorRepositoryPort, userId: string): Promise<TwoFactorUserRecord> {
  const user = await repository.findUser(userId);
  if (!user) throw new InvalidChallengeError("Session de vérification invalide ou expirée : reconnectez-vous.");
  if (user.status !== "ACTIVE") throw new AccountNotActiveError("Ce compte n'est pas actif.");
  return user;
}

/**
 * Seconde étape de la connexion : défi VERIFY + code TOTP ou de récupération. Le défi est consommé (usage unique)
 * seulement après un code correct ; les droits sont relus en base (ils ont pu changer depuis le mot de passe).
 */
@Injectable()
export class VerifyTwoFactorLoginUseCase {
  constructor(
    @Inject(TWO_FACTOR_REPOSITORY) private readonly repository: TwoFactorRepositoryPort,
    private readonly challenges: TwoFactorChallengeService,
    private readonly verifier: TwoFactorCodeVerifier,
    private readonly tokenService: TokenService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: { challengeToken: string; code: string }): Promise<TokenPair> {
    const challenge = await this.challenges.resolve(input.challengeToken, "VERIFY");
    const user = await loadChallengeUser(this.repository, challenge.userId);
    if (!user.twoFactorEnabled) {
      throw new InvalidChallengeError("Session de vérification invalide ou expirée : reconnectez-vous.");
    }

    const method = await this.verifier.verify(user, input.code);
    await this.challenges.consume(challenge);
    if (method === "RECOVERY") {
      this.eventEmitter.emit("auth.two-factor-recovery-used", new TwoFactorRecoveryCodeUsedEvent(user.id, user.tenantId));
    }
    return this.tokenService.issueForUser(user);
  }
}

/**
 * Enrôlement obligatoire à la connexion : le défi ENROLL n'ouvre QUE ces deux opérations (secret, puis
 * confirmation). Il n'est pas un jeton d'accès : aucune autre route ne l'accepte.
 */
@Injectable()
export class EnrollmentTwoFactorUseCases {
  constructor(
    @Inject(TWO_FACTOR_REPOSITORY) private readonly repository: TwoFactorRepositoryPort,
    private readonly challenges: TwoFactorChallengeService,
    private readonly beginSetup: BeginTwoFactorSetupUseCase,
    private readonly enable: EnableTwoFactorUseCase,
    private readonly tokenService: TokenService,
  ) {}

  async setup(challengeToken: string): Promise<TwoFactorSetupResult> {
    const challenge = await this.challenges.resolve(challengeToken, "ENROLL");
    return this.beginSetup.execute(challenge.userId);
  }

  /** Active la 2FA, consomme le défi et ouvre la session (la confirmation par code vaut vérification complète). */
  async complete(input: { challengeToken: string; code: string }): Promise<TokenPair & { recoveryCodes: string[] }> {
    const challenge = await this.challenges.resolve(input.challengeToken, "ENROLL");
    const user = await loadChallengeUser(this.repository, challenge.userId);
    const { recoveryCodes } = await this.enable.execute(user.id, input.code);
    await this.challenges.consume(challenge);
    const tokens = await this.tokenService.issueForUser(user);
    return { ...tokens, recoveryCodes };
  }
}
