import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { USER_REPOSITORY } from "../domain/user.repository.port";
import type { UpdateUserProfileData, UserRepositoryPort } from "../domain/user.repository.port";

@Injectable()
export class UpdateUserProfileUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort) {}

  async execute(userId: string, data: UpdateUserProfileData): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundDomainError(`Utilisateur introuvable: ${userId}`);
    }

    await this.userRepository.updateProfile(userId, data);
  }
}
