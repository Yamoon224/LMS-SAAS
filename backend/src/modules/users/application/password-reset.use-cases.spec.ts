import { createHash } from "node:crypto";

import type { EventEmitter2 } from "@nestjs/event-emitter";
import * as argon2 from "argon2";

import type { InvitationTokenRecord, InvitationTokenRepositoryPort } from "../domain/invitation-token.repository.port";
import { UserStatus } from "../domain/user-status";
import { User } from "../domain/user.entity";
import type { UserRepositoryPort } from "../domain/user.repository.port";
import type { PasswordResetRequestedEvent } from "../users.events";
import { PasswordChangedEvent } from "../users.events";

import { InvalidOrExpiredTokenError } from "./activate-account.use-case";
import { RequestPasswordResetUseCase, ResetPasswordUseCase } from "./password-reset.use-cases";

// argon2 (64 Mo / calcul) est lent sur une machine chargée : marge sur le délai par défaut de 5 s.
jest.setTimeout(120_000);

const RAW_TOKEN = "b".repeat(64);
const TOKEN_HASH = createHash("sha256").update(RAW_TOKEN).digest("hex");

function buildUser(status: UserStatus): User {
  return User.fromPersistence({
    id: "user-1",
    tenantId: "tenant-1",
    type: "LEARNER",
    email: "awa@example.com",
    firstName: "Awa",
    lastName: "Kone",
    phone: null,
    locale: "fr",
    status,
    roleIds: [],
    createdAt: new Date(),
  });
}

function buildUserRepository(user: User | null): jest.Mocked<UserRepositoryPort> {
  return {
    findById: jest.fn().mockResolvedValue(user),
    findByEmailInTenant: jest.fn().mockResolvedValue(user),
    existsByEmailInTenant: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    updateProfile: jest.fn(),
    setPasswordHash: jest.fn().mockResolvedValue(undefined),
    assignRoles: jest.fn(),
    listByTenant: jest.fn(),
    findManyByIds: jest.fn(),
  } as jest.Mocked<UserRepositoryPort>;
}

function buildTokenRepository(record: InvitationTokenRecord | null): jest.Mocked<InvitationTokenRepositoryPort> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    findValidByHash: jest.fn().mockResolvedValue(record),
    consume: jest.fn().mockResolvedValue(undefined),
    revokeAllForUser: jest.fn().mockResolvedValue(undefined),
  };
}

const emitter = () => ({ emit: jest.fn() }) as unknown as jest.Mocked<EventEmitter2>;

const validRecord = (overrides: Partial<InvitationTokenRecord> = {}): InvitationTokenRecord => ({
  userId: "user-1",
  tokenHash: TOKEN_HASH,
  expiresAt: new Date(Date.now() + 60_000),
  consumedAt: null,
  ...overrides,
});

describe("RequestPasswordResetUseCase", () => {
  it("émet un lien à durée limitée pour un compte actif, sans stocker le token en clair", async () => {
    const tokens = buildTokenRepository(null);
    const events = emitter();
    await new RequestPasswordResetUseCase(buildUserRepository(buildUser(UserStatus.ACTIVE)), tokens, events).execute({
      tenantId: "tenant-1",
      email: "  AWA@example.com ",
    });

    expect(tokens.revokeAllForUser).toHaveBeenCalledWith("user-1");
    const [userId, storedHash, expiresAt] = tokens.create.mock.calls[0] as [string, string, Date];
    expect(userId).toBe("user-1");
    expect(expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(60 * 60_000);

    const event = events.emit.mock.calls[0]?.[1] as PasswordResetRequestedEvent;
    expect(events.emit.mock.calls[0]?.[0]).toBe("user.password-reset-requested");
    expect(createHash("sha256").update(event.resetToken).digest("hex")).toBe(storedHash);
    expect(storedHash).not.toBe(event.resetToken);
  });

  it.each([UserStatus.INVITED, UserStatus.SUSPENDED, UserStatus.DEACTIVATED])(
    "n'envoie rien pour un compte %s, sans le signaler à l'appelant",
    async (status) => {
      const tokens = buildTokenRepository(null);
      const events = emitter();
      await expect(
        new RequestPasswordResetUseCase(buildUserRepository(buildUser(status)), tokens, events).execute({
          tenantId: "tenant-1",
          email: "awa@example.com",
        }),
      ).resolves.toBeUndefined();
      expect(tokens.create).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
    },
  );

  it("ne signale rien pour un e-mail inconnu ou mal formé", async () => {
    const tokens = buildTokenRepository(null);
    const events = emitter();
    const useCase = new RequestPasswordResetUseCase(buildUserRepository(null), tokens, events);
    await expect(useCase.execute({ tenantId: "tenant-1", email: "inconnu@example.com" })).resolves.toBeUndefined();
    await expect(useCase.execute({ tenantId: "tenant-1", email: "pas-un-email" })).resolves.toBeUndefined();
    expect(events.emit).not.toHaveBeenCalled();
  });
});

describe("ResetPasswordUseCase", () => {
  it("change le mot de passe, consomme le lien et notifie le changement", async () => {
    const users = buildUserRepository(buildUser(UserStatus.ACTIVE));
    const tokens = buildTokenRepository(validRecord());
    const events = emitter();
    await new ResetPasswordUseCase(users, tokens, events).execute({ token: RAW_TOKEN, password: "N0uveau-mdp!" });

    const hash = users.setPasswordHash.mock.calls[0]?.[1] as string;
    expect(hash).not.toContain("N0uveau-mdp!");
    await expect(argon2.verify(hash, "N0uveau-mdp!")).resolves.toBe(true);
    expect(tokens.consume).toHaveBeenCalledWith(TOKEN_HASH);
    expect(tokens.revokeAllForUser).toHaveBeenCalledWith("user-1");
    expect(events.emit.mock.calls[0]?.[0]).toBe("user.password-changed");
    expect(events.emit.mock.calls[0]?.[1]).toBeInstanceOf(PasswordChangedEvent);
  });

  it.each([
    ["inconnu", null],
    ["déjà utilisé", validRecord({ consumedAt: new Date() })],
    ["expiré", validRecord({ expiresAt: new Date(Date.now() - 1000) })],
  ])("refuse un lien %s", async (_label, record) => {
    const users = buildUserRepository(buildUser(UserStatus.ACTIVE));
    await expect(
      new ResetPasswordUseCase(users, buildTokenRepository(record), emitter()).execute({
        token: RAW_TOKEN,
        password: "N0uveau-mdp!",
      }),
    ).rejects.toThrow(InvalidOrExpiredTokenError);
    expect(users.setPasswordHash).not.toHaveBeenCalled();
  });

  it("refuse le lien d'un compte suspendu depuis la demande", async () => {
    const users = buildUserRepository(buildUser(UserStatus.SUSPENDED));
    await expect(
      new ResetPasswordUseCase(users, buildTokenRepository(validRecord()), emitter()).execute({
        token: RAW_TOKEN,
        password: "N0uveau-mdp!",
      }),
    ).rejects.toThrow(InvalidOrExpiredTokenError);
    expect(users.setPasswordHash).not.toHaveBeenCalled();
  });
});
