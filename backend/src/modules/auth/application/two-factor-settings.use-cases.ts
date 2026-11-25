import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { encryptSecret } from "@shared/crypto/secrets-cipher";
import { NotFoundDomainError } from "@shared/errors";
import * as argon2 from "argon2";

import { TwoFactorDisabledEvent, TwoFactorEnabledEvent, TwoFactorResetEvent } from "../auth.events";
import { AUTH_REPOSITORY } from "../domain/auth.repository.port";
import type { AuthRepositoryPort } from "../domain/auth.repository.port";
import { base32Encode } from "../domain/base32";
import { InvalidCredentialsError } from "../domain/invalid-credentials.error";
import { generateRecoveryCodes, normalizeRecoveryCode } from "../domain/recovery-codes";
import { buildOtpauthUri, generateTotpSecret } from "../domain/totp";
import {
  TwoFactorAlreadyEnabledError,
  TwoFactorMandatoryError,
  TwoFactorNotEnabledError,
  TwoFactorResetNotAllowedError,
  TwoFactorSetupMissingError,
} from "../domain/two-factor.errors";
import { isTwoFactorMandatory } from "../domain/two-factor.policy";
import { QR_CODE_GENERATOR, TWO_FACTOR_REPOSITORY } from "../domain/two-factor.repository.port";
import type {
  QrCodeGeneratorPort,
  TwoFactorRepositoryPort,
  TwoFactorUserRecord,
} from "../domain/two-factor.repository.port";

import { TwoFactorCodeVerifier } from "./two-factor-code-verifier.service";

const ISSUER = process.env.TOTP_ISSUER ?? "SaaS LMS";

export interface TwoFactorSetupResult {
  /** Secret Base32 en clair : à saisir à la main si le QR code ne peut pas être scanné. Jamais relu ensuite. */
  secret: string;
  otpauthUri: string;
  qrCodeDataUrl: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
  /** Obligatoire pour ce compte : la désactivation sera refusée. */
  required: boolean;
  recoveryCodesRemaining: number;
}

/** Charge un compte actif ou lève une erreur générique. */
async function loadActiveUser(repository: TwoFactorRepositoryPort, userId: string): Promise<TwoFactorUserRecord> {
  const user = await repository.findUser(userId);
  if (!user || user.status !== "ACTIVE") {
    throw new NotFoundDomainError("Compte introuvable.");
  }
  return user;
}

/** Les hashs argon2 sont recalculés pour chaque code : seul le hash est stocké, le clair n'est rendu qu'une fois. */
async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  // Séquentiel : argon2 réserve 64 Mo par calcul, huit calculs simultanés pèseraient inutilement sur le serveur.
  const hashes: string[] = [];
  for (const code of codes) hashes.push(await argon2.hash(normalizeRecoveryCode(code)));
  return hashes;
}

/** Prélude commun aux actions sensibles (désactivation, régénération) : mot de passe PUIS second facteur. */
async function assertPasswordAndCode(
  user: TwoFactorUserRecord,
  password: string,
  code: string,
  verifier: TwoFactorCodeVerifier,
): Promise<void> {
  if (!user.passwordHash || !(await argon2.verify(user.passwordHash, password))) {
    throw new InvalidCredentialsError("Mot de passe incorrect.");
  }
  await verifier.verify(user, code);
}

/** Étape 1 de l'activation : génère un secret en attente de confirmation. */
@Injectable()
export class BeginTwoFactorSetupUseCase {
  constructor(
    @Inject(TWO_FACTOR_REPOSITORY) private readonly repository: TwoFactorRepositoryPort,
    @Inject(QR_CODE_GENERATOR) private readonly qrCodeGenerator: QrCodeGeneratorPort,
  ) {}

  async execute(userId: string): Promise<TwoFactorSetupResult> {
    const user = await loadActiveUser(this.repository, userId);
    if (user.twoFactorEnabled) {
      throw new TwoFactorAlreadyEnabledError("La double authentification est déjà activée.");
    }
    const secretBytes = generateTotpSecret();
    await this.repository.savePendingSecret(userId, encryptSecret(base32Encode(secretBytes)));
    const otpauthUri = buildOtpauthUri({ issuer: ISSUER, account: user.email, secret: secretBytes });
    return {
      secret: base32Encode(secretBytes),
      otpauthUri,
      qrCodeDataUrl: await this.qrCodeGenerator.toDataUrl(otpauthUri),
    };
  }
}

/** Étape 2 : confirme avec un premier code valide, active la 2FA et rend les codes de récupération (une seule fois). */
@Injectable()
export class EnableTwoFactorUseCase {
  constructor(
    @Inject(TWO_FACTOR_REPOSITORY) private readonly repository: TwoFactorRepositoryPort,
    private readonly verifier: TwoFactorCodeVerifier,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(userId: string, code: string): Promise<{ recoveryCodes: string[] }> {
    const user = await loadActiveUser(this.repository, userId);
    if (user.twoFactorEnabled) {
      throw new TwoFactorAlreadyEnabledError("La double authentification est déjà activée.");
    }
    if (!user.twoFactorSecretEncrypted) {
      throw new TwoFactorSetupMissingError("Lancez d'abord la configuration de la double authentification.");
    }

    const step = await this.verifier.verifyTotpOnly(user, code);
    await this.repository.enable(userId, step);

    const recoveryCodes = generateRecoveryCodes();
    await this.repository.replaceRecoveryCodes(userId, await hashRecoveryCodes(recoveryCodes));
    this.eventEmitter.emit("auth.two-factor-enabled", new TwoFactorEnabledEvent(userId, user.tenantId));
    return { recoveryCodes };
  }
}

/** Désactivation volontaire : mot de passe + code, refusée si la 2FA est obligatoire pour ce compte. */
@Injectable()
export class DisableTwoFactorUseCase {
  constructor(
    @Inject(TWO_FACTOR_REPOSITORY) private readonly repository: TwoFactorRepositoryPort,
    private readonly verifier: TwoFactorCodeVerifier,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: { userId: string; password: string; code: string }): Promise<void> {
    const user = await loadActiveUser(this.repository, input.userId);
    if (isTwoFactorMandatory(user)) {
      throw new TwoFactorMandatoryError("La double authentification est obligatoire pour ce compte.");
    }
    if (!user.twoFactorEnabled) {
      throw new TwoFactorNotEnabledError("La double authentification n'est pas activée.");
    }
    await assertPasswordAndCode(user, input.password, input.code, this.verifier);
    await this.repository.disable(input.userId);
    this.eventEmitter.emit("auth.two-factor-disabled", new TwoFactorDisabledEvent(input.userId, user.tenantId));
  }
}

/** Régénère les codes de récupération (les anciens deviennent inutilisables) : mot de passe + code requis. */
@Injectable()
export class RegenerateRecoveryCodesUseCase {
  constructor(
    @Inject(TWO_FACTOR_REPOSITORY) private readonly repository: TwoFactorRepositoryPort,
    private readonly verifier: TwoFactorCodeVerifier,
  ) {}

  async execute(input: { userId: string; password: string; code: string }): Promise<{ recoveryCodes: string[] }> {
    const user = await loadActiveUser(this.repository, input.userId);
    if (!user.twoFactorEnabled) {
      throw new TwoFactorNotEnabledError("La double authentification n'est pas activée.");
    }
    await assertPasswordAndCode(user, input.password, input.code, this.verifier);
    const recoveryCodes = generateRecoveryCodes();
    await this.repository.replaceRecoveryCodes(input.userId, await hashRecoveryCodes(recoveryCodes));
    return { recoveryCodes };
  }
}

@Injectable()
export class GetTwoFactorStatusUseCase {
  constructor(@Inject(TWO_FACTOR_REPOSITORY) private readonly repository: TwoFactorRepositoryPort) {}

  async execute(userId: string): Promise<TwoFactorStatus> {
    const user = await loadActiveUser(this.repository, userId);
    const remaining = user.twoFactorEnabled ? (await this.repository.listUnusedRecoveryCodes(userId)).length : 0;
    return { enabled: user.twoFactorEnabled, required: isTwoFactorMandatory(user), recoveryCodesRemaining: remaining };
  }
}

/**
 * ADM-36 : un administrateur réinitialise la 2FA d'un AUTRE administrateur (appareil perdu). Refusé sur soi-même
 * (une session volée ne doit pas pouvoir effacer son propre second facteur) et sur un compte non plateforme.
 * La cible perd ses sessions et devra s'enrôler de nouveau à la prochaine connexion (obligatoire).
 * ADM-06 : avec `scopeTenantId`, la cible doit être un compte interne (COMPANY_USER) de CE tenant — l'Admin
 * réinitialise alors la 2FA d'un propriétaire/gestionnaire d'entreprise (jamais hors de son périmètre).
 */
@Injectable()
export class ResetTwoFactorUseCase {
  constructor(
    @Inject(TWO_FACTOR_REPOSITORY) private readonly repository: TwoFactorRepositoryPort,
    @Inject(AUTH_REPOSITORY) private readonly authRepository: AuthRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: { targetUserId: string; actorUserId: string; scopeTenantId?: string }): Promise<void> {
    if (input.targetUserId === input.actorUserId) {
      throw new TwoFactorResetNotAllowedError("Vous ne pouvez pas réinitialiser votre propre double authentification.");
    }
    const target = await this.repository.findUser(input.targetUserId);
    const inScope =
      input.scopeTenantId === undefined
        ? target?.type === "PLATFORM_ADMIN"
        : target?.type === "COMPANY_USER" && target.tenantId === input.scopeTenantId;
    if (!target || !inScope) {
      throw new NotFoundDomainError("Compte introuvable.");
    }
    await this.repository.resetAll(target.id);
    await this.authRepository.revokeAllRefreshTokens(target.id);
    this.eventEmitter.emit(
      "auth.two-factor-reset",
      new TwoFactorResetEvent(target.id, target.tenantId, input.actorUserId),
    );
  }
}
