import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainError, NotFoundDomainError } from "@shared/errors";

import { TENANT_OWNER_ROLE_NAME } from "../domain/default-tenant-roles";
import { ROLE_REPOSITORY } from "../domain/role.repository.port";
import type { RoleRepositoryPort } from "../domain/role.repository.port";
import type { User } from "../domain/user.entity";
import { USER_REPOSITORY } from "../domain/user.repository.port";
import type { UserRepositoryPort } from "../domain/user.repository.port";
import { UserDeactivatedEvent, UserReactivatedEvent, UserSuspendedEvent } from "../users.events";

/**
 * Règle conservatrice (décision produit à valider) : sur les routes entreprise, un utilisateur
 * ne peut ni se suspendre/désactiver lui-même, ni suspendre/désactiver le Propriétaire du tenant
 * (évite le verrouillage de l'entreprise et la prise de contrôle par un gestionnaire).
 */
export class ProtectedUserActionError extends DomainError {
  readonly code = "ACTION_INTERDITE_SUR_SOI_OU_PROPRIETAIRE";
}

/** ADM-06 (révocation d'accès) / ENT-10 (désactivation d'un utilisateur interne). */
@Injectable()
export class ManageUserStatusUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepositoryPort,
  ) {}

  /** `scopeTenantId`: tenant de l'appelant (routes entreprise); omis uniquement par les routes opérateur plateforme. */
  async suspend(userId: string, scopeTenantId?: string, actorUserId?: string, auditActorId?: string): Promise<void> {
    const user = await this.getUserOrThrow(userId, scopeTenantId);
    await this.assertNotSelfOrOwner(user, actorUserId);
    const status = user.suspend();
    await this.userRepository.updateStatus(userId, status);
    this.eventEmitter.emit("user.suspended", new UserSuspendedEvent(userId, auditActorId ?? null));
  }

  async reactivate(userId: string, scopeTenantId?: string, auditActorId?: string): Promise<void> {
    const user = await this.getUserOrThrow(userId, scopeTenantId);
    const status = user.reactivate();
    await this.userRepository.updateStatus(userId, status);
    this.eventEmitter.emit("user.reactivated", new UserReactivatedEvent(userId, auditActorId ?? null));
  }

  async deactivate(userId: string, scopeTenantId?: string, actorUserId?: string): Promise<void> {
    const user = await this.getUserOrThrow(userId, scopeTenantId);
    await this.assertNotSelfOrOwner(user, actorUserId);
    const status = user.deactivate();
    await this.userRepository.updateStatus(userId, status);
    this.eventEmitter.emit("user.deactivated", new UserDeactivatedEvent(userId));
  }

  /** `actorUserId` n'est fourni que par les routes entreprise ; les routes opérateur plateforme ne sont pas concernées. */
  private async assertNotSelfOrOwner(user: User, actorUserId?: string): Promise<void> {
    if (actorUserId === undefined) return;
    if (user.id === actorUserId) {
      throw new ProtectedUserActionError("Vous ne pouvez pas suspendre ou désactiver votre propre compte.");
    }
    if (user.tenantId) {
      const ownerRole = await this.roleRepository.findByTenantAndName(user.tenantId, TENANT_OWNER_ROLE_NAME);
      if (ownerRole && user.roleIds.includes(ownerRole.id)) {
        throw new ProtectedUserActionError("Le Propriétaire de l'entreprise ne peut pas être suspendu ni désactivé.");
      }
    }
  }

  private async getUserOrThrow(userId: string, scopeTenantId?: string) {
    const user = await this.userRepository.findById(userId);
    if (!user || (scopeTenantId !== undefined && user.tenantId !== scopeTenantId)) {
      throw new NotFoundDomainError(`Utilisateur introuvable: ${userId}`);
    }
    return user;
  }
}
