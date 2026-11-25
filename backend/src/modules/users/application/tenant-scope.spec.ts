import type { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import type { InvitationTokenRepositoryPort } from "../domain/invitation-token.repository.port";
import type { RoleRepositoryPort } from "../domain/role.repository.port";
import type { UserRepositoryPort } from "../domain/user.repository.port";

import { AssertRolesInScopeUseCase } from "./assert-roles-in-scope.use-case";
import { AssignRolesUseCase } from "./assign-roles.use-case";
import { ManageUserStatusUseCase } from "./manage-user-status.use-case";
import { ResendInvitationUseCase } from "./resend-invitation.use-case";

function userRepositoryFor(user: unknown): UserRepositoryPort {
  return {
    findById: jest.fn().mockResolvedValue(user),
    updateStatus: jest.fn(),
    assignRoles: jest.fn(),
  } as unknown as UserRepositoryPort;
}

function roleRepositoryFor(roles: Array<{ id: string; tenantId: string | null }>): RoleRepositoryPort {
  return {
    findByIds: jest
      .fn()
      .mockImplementation(async (ids: string[]) => roles.filter((role) => ids.includes(role.id))),
  } as unknown as RoleRepositoryPort;
}

describe("AssertRolesInScopeUseCase", () => {
  const roles = [
    { id: "r-A", tenantId: "tenant-A" },
    { id: "r-A2", tenantId: "tenant-A" },
    { id: "r-B", tenantId: "tenant-B" },
    { id: "r-platform", tenantId: null },
  ];
  const useCase = new AssertRolesInScopeUseCase(roleRepositoryFor(roles));

  it("accepts roles of the target scope", async () => {
    await expect(useCase.execute(["r-A", "r-A2", "r-A"], "tenant-A")).resolves.toBeUndefined();
    await expect(useCase.execute(["r-platform"], null)).resolves.toBeUndefined();
  });

  it("rejects a platform role requested from a tenant (privilege escalation)", async () => {
    await expect(useCase.execute(["r-platform"], "tenant-A")).rejects.toThrow(NotFoundDomainError);
  });

  it("rejects a role of another tenant", async () => {
    await expect(useCase.execute(["r-A", "r-B"], "tenant-A")).rejects.toThrow(NotFoundDomainError);
  });

  it("rejects a tenant role requested for a platform account", async () => {
    await expect(useCase.execute(["r-A"], null)).rejects.toThrow(NotFoundDomainError);
  });

  it("rejects an unknown role id", async () => {
    await expect(useCase.execute(["ghost"], "tenant-A")).rejects.toThrow(NotFoundDomainError);
  });
});

describe("AssignRolesUseCase tenant scope", () => {
  function build(user: unknown, roles: Array<{ id: string; tenantId: string | null }> = [{ id: "r-A", tenantId: "tenant-A" }]) {
    const userRepository = userRepositoryFor(user);
    const useCase = new AssignRolesUseCase(
      userRepository,
      new AssertRolesInScopeUseCase(roleRepositoryFor(roles)),
    );
    return { userRepository, useCase };
  }

  it("assigns roles to a member of the caller's tenant", async () => {
    const { userRepository, useCase } = build({ id: "u-1", tenantId: "tenant-A" });
    await useCase.execute("u-1", ["r-A"], "tenant-A");
    expect(userRepository.assignRoles).toHaveBeenCalledWith("u-1", ["r-A"]);
  });

  it("raises NotFound for a user of another tenant", async () => {
    const { userRepository, useCase } = build({ id: "u-1", tenantId: "tenant-B" });
    await expect(useCase.execute("u-1", ["r-A"], "tenant-A")).rejects.toThrow(NotFoundDomainError);
    expect(userRepository.assignRoles).not.toHaveBeenCalled();
  });

  it("raises NotFound for a platform account (tenantId null) targeted from a tenant", async () => {
    const { userRepository, useCase } = build({ id: "u-1", tenantId: null });
    await expect(useCase.execute("u-1", ["r-A"], "tenant-A")).rejects.toThrow(NotFoundDomainError);
    expect(userRepository.assignRoles).not.toHaveBeenCalled();
  });

  it("refuses a platform role even for a user of the caller's tenant", async () => {
    const { userRepository, useCase } = build({ id: "u-1", tenantId: "tenant-A" }, [
      { id: "r-platform", tenantId: null },
    ]);
    await expect(useCase.execute("u-1", ["r-platform"], "tenant-A")).rejects.toThrow(NotFoundDomainError);
    expect(userRepository.assignRoles).not.toHaveBeenCalled();
  });

  it("platform operator route (no scope) still cannot cross-assign scopes", async () => {
    const { userRepository, useCase } = build({ id: "u-1", tenantId: null }, [{ id: "r-A", tenantId: "tenant-A" }]);
    await expect(useCase.execute("u-1", ["r-A"])).rejects.toThrow(NotFoundDomainError);
    expect(userRepository.assignRoles).not.toHaveBeenCalled();
  });
});

describe("ManageUserStatusUseCase tenant scope", () => {
  const emitter = { emit: jest.fn() } as unknown as EventEmitter2;

  it("suspends a member of the caller's tenant", async () => {
    const user = { suspend: jest.fn().mockReturnValue("SUSPENDED"), tenantId: "tenant-A" };
    const repository = userRepositoryFor(user);
    await new ManageUserStatusUseCase(repository, emitter, roleRepositoryFor([])).suspend("u-1", "tenant-A");
    expect(repository.updateStatus).toHaveBeenCalledWith("u-1", "SUSPENDED");
  });

  it("raises NotFound and suspends nothing for a user of another tenant", async () => {
    const user = { suspend: jest.fn(), tenantId: "tenant-B" };
    const repository = userRepositoryFor(user);
    await expect(new ManageUserStatusUseCase(repository, emitter, roleRepositoryFor([])).suspend("u-1", "tenant-A")).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(user.suspend).not.toHaveBeenCalled();
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it("raises NotFound when a tenant tries to suspend a platform admin", async () => {
    const user = { suspend: jest.fn(), tenantId: null };
    const repository = userRepositoryFor(user);
    await expect(new ManageUserStatusUseCase(repository, emitter, roleRepositoryFor([])).suspend("u-1", "tenant-A")).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it("operator routes (no scope) can still act on any user", async () => {
    const user = { suspend: jest.fn().mockReturnValue("SUSPENDED"), tenantId: "tenant-B" };
    const repository = userRepositoryFor(user);
    await new ManageUserStatusUseCase(repository, emitter, roleRepositoryFor([])).suspend("u-1");
    expect(repository.updateStatus).toHaveBeenCalled();
  });
});

describe("ResendInvitationUseCase tenant scope", () => {
  function build(user: unknown) {
    const invitationTokens = {
      revokeAllForUser: jest.fn(),
      create: jest.fn(),
    } as unknown as InvitationTokenRepositoryPort;
    const emitter = { emit: jest.fn() } as unknown as EventEmitter2;
    return { invitationTokens, useCase: new ResendInvitationUseCase(userRepositoryFor(user), invitationTokens, emitter) };
  }

  it("resends to a member of the caller's tenant", async () => {
    const { invitationTokens, useCase } = build({ id: "u-1", email: "a@b.c", tenantId: "tenant-A" });
    await useCase.execute("u-1", "tenant-A");
    expect(invitationTokens.create).toHaveBeenCalled();
  });

  it("raises NotFound and issues no token for a user of another tenant", async () => {
    const { invitationTokens, useCase } = build({ id: "u-1", email: "a@b.c", tenantId: "tenant-B" });
    await expect(useCase.execute("u-1", "tenant-A")).rejects.toThrow(NotFoundDomainError);
    expect(invitationTokens.revokeAllForUser).not.toHaveBeenCalled();
    expect(invitationTokens.create).not.toHaveBeenCalled();
  });
});
