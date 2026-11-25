import { Inject, Injectable } from "@nestjs/common";
import type { UserType } from "@shared/domain/user-type";
import * as argon2 from "argon2";

import { Email } from "../domain/email.vo";
import type { User } from "../domain/user.entity";
import { USER_REPOSITORY } from "../domain/user.repository.port";
import type { UserRepositoryPort } from "../domain/user.repository.port";

import { EmailAlreadyUsedError } from "./invite-user.use-case";

export interface CreateActiveUserInput {
  tenantId: string | null;
  type: UserType;
  email: string;
  firstName: string;
  lastName: string;
  locale: string;
  roleIds: string[];
  /** Mot de passe en clair : haché (argon2) ici, jamais journalisé ni renvoyé. */
  password: string;
}

/**
 * Création d'un compte directement ACTIF (mot de passe défini par l'Admin, e-mail considéré vérifié) :
 * aucun jeton d'activation, aucun e-mail d'invitation.
 */
@Injectable()
export class CreateActiveUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort) {}

  async execute(input: CreateActiveUserInput): Promise<{ user: User }> {
    const email = Email.create(input.email);

    if (await this.userRepository.existsByEmailInTenant(input.tenantId, email.toString())) {
      throw new EmailAlreadyUsedError(
        `L'adresse ${email.toString()} est déjà utilisée pour cette entreprise.`,
      );
    }

    const passwordHash = await argon2.hash(input.password);
    const user = await this.userRepository.create({
      tenantId: input.tenantId,
      type: input.type,
      email: email.toString(),
      firstName: input.firstName,
      lastName: input.lastName,
      locale: input.locale,
      roleIds: input.roleIds,
      passwordHash,
    });
    return { user };
  }
}
