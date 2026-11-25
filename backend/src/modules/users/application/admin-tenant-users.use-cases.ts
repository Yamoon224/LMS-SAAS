import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainError, NotFoundDomainError } from "@shared/errors";

import { TENANT_MANAGER_ROLE_NAME, TENANT_OWNER_ROLE_NAME } from "../domain/default-tenant-roles";
import { ROLE_REPOSITORY } from "../domain/role.repository.port";
import type { RoleRepositoryPort } from "../domain/role.repository.port";
import { UserStatus } from "../domain/user-status";
import type { User } from "../domain/user.entity";
import { USER_REPOSITORY } from "../domain/user.repository.port";
import type { UserRepositoryPort } from "../domain/user.repository.port";
import { TenantOwnershipTransferredEvent, UserAdminActionEvent } from "../users.events";

import { ManageUserStatusUseCase } from "./manage-user-status.use-case";
import { RequestPasswordResetUseCase } from "./password-reset.use-cases";
import { ResendInvitationUseCase } from "./resend-invitation.use-case";

/** Le dernier propriétaire actif d'une entreprise ne peut être ni suspendu ni rétrogradé : l'entreprise serait verrouillée. */
export class LastActiveOwnerError extends DomainError {
  readonly code = "DERNIER_PROPRIETAIRE_ACTIF";
}

export class InvalidTenantUserActionError extends DomainError {
  readonly code = "ACTION_UTILISATEUR_INVALIDE";
}

/**
 * ADM-06 : actions d'un administrateur plateforme sur les comptes d'UNE entreprise. Le périmètre est imposé ici :
 * le compte visé doit appartenir au tenant de l'URL et être un compte interne (jamais un compte plateforme ni un
 * apprenant) ; sinon 404, comme pour un identifiant inconnu. Aucun mot de passe ni lien n'est retourné : les liens
 * partent uniquement par e-mail vers le titulaire du compte.
 */
@Injectable()
export class AdminTenantUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort,
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepositoryPort,
    private readonly manageUserStatus: ManageUserStatusUseCase,
    private readonly resendInvitation: ResendInvitationUseCase,
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Compte interne du tenant (404 sinon). Exposé pour les autres actions du périmètre (ex. 2FA). */
  async assertInScope(tenantId: string, userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user || user.tenantId !== tenantId || user.type !== "COMPANY_USER") {
      throw new NotFoundDomainError(`Utilisateur introuvable: ${userId}`);
    }
    return user;
  }

  async suspend(tenantId: string, userId: string, actorId: string): Promise<void> {
    const user = await this.assertInScope(tenantId, userId);
    if (user.status === UserStatus.ACTIVE) {
      await this.assertNotLastActiveOwner(tenantId, user);
    }
    await this.manageUserStatus.suspend(userId, tenantId, undefined, actorId);
  }

  async reactivate(tenantId: string, userId: string, actorId: string): Promise<void> {
    await this.assertInScope(tenantId, userId);
    await this.manageUserStatus.reactivate(userId, tenantId, actorId);
  }

  /** Renvoi du lien d'activation : uniquement pour un compte encore INVITÉ (l'ancien lien est révoqué). */
  async resendInvitationFor(tenantId: string, userId: string, actorId: string): Promise<void> {
    const user = await this.assertInScope(tenantId, userId);
    if (user.status !== UserStatus.INVITED) {
      throw new InvalidTenantUserActionError("Seul un compte invité (non activé) peut recevoir une nouvelle invitation.");
    }
    await this.resendInvitation.execute(userId, tenantId);
    this.eventEmitter.emit("user.admin-action", new UserAdminActionEvent(userId, tenantId, actorId, "invitation-resent"));
  }

  /** Envoie un lien de réinitialisation par e-mail (valable 1 h) ; compte ACTIF uniquement. Rien n'est retourné. */
  async sendPasswordReset(tenantId: string, userId: string, actorId: string): Promise<void> {
    const user = await this.assertInScope(tenantId, userId);
    if (user.status !== UserStatus.ACTIVE) {
      throw new InvalidTenantUserActionError(
        "La réinitialisation n'est possible que pour un compte actif (invitez ou réactivez le compte d'abord).",
      );
    }
    await this.requestPasswordReset.execute({ tenantId, email: user.email });
    this.eventEmitter.emit(
      "user.admin-action",
      new UserAdminActionEvent(userId, tenantId, actorId, "password-reset-sent"),
    );
  }

  /**
   * Transfert de propriété : le compte cible (actif, interne) reçoit le rôle Propriétaire, les autres propriétaires
   * le perdent (rôle Gestionnaire si plus aucun rôle). Refusé si la cible est déjà l'unique propriétaire.
   */
  async transferOwnership(tenantId: string, newOwnerUserId: string, actorId: string): Promise<void> {
    const target = await this.assertInScope(tenantId, newOwnerUserId);
    if (target.status !== UserStatus.ACTIVE) {
      throw new InvalidTenantUserActionError("Le nouveau propriétaire doit avoir un compte actif.");
    }
    const ownerRole = await this.roleRepository.findByTenantAndName(tenantId, TENANT_OWNER_ROLE_NAME);
    if (!ownerRole) throw new NotFoundDomainError("Rôle Propriétaire introuvable pour cette entreprise.");

    const users = await this.userRepository.listByTenant(tenantId);
    const currentOwners = users.filter((user) => user.type === "COMPANY_USER" && user.roleIds.includes(ownerRole.id));
    const previousOwners = currentOwners.filter((owner) => owner.id !== target.id);
    if (target.roleIds.includes(ownerRole.id) && previousOwners.length === 0) {
      throw new InvalidTenantUserActionError("Ce compte est déjà l'unique propriétaire de l'entreprise.");
    }

    await this.userRepository.assignRoles(target.id, [...new Set([...target.roleIds, ownerRole.id])]);

    const managerRole = await this.roleRepository.findByTenantAndName(tenantId, TENANT_MANAGER_ROLE_NAME);
    for (const owner of previousOwners) {
      const remaining = owner.roleIds.filter((roleId) => roleId !== ownerRole.id);
      if (remaining.length === 0 && managerRole) remaining.push(managerRole.id);
      await this.userRepository.assignRoles(owner.id, remaining);
    }

    this.eventEmitter.emit(
      "tenant.ownership-transferred",
      new TenantOwnershipTransferredEvent(
        tenantId,
        target.id,
        previousOwners.map((owner) => owner.id),
        actorId,
      ),
    );
  }

  private async assertNotLastActiveOwner(tenantId: string, user: User): Promise<void> {
    const ownerRole = await this.roleRepository.findByTenantAndName(tenantId, TENANT_OWNER_ROLE_NAME);
    if (!ownerRole || !user.roleIds.includes(ownerRole.id)) return;
    const users = await this.userRepository.listByTenant(tenantId);
    const otherActiveOwners = users.filter(
      (other) => other.id !== user.id && other.status === UserStatus.ACTIVE && other.roleIds.includes(ownerRole.id),
    );
    if (otherActiveOwners.length === 0) {
      throw new LastActiveOwnerError(
        "Dernier propriétaire actif : transférez d'abord la propriété à un autre compte avant de le suspendre.",
      );
    }
  }
}
