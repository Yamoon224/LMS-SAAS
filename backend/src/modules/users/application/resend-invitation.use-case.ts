import { randomBytes, createHash } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { INVITATION_TOKEN_REPOSITORY } from "../domain/invitation-token.repository.port";
import type { InvitationTokenRepositoryPort } from "../domain/invitation-token.repository.port";
import { USER_REPOSITORY } from "../domain/user.repository.port";
import type { UserRepositoryPort } from "../domain/user.repository.port";
import { UserInvitedEvent } from "../users.events";

const ACTIVATION_TOKEN_TTL_HOURS = 72;

/**
 * ADM-06: renvoi des accès ou réinitialisation de mot de passe. Révoque les
 * liens précédemment émis pour cet utilisateur avant d'en émettre un nouveau,
 * pour qu'un seul lien reste valide à la fois.
 */
@Injectable()
export class ResendInvitationUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort,
    @Inject(INVITATION_TOKEN_REPOSITORY)
    private readonly invitationTokenRepository: InvitationTokenRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** `scopeTenantId`: tenant de l'appelant (routes entreprise); omis uniquement par les routes opérateur plateforme. */
  async execute(userId: string, scopeTenantId?: string): Promise<string> {
    const user = await this.userRepository.findById(userId);
    if (!user || (scopeTenantId !== undefined && user.tenantId !== scopeTenantId)) {
      throw new NotFoundDomainError(`Utilisateur introuvable: ${userId}`);
    }

    await this.invitationTokenRepository.revokeAllForUser(userId);

    const activationToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(activationToken).digest("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ACTIVATION_TOKEN_TTL_HOURS);

    await this.invitationTokenRepository.create(userId, tokenHash, expiresAt);

    this.eventEmitter.emit(
      "user.invited",
      new UserInvitedEvent(user.id, user.email, activationToken),
    );

    return activationToken;
  }
}
