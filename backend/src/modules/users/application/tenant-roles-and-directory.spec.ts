import { NotFoundDomainError } from "@shared/errors";

import { DEFAULT_TENANT_ROLES, TENANT_OWNER_ROLE_NAME } from "../domain/default-tenant-roles";
import { UserStatus } from "../domain/user-status";
import { User } from "../domain/user.entity";

import { FindTenantOwnerUseCase } from "./find-tenant-owner.use-case";
import { InviteLearnerUseCase } from "./invite-learner.use-case";
import { ListUsersUseCase } from "./list-users.use-case";
import { ProvisionTenantRolesUseCase } from "./provision-tenant-roles.use-case";
import { UpdateUserProfileUseCase } from "./update-user-profile.use-case";

function user(over: Partial<Parameters<typeof User.fromPersistence>[0]> = {}): User {
  return User.fromPersistence({
    id: "u-1",
    tenantId: "t-1",
    type: "COMPANY_USER",
    email: "a@b.co",
    firstName: "Aya",
    lastName: "Koné",
    phone: "+22501",
    locale: "fr",
    status: UserStatus.ACTIVE,
    roleIds: [],
    createdAt: new Date(),
    ...over,
  });
}

describe("ProvisionTenantRolesUseCase", () => {
  it("crée chaque rôle par défaut du tenant et renvoie l'id du Propriétaire", async () => {
    const roleRepository = {
      create: jest.fn(async (data: { name: string }) => ({ id: `id-${data.name}`, tenantId: "t-1", name: data.name })),
    };
    const result = await new ProvisionTenantRolesUseCase(roleRepository as never).execute("t-1");
    expect(result).toEqual({ ownerRoleId: `id-${TENANT_OWNER_ROLE_NAME}` });
    expect(roleRepository.create).toHaveBeenCalledTimes(DEFAULT_TENANT_ROLES.length);
    for (const definition of DEFAULT_TENANT_ROLES) {
      expect(roleRepository.create).toHaveBeenCalledWith({
        tenantId: "t-1",
        name: definition.name,
        isDefault: true,
        permissionCodes: definition.permissionCodes,
      });
    }
  });

  it("échoue si le dépôt ne renvoie pas le rôle Propriétaire", async () => {
    const roleRepository = { create: jest.fn(async () => ({ id: "x", tenantId: "t-1", name: "Autre" })) };
    await expect(new ProvisionTenantRolesUseCase(roleRepository as never).execute("t-1")).rejects.toThrow(
      "Le rôle Propriétaire n'a pas pu être provisionné.",
    );
  });
});

describe("FindTenantOwnerUseCase", () => {
  it("retourne l'utilisateur portant le rôle Propriétaire", async () => {
    const owner = user({ id: "owner", roleIds: ["r-owner"] });
    const roles = { findByTenantAndName: jest.fn().mockResolvedValue({ id: "r-owner" }) };
    const users = { listByTenant: jest.fn().mockResolvedValue([user({ id: "other" }), owner]) };
    await expect(new FindTenantOwnerUseCase(users as never, roles as never).execute("t-1")).resolves.toBe(owner);
    expect(roles.findByTenantAndName).toHaveBeenCalledWith("t-1", TENANT_OWNER_ROLE_NAME);
  });

  it("retourne null sans rôle Propriétaire (sans lister les utilisateurs) ou sans titulaire", async () => {
    const users = { listByTenant: jest.fn().mockResolvedValue([user()]) };
    const noRole = { findByTenantAndName: jest.fn().mockResolvedValue(null) };
    await expect(new FindTenantOwnerUseCase(users as never, noRole as never).execute("t-1")).resolves.toBeNull();
    expect(users.listByTenant).not.toHaveBeenCalled();
    const role = { findByTenantAndName: jest.fn().mockResolvedValue({ id: "r-owner" }) };
    await expect(new FindTenantOwnerUseCase(users as never, role as never).execute("t-1")).resolves.toBeNull();
  });
});

describe("ListUsersUseCase", () => {
  it("délègue au dépôt avec la portée demandée (tenant ou plateforme)", async () => {
    const list = [user()];
    const users = { listByTenant: jest.fn().mockResolvedValue(list) };
    const useCase = new ListUsersUseCase(users as never);
    await expect(useCase.execute("t-1")).resolves.toBe(list);
    await useCase.execute(null);
    expect(users.listByTenant).toHaveBeenNthCalledWith(1, "t-1");
    expect(users.listByTenant).toHaveBeenNthCalledWith(2, null);
  });
});

describe("UpdateUserProfileUseCase", () => {
  it("met à jour le profil d'un utilisateur existant", async () => {
    const users = { findById: jest.fn().mockResolvedValue(user()), updateProfile: jest.fn().mockResolvedValue(undefined) };
    await new UpdateUserProfileUseCase(users as never).execute("u-1", { firstName: "Bi" } as never);
    expect(users.updateProfile).toHaveBeenCalledWith("u-1", { firstName: "Bi" });
  });

  it("lève une 404 pour un utilisateur inconnu sans rien écrire", async () => {
    const users = { findById: jest.fn().mockResolvedValue(null), updateProfile: jest.fn() };
    await expect(new UpdateUserProfileUseCase(users as never).execute("x", {} as never)).rejects.toBeInstanceOf(NotFoundDomainError);
    expect(users.updateProfile).not.toHaveBeenCalled();
  });
});

describe("InviteLearnerUseCase - course sur la création du rôle", () => {
  const input = { tenantId: "t-1", email: "a@b.co", firstName: "A", lastName: "B", locale: "fr" };

  it("relit le rôle créé par une requête concurrente quand la création échoue", async () => {
    const invite = { execute: jest.fn().mockResolvedValue({ user: user(), activationToken: "t" }) };
    const roles = {
      findByTenantAndName: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "role-raced" }),
      create: jest.fn().mockRejectedValue(new Error("unique")),
    };
    await new InviteLearnerUseCase(invite as never, roles as never).execute(input);
    expect(invite.execute).toHaveBeenCalledWith(expect.objectContaining({ roleIds: ["role-raced"] }));
  });

  it("propage l'erreur d'origine si le rôle reste introuvable", async () => {
    const invite = { execute: jest.fn() };
    const failure = new Error("db down");
    const roles = { findByTenantAndName: jest.fn().mockResolvedValue(null), create: jest.fn().mockRejectedValue(failure) };
    await expect(new InviteLearnerUseCase(invite as never, roles as never).execute(input)).rejects.toBe(failure);
    expect(invite.execute).not.toHaveBeenCalled();
  });
});
