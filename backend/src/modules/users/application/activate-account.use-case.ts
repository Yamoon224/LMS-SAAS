import { createHash } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import { DomainError, NotFoundDomainError } from "@shared/errors";
import * as argon2 from "argon2";

import { INVITATION_TOKEN_REPOSITORY } from "../domain/invitation-token.repository.port";
import type { InvitationTokenRepositoryPort } from "../domain/invitation-token.repository.port";
import { USER_REPOSITORY } from "../domain/user.repository.port";
import type { UserRepositoryPort } from "../domain/user.repository.port";

export class InvalidOrExpiredTokenError extends DomainError {
  readonly code = "LIEN_INVALIDE_OU_EXPIRE";
}

export interface ActivateAccountInput {
  token: string;
  password: string;
}

/**
 * ADM-05 / ADM-06: l'utilisateur définit son mot de passe via le lien reçu
 * par e-mail. Le lien est à usage unique (consommé) et à durée limitée.
 */
@Injectable()
export class ActivateAccountUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort,
    @Inject(INVITATION_TOKEN_REPOSITORY)
    private readonly invitationTokenRepository: InvitationTokenRepositoryPort,
  ) {}

  async execute(input: ActivateAccountInput): Promise<void> {
    const tokenHash = createHash("sha256").update(input.token).digest("hex");

    const record = await this.invitationTokenRepository.findValidByHash(tokenHash);
    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new InvalidOrExpiredTokenError("Ce lien d'activation est invalide ou a expiré.");
    }

    const user = await this.userRepository.findById(record.userId);
    if (!user) {
      throw new NotFoundDomainError(`Utilisateur introuvable: ${record.userId}`);
    }

    const passwordHash = await argon2.hash(input.password);
    await this.userRepository.setPasswordHash(user.id, passwordHash);

    user.activate();
    await this.userRepository.updateStatus(user.id, user.status);

    await this.invitationTokenRepository.consume(tokenHash);
  }
}
