import type { EventEmitter2 } from "@nestjs/event-emitter";

import type { InvitationTokenRepositoryPort } from "../domain/invitation-token.repository.port";
import { UserStatus } from "../domain/user-status";
import { User } from "../domain/user.entity";
import type { UserRepositoryPort } from "../domain/user.repository.port";

import { EmailAlreadyUsedError, InviteUserUseCase } from "./invite-user.use-case";

function buildUserRepositoryMock(overrides: Partial<UserRepositoryPort> = {}): UserRepositoryPort {
  return {
    findById: jest.fn(),
    findByEmailInTenant: jest.fn(),
    existsByEmailInTenant: jest.fn().mockResolvedValue(false),
    create: jest.fn().mockImplementation((data) =>
      Promise.resolve(
        User.fromPersistence({
          id: "user-1",
          tenantId: data.tenantId,
          type: data.type,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone ?? null,
          locale: data.locale,
          status: UserStatus.INVITED,
          roleIds: data.roleIds,
          createdAt: new Date(),
        }),
      ),
    ),
    updateStatus: jest.fn(),
    updateProfile: jest.fn(),
    setPasswordHash: jest.fn(),
    assignRoles: jest.fn(),
    listByTenant: jest.fn(),
    findManyByIds: jest.fn(),
    ...overrides,
  };
}

function buildInvitationTokenRepositoryMock(): InvitationTokenRepositoryPort {
  return {
    create: jest.fn(),
    findValidByHash: jest.fn(),
    consume: jest.fn(),
    revokeAllForUser: jest.fn(),
  };
}

describe("InviteUserUseCase", () => {
  it("creates the user in INVITED status and emits user.invited with the activation token", async () => {
    const userRepository = buildUserRepositoryMock();
    const invitationTokenRepository = buildInvitationTokenRepositoryMock();
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;

    const useCase = new InviteUserUseCase(userRepository, invitationTokenRepository, eventEmitter);

    const result = await useCase.execute({
      tenantId: "tenant-1",
      type: "COMPANY_USER",
      email: "Manager@Acme.com",
      firstName: "Aya",
      lastName: "Koné",
      locale: "fr",
      roleIds: ["role-1"],
    });

    expect(result.user.status).toBe(UserStatus.INVITED);
    expect(result.activationToken).toHaveLength(64); // 32 bytes hex
    expect(invitationTokenRepository.create).toHaveBeenCalledWith(
      "user-1",
      expect.any(String),
      expect.any(Date),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      "user.invited",
      expect.objectContaining({ userId: "user-1", email: "manager@acme.com" }),
    );
  });

  it("rejects an email already used within the same tenant (RG-20)", async () => {
    const userRepository = buildUserRepositoryMock({
      existsByEmailInTenant: jest.fn().mockResolvedValue(true),
    });
    const invitationTokenRepository = buildInvitationTokenRepositoryMock();
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;

    const useCase = new InviteUserUseCase(userRepository, invitationTokenRepository, eventEmitter);

    await expect(
      useCase.execute({
        tenantId: "tenant-1",
        type: "COMPANY_USER",
        email: "taken@acme.com",
        firstName: "Aya",
        lastName: "Koné",
        locale: "fr",
        roleIds: ["role-1"],
      }),
    ).rejects.toThrow(EmailAlreadyUsedError);

    expect(userRepository.create).not.toHaveBeenCalled();
  });
});
