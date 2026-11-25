import { Inject, Injectable } from "@nestjs/common";

import type { User } from "../domain/user.entity";
import { USER_REPOSITORY } from "../domain/user.repository.port";
import type { UserRepositoryPort } from "../domain/user.repository.port";

/** ENT-10 (utilisateurs internes d'une entreprise) / ADM-36 (comptes admin plateforme). */
@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort) {}

  async execute(tenantId: string | null): Promise<User[]> {
    return this.userRepository.listByTenant(tenantId);
  }
}
