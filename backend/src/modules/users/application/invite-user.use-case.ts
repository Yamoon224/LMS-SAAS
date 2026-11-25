import { randomBytes, createHash } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { UserType } from "@shared/domain/user-type";
import { DomainError } from "@shared/errors/domain-error";

import { Email } from "../domain/email.vo";
import { INVITATION_TOKEN_REPOSITORY } from "../domain/invitation-token.repository.port";
import type { InvitationTokenRepositoryPort } from "../domain/invitation-token.repository.port";
import type { User } from "../domain/user.entity";
import { USER_REPOSITORY } from "../domain/user.repository.port";
import type { UserRepositoryPort } from "../domain/user.repository.port";
import { UserInvitedEvent } from "../users.events";

export class EmailAlreadyUsedError extends DomainError {
  readonly code = "EMAIL_DEJA_UTILISE";
}

/** Durée de validité du lien d'activation (ADM-05: "lien d'activation à durée limitée"). */
const ACTIVATION_TOKEN_TTL_HOURS = 72;

export interface InviteUserInput {
  tenantId: string | null;
  type: UserType;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  locale: string;
  roleIds: string[];
}

export interface InviteUserResult {
  user: User;
  activationToken: string;
}

/**
 * ADM-05 / ADM-06 / ENT-10: crée un utilisateur en statut INVITED et génère
 * un lien d'activation à durée limitée. Le mot de passe est défini par
 * l'utilisateur lui-même via ActivateAccountUseCase, jamais par l'inviteur.
 */
@Injectable()
export class InviteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort,
    @Inject(INVITATION_TOKEN_REPOSITORY)
    private readonly invitationTokenRepository: InvitationTokenRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: InviteUserInput): Promise<InviteUserResult> {
    const email = Email.create(input.email);

    const alreadyExists = await this.userRepository.existsByEmailInTenant(
      input.tenantId,
      email.toString(),
    );
    if (alreadyExists) {
      throw new EmailAlreadyUsedError(
        `L'adresse ${email.toString()} est déjà utilisée pour cette entreprise.`,
      );
    }

    const user = await this.userRepository.create({
      tenantId: input.tenantId,
      type: input.type,
      email: email.toString(),
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      locale: input.locale,
      roleIds: input.roleIds,
    });

    const activationToken = this.generateToken();
    const tokenHash = this.hashToken(activationToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ACTIVATION_TOKEN_TTL_HOURS);

    await this.invitationTokenRepository.create(user.id, tokenHash, expiresAt);

    this.eventEmitter.emit(
      "user.invited",
      new UserInvitedEvent(user.id, user.email, activationToken),
    );

    return { user, activationToken };
  }

  private generateToken(): string {
    return randomBytes(32).toString("hex");
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
