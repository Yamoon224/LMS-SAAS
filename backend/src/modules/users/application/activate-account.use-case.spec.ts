import { createHash } from "node:crypto";

import { NotFoundDomainError } from "@shared/errors";

import type { InvitationTokenRecord, InvitationTokenRepositoryPort } from "../domain/invitation-token.repository.port";
import { UserStatus } from "../domain/user-status";
import { User } from "../domain/user.entity";
import type { UserRepositoryPort } from "../domain/user.repository.port";

import { ActivateAccountUseCase, InvalidOrExpiredTokenError } from "./activate-account.use-case";

const RAW_TOKEN = "a".repeat(64);
const TOKEN_HASH = createHash("sha256").update(RAW_TOKEN).digest("hex");

function buildInvitedUser(): User {
  return User.fromPersistence({
    id: "user-1",
    tenantId: "tenant-1",
    type: "COMPANY_USER",
    email: "user@example.com",
    firstName: "Aya",
    lastName: "Koné",
    phone: null,
    locale: "fr",
    status: UserStatus.INVITED,
    roleIds: [],
    createdAt: new Date(),
  });
}

function buildUserRepositoryMock(user: User | null): UserRepositoryPort {
  return {
    findById: jest.fn().mockResolvedValue(user),
    findByEmailInTenant: jest.fn(),
    existsByEmailInTenant: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    updateProfile: jest.fn(),
    setPasswordHash: jest.fn(),
    assignRoles: jest.fn(),
    listByTenant: jest.fn(),
    findManyByIds: jest.fn(),
  };
}

function buildInvitationTokenRepositoryMock(
  record: InvitationTokenRecord | null,
): InvitationTokenRepositoryPort {
  return {
    create: jest.fn(),
    findValidByHash: jest.fn().mockResolvedValue(record),
    consume: jest.fn(),
    revokeAllForUser: jest.fn(),
  };
}

function buildTokenRecord(overrides: Partial<InvitationTokenRecord> = {}): InvitationTokenRecord {
  return {
    userId: "user-1",
    tokenHash: TOKEN_HASH,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    consumedAt: null,
    ...overrides,
  };
}

async function expectActivationRejected(
  userRepository: UserRepositoryPort,
  tokenRecord: InvitationTokenRecord | null,
  expectedError: new (...args: never[]) => Error,
): Promise<void> {
  const invitationTokenRepository = buildInvitationTokenRepositoryMock(tokenRecord);
  const useCase = new ActivateAccountUseCase(userRepository, invitationTokenRepository);

  await expect(
    useCase.execute({ token: RAW_TOKEN, password: "S3cret-password!" }),
  ).rejects.toThrow(expectedError);
}

describe("ActivateAccountUseCase", () => {
  it("activates the account and consumes the token on a valid link", async () => {
    const userRepository = buildUserRepositoryMock(buildInvitedUser());
    const invitationTokenRepository = buildInvitationTokenRepositoryMock(buildTokenRecord());

    const useCase = new ActivateAccountUseCase(userRepository, invitationTokenRepository);
    await useCase.execute({ token: RAW_TOKEN, password: "S3cret-password!" });

    expect(userRepository.setPasswordHash).toHaveBeenCalledWith("user-1", expect.any(String));
    expect(userRepository.updateStatus).toHaveBeenCalledWith("user-1", UserStatus.ACTIVE);
    expect(invitationTokenRepository.consume).toHaveBeenCalledWith(TOKEN_HASH);
  });

  it("rejects an unknown token", async () => {
    await expectActivationRejected(buildUserRepositoryMock(null), null, InvalidOrExpiredTokenError);
  });

  it("rejects an expired token", async () => {
    const tokenRecord = buildTokenRecord({ expiresAt: new Date(Date.now() - 1000) });
    await expectActivationRejected(
      buildUserRepositoryMock(buildInvitedUser()),
      tokenRecord,
      InvalidOrExpiredTokenError,
    );
  });

  it("rejects an already consumed token", async () => {
    const tokenRecord = buildTokenRecord({ consumedAt: new Date() });
    await expectActivationRejected(
      buildUserRepositoryMock(buildInvitedUser()),
      tokenRecord,
      InvalidOrExpiredTokenError,
    );
  });

  it("raises NotFoundDomainError if the user referenced by the token no longer exists", async () => {
    const tokenRecord = buildTokenRecord({ userId: "ghost-user" });
    await expectActivationRejected(buildUserRepositoryMock(null), tokenRecord, NotFoundDomainError);
  });
});
