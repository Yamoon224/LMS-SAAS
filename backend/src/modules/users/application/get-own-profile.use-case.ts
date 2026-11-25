import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { USER_REPOSITORY } from "../domain/user.repository.port";
import type { UserRepositoryPort } from "../domain/user.repository.port";

export interface OwnProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  locale: string;
}

/** PUB-04 : profil de l'utilisateur connecté. L'identifiant vient toujours du jeton, jamais de la requête. */
@Injectable()
export class GetOwnProfileUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort) {}

  async execute(userId: string): Promise<OwnProfile> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundDomainError(`Utilisateur introuvable: ${userId}`);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      locale: user.locale,
    };
  }
}
