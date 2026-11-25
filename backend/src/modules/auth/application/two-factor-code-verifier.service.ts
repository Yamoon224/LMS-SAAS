import { Inject, Injectable } from "@nestjs/common";
import { decryptSecret } from "@shared/crypto/secrets-cipher";
import * as argon2 from "argon2";

import { base32Decode } from "../domain/base32";
import { looksLikeRecoveryCode, normalizeRecoveryCode } from "../domain/recovery-codes";
import { verifyTotp } from "../domain/totp";
import { InvalidTwoFactorCodeError, TwoFactorLockedError } from "../domain/two-factor.errors";
import { LOCK_DURATION_MINUTES, MAX_FAILED_ATTEMPTS } from "../domain/two-factor.policy";
import { TWO_FACTOR_REPOSITORY } from "../domain/two-factor.repository.port";
import type { TwoFactorRepositoryPort, TwoFactorUserRecord } from "../domain/two-factor.repository.port";

export type CodeMethod = "TOTP" | "RECOVERY";

const GENERIC_MESSAGE = "Code de vérification incorrect ou expiré.";

/**
 * Vérification d'un second facteur : code TOTP (fenêtre ±1, anti-rejeu) ou code de récupération à usage unique.
 * Applique le verrouillage temporaire après MAX_FAILED_ATTEMPTS échecs consécutifs : tant qu'il dure, même un
 * code correct est refusé (sinon le verrou n'arrêterait pas la force brute).
 */
@Injectable()
export class TwoFactorCodeVerifier {
  constructor(@Inject(TWO_FACTOR_REPOSITORY) private readonly repository: TwoFactorRepositoryPort) {}

  /** TOTP ou récupération : pour la connexion et les opérations sensibles. */
  async verify(user: TwoFactorUserRecord, rawCode: string, now: Date = new Date()): Promise<CodeMethod> {
    this.assertNotLocked(user, now);
    const code = rawCode.trim();
    const compact = code.replace(/\s/g, "");

    let method: CodeMethod | null = null;
    if (/^\d{6}$/.test(compact)) {
      method = (await this.checkTotp(user, compact, now)) !== null ? "TOTP" : null;
    } else if (looksLikeRecoveryCode(code)) {
      method = (await this.checkRecoveryCode(user, code)) ? "RECOVERY" : null;
    }

    if (!method) await this.fail(user, now);
    await this.repository.resetFailures(user.id);
    return method as CodeMethod;
  }

  /** TOTP uniquement (confirmation d'enrôlement : un code de récupération n'a pas de sens avant l'activation). */
  async verifyTotpOnly(user: TwoFactorUserRecord, rawCode: string, now: Date = new Date()): Promise<number> {
    this.assertNotLocked(user, now);
    const compact = rawCode.replace(/\s/g, "");
    const step = /^\d{6}$/.test(compact) ? await this.checkTotp(user, compact, now) : null;
    if (step === null) await this.fail(user, now);
    return step as number;
  }

  private assertNotLocked(user: TwoFactorUserRecord, now: Date): void {
    if (user.lockedUntil && user.lockedUntil.getTime() > now.getTime()) {
      throw new TwoFactorLockedError("Trop de tentatives : vérification suspendue, réessayez dans quelques minutes.");
    }
  }

  private async checkTotp(user: TwoFactorUserRecord, code: string, now: Date): Promise<number | null> {
    if (!user.twoFactorSecretEncrypted) return null;
    const secret = base32Decode(decryptSecret(user.twoFactorSecretEncrypted));
    const result = verifyTotp({ secret, code, nowMs: now.getTime(), lastAcceptedStep: user.lastStep });
    if (!result.valid) return null;
    // Écriture conditionnelle : deux requêtes simultanées avec le même code ne passent pas toutes les deux.
    const accepted = await this.repository.acceptStep(user.id, result.step);
    return accepted ? result.step : null;
  }

  private async checkRecoveryCode(user: TwoFactorUserRecord, code: string): Promise<boolean> {
    const normalized = normalizeRecoveryCode(code);
    const unused = await this.repository.listUnusedRecoveryCodes(user.id);
    for (const candidate of unused) {
      if (await argon2.verify(candidate.codeHash, normalized)) {
        return this.repository.consumeRecoveryCode(candidate.id);
      }
    }
    return false;
  }

  private async fail(user: TwoFactorUserRecord, now: Date): Promise<never> {
    const lockUntil = new Date(now.getTime() + LOCK_DURATION_MINUTES * 60_000);
    const locked = await this.repository.registerFailure(user.id, MAX_FAILED_ATTEMPTS, lockUntil);
    if (locked) {
      throw new TwoFactorLockedError("Trop de tentatives : vérification suspendue, réessayez dans quelques minutes.");
    }
    throw new InvalidTwoFactorCodeError(GENERIC_MESSAGE);
  }
}
