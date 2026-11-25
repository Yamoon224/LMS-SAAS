import { createHash, randomBytes } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import * as argon2 from "argon2";

import { Email } from "../domain/email.vo";
import { INVITATION_TOKEN_REPOSITORY } from "../domain/invitation-token.repository.port";
import type { InvitationTokenRepositoryPort } from "../domain/invitation-token.repository.port";
import { UserStatus } from "../domain/user-status";
import { USER_REPOSITORY } from "../domain/user.repository.port";
import type { UserRepositoryPort } from "../domain/user.repository.port";
import { PasswordChangedEvent, PasswordResetRequestedEvent } from "../users.events";

import { InvalidOrExpiredTokenError } from "./activate-account.use-case";

/** Un lien de réinitialisation vit moins longtemps qu'un lien d'activation (72 h) : il donne accès à un compte actif. */
export const PASSWORD_RESET_TOKEN_TTL_MINUTES = 60;

const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

/**
 * PUB-04 : « mot de passe oublié ». Réponse volontairement muette : que l'e-mail existe ou non, que le compte soit
 * actif ou non, l'appelant n'apprend rien (pas d'énumération de comptes). Seul un compte ACTIF reçoit un lien ;
 * un compte invité doit d'abord activer son compte, un compte suspendu ou désactivé ne peut pas se réactiver seul.
 */
@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort,
    @Inject(INVITATION_TOKEN_REPOSITORY) private readonly tokenRepository: InvitationTokenRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** `tenantId` null = surface plateforme (comptes admin). */
  async execute(input: { tenantId: string | null; email: string }): Promise<void> {
    let email: string;
    try {
      email = Email.create(input.email).toString();
    } catch {
      return;
    }

    const user = await this.userRepository.findByEmailInTenant(input.tenantId, email);
    if (!user || user.status !== UserStatus.ACTIVE) return;

    // Un seul lien valide à la fois : demander à nouveau invalide le précédent.
    await this.tokenRepository.revokeAllForUser(user.id);

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60_000);
    await this.tokenRepository.create(user.id, hashToken(token), expiresAt);

    this.eventEmitter.emit("user.password-reset-requested", new PasswordResetRequestedEvent(user.id, token));
  }
}

/** Définit le nouveau mot de passe via le lien reçu ; le lien est à usage unique et toutes les sessions sont fermées. */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort,
    @Inject(INVITATION_TOKEN_REPOSITORY) private readonly tokenRepository: InvitationTokenRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: { token: string; password: string }): Promise<void> {
    const tokenHash = hashToken(input.token);
    const record = await this.tokenRepository.findValidByHash(tokenHash);
    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new InvalidOrExpiredTokenError("Ce lien de réinitialisation est invalide ou a expiré.");
    }

    const user = await this.userRepository.findById(record.userId);
    // Un compte suspendu ou désactivé depuis la demande ne doit pas pouvoir changer son mot de passe.
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new InvalidOrExpiredTokenError("Ce lien de réinitialisation est invalide ou a expiré.");
    }

    await this.userRepository.setPasswordHash(user.id, await argon2.hash(input.password));
    await this.tokenRepository.consume(tokenHash);
    await this.tokenRepository.revokeAllForUser(user.id);

    this.eventEmitter.emit("user.password-changed", new PasswordChangedEvent(user.id));
  }
}
