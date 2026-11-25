import { createHash, randomBytes } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import { InvalidChallengeError } from "../domain/two-factor.errors";
import { CHALLENGE_TTL_SECONDS } from "../domain/two-factor.policy";
import type { ChallengePurpose } from "../domain/two-factor.policy";
import { TWO_FACTOR_REPOSITORY } from "../domain/two-factor.repository.port";
import type { ChallengeRecord, TwoFactorRepositoryPort } from "../domain/two-factor.repository.port";

export interface IssuedChallenge {
  twoFactor: ChallengePurpose;
  challengeToken: string;
  expiresInSeconds: number;
}

/**
 * Jetons de défi 2FA : opaques (32 octets aléatoires, jamais un JWT, donc inutilisables comme Bearer sur une
 * route normale), porteurs de la seule identité et de leur finalité, valables 5 minutes, à usage unique.
 * Seul leur hash SHA-256 est stocké.
 */
@Injectable()
export class TwoFactorChallengeService {
  constructor(@Inject(TWO_FACTOR_REPOSITORY) private readonly repository: TwoFactorRepositoryPort) {}

  async issue(userId: string, purpose: ChallengePurpose, now: Date = new Date()): Promise<IssuedChallenge> {
    const challengeToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_SECONDS * 1000);
    await this.repository.createChallenge(userId, purpose, this.hash(challengeToken), expiresAt);
    return { twoFactor: purpose, challengeToken, expiresInSeconds: CHALLENGE_TTL_SECONDS };
  }

  /** Retrouve un défi valide de la finalité attendue, sans le consommer. */
  async resolve(
    challengeToken: string,
    purpose: ChallengePurpose,
    now: Date = new Date(),
  ): Promise<ChallengeRecord> {
    const challenge = await this.repository.findActiveChallenge(this.hash(challengeToken), now);
    if (!challenge || challenge.purpose !== purpose) {
      throw new InvalidChallengeError("Session de vérification invalide ou expirée : reconnectez-vous.");
    }
    return challenge;
  }

  /** Usage unique : le second appelant concurrent est refusé. */
  async consume(challenge: ChallengeRecord): Promise<void> {
    const consumed = await this.repository.consumeChallenge(challenge.id);
    if (!consumed) {
      throw new InvalidChallengeError("Session de vérification invalide ou expirée : reconnectez-vous.");
    }
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }
}
