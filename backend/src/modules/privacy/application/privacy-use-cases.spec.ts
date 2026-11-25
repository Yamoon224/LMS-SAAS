import { NotFoundDomainError } from "@shared/errors";
import * as argon2 from "argon2";

import {
  AccountAlreadyDeletedError,
  AccountDeletionBlockedError,
  WrongPasswordError,
} from "../domain/privacy.errors";
import type { PrivacyAccount, PrivacyRepositoryPort } from "../domain/privacy.repository.port";

import { DeleteMyAccountUseCase } from "./delete-my-account.use-case";
import { ExportMyDataUseCase } from "./export-my-data.use-case";
import { PurgeExpiredPersonalDataUseCase } from "./purge-expired-personal-data.use-case";

// argon2 (64 Mo / calcul) est lent sur une machine chargée : marge sur le délai par défaut de 5 s.
jest.setTimeout(120_000);

const NOW = new Date("2026-11-18T03:30:00Z");

interface Fixture {
  repository: jest.Mocked<PrivacyRepositoryPort>;
  emit: jest.Mock;
}

async function fixture(account: Partial<PrivacyAccount> | null = {}, password = "Secret-123"): Promise<Fixture> {
  const passwordHash = await argon2.hash(password);
  const repository: jest.Mocked<PrivacyRepositoryPort> = {
    findAccount: jest.fn().mockResolvedValue(
      account === null
        ? null
        : { id: "u-1", tenantId: "t-1", type: "LEARNER", passwordHash, anonymizedAt: null, ...account },
    ),
    collectLearnerData: jest.fn().mockResolvedValue({ profile: { id: "u-1" }, enrollments: [], assessmentAttempts: [], certificates: [], purchases: [], notifications: [] }),
    findDeletionBlockers: jest.fn().mockResolvedValue({ pendingPayments: 0, openRefunds: 0 }),
    anonymizeLearner: jest.fn().mockResolvedValue(true),
    deleteReadNotificationsBefore: jest.fn().mockResolvedValue(0),
    listInactiveLearnerIds: jest.fn().mockResolvedValue([]),
  };
  return { repository, emit: jest.fn() };
}

describe("DeleteMyAccountUseCase", () => {
  const build = (f: Fixture) => new DeleteMyAccountUseCase(f.repository, { emit: f.emit } as never);

  it("anonymizes the account with the right password and emits an audit event without personal data", async () => {
    const f = await fixture();
    await build(f).execute("u-1", "Secret-123", NOW);
    expect(f.repository.anonymizeLearner).toHaveBeenCalledWith("u-1", NOW);
    expect(f.emit).toHaveBeenCalledWith(
      "privacy.account-deleted",
      expect.objectContaining({ userId: "u-1", tenantId: "t-1", origin: "SELF" }),
    );
  });

  it("refuses a wrong password and changes nothing", async () => {
    const f = await fixture();
    await expect(build(f).execute("u-1", "mauvais", NOW)).rejects.toBeInstanceOf(WrongPasswordError);
    expect(f.repository.anonymizeLearner).not.toHaveBeenCalled();
    expect(f.emit).not.toHaveBeenCalled();
  });

  it("refuses an account without password (cannot be confirmed)", async () => {
    const f = await fixture({ passwordHash: null });
    await expect(build(f).execute("u-1", "x", NOW)).rejects.toBeInstanceOf(WrongPasswordError);
    expect(f.repository.anonymizeLearner).not.toHaveBeenCalled();
  });

  it("refuses a second deletion (token still valid after the first one)", async () => {
    const f = await fixture({ anonymizedAt: NOW, passwordHash: null });
    await expect(build(f).execute("u-1", "Secret-123", NOW)).rejects.toBeInstanceOf(AccountAlreadyDeletedError);
    expect(f.repository.anonymizeLearner).not.toHaveBeenCalled();
  });

  it("handles a concurrent double submission: the loser gets 'already deleted' and emits no event", async () => {
    const f = await fixture();
    f.repository.anonymizeLearner.mockResolvedValue(false);
    await expect(build(f).execute("u-1", "Secret-123", NOW)).rejects.toBeInstanceOf(AccountAlreadyDeletedError);
    expect(f.emit).not.toHaveBeenCalled();
  });

  it.each([
    [{ pendingPayments: 1, openRefunds: 0 }],
    [{ pendingPayments: 0, openRefunds: 2 }],
  ])("refuses with a reason while a payment or refund is in progress (%j)", async (blockers) => {
    const f = await fixture();
    f.repository.findDeletionBlockers.mockResolvedValue(blockers);
    await expect(build(f).execute("u-1", "Secret-123", NOW)).rejects.toBeInstanceOf(AccountDeletionBlockedError);
    expect(f.repository.anonymizeLearner).not.toHaveBeenCalled();
  });

  it("is reserved to learner accounts and treats unknown accounts as not found", async () => {
    await expect(build(await fixture({ type: "COMPANY_USER" })).execute("u-1", "Secret-123", NOW)).rejects.toBeInstanceOf(
      NotFoundDomainError,
    );
    await expect(build(await fixture(null)).execute("u-1", "x", NOW)).rejects.toBeInstanceOf(NotFoundDomainError);
  });
});

describe("ExportMyDataUseCase", () => {
  const build = (f: Fixture) => new ExportMyDataUseCase(f.repository, { emit: f.emit } as never);

  it("exports only the requester's data, looked up by the id from the token, and audits it with counts only", async () => {
    const f = await fixture();
    const data = await build(f).execute("u-1", NOW);
    expect(f.repository.collectLearnerData).toHaveBeenCalledWith("u-1", NOW);
    expect(data.profile.id).toBe("u-1");
    expect(f.emit).toHaveBeenCalledWith(
      "privacy.data-exported",
      expect.objectContaining({ userId: "u-1", counts: expect.objectContaining({ enrollments: 0 }) }),
    );
    expect(JSON.stringify(f.emit.mock.calls)).not.toContain("passwordHash");
  });

  it("answers 404 for unknown, non-learner and already anonymized accounts", async () => {
    for (const account of [null, { type: "PLATFORM_ADMIN" }, { anonymizedAt: NOW }]) {
      const f = await fixture(account);
      await expect(build(f).execute("u-1", NOW)).rejects.toBeInstanceOf(NotFoundDomainError);
      expect(f.repository.collectLearnerData).not.toHaveBeenCalled();
    }
  });
});

describe("PurgeExpiredPersonalDataUseCase", () => {
  const build = (f: Fixture) => new PurgeExpiredPersonalDataUseCase(f.repository, { emit: f.emit } as never);

  it("purges read notifications older than 12 months and anonymizes learners inactive for 36 months", async () => {
    const f = await fixture();
    f.repository.deleteReadNotificationsBefore.mockResolvedValue(4);
    f.repository.listInactiveLearnerIds.mockResolvedValue(["u-1", "u-2"]);
    const result = await build(f).execute(NOW, {});
    expect(f.repository.deleteReadNotificationsBefore).toHaveBeenCalledWith(new Date("2025-11-18T03:30:00Z"));
    expect(f.repository.listInactiveLearnerIds).toHaveBeenCalledWith(new Date("2023-11-18T03:30:00Z"), expect.any(Number));
    expect(result).toEqual({ enabled: true, notificationsDeleted: 4, accountsAnonymized: 2 });
    expect(f.emit).toHaveBeenCalledWith("privacy.account-deleted", expect.objectContaining({ origin: "RETENTION" }));
  });

  it("does nothing when disabled by RETENTION_PURGE_ENABLED=false", async () => {
    const f = await fixture();
    const result = await build(f).execute(NOW, { RETENTION_PURGE_ENABLED: "false" });
    expect(result.enabled).toBe(false);
    expect(f.repository.deleteReadNotificationsBefore).not.toHaveBeenCalled();
    expect(f.repository.listInactiveLearnerIds).not.toHaveBeenCalled();
  });

  it("skips an inactive account with a payment or refund in progress", async () => {
    const f = await fixture();
    f.repository.listInactiveLearnerIds.mockResolvedValue(["u-1", "u-2"]);
    f.repository.findDeletionBlockers.mockResolvedValueOnce({ pendingPayments: 0, openRefunds: 1 });
    const result = await build(f).execute(NOW, {});
    expect(result.accountsAnonymized).toBe(1);
    expect(f.repository.anonymizeLearner).toHaveBeenCalledTimes(1);
    expect(f.repository.anonymizeLearner).toHaveBeenCalledWith("u-2", NOW);
  });

  it("does not count an account that another run already anonymized", async () => {
    const f = await fixture();
    f.repository.listInactiveLearnerIds.mockResolvedValue(["u-1"]);
    f.repository.anonymizeLearner.mockResolvedValue(false);
    const result = await build(f).execute(NOW, {});
    expect(result.accountsAnonymized).toBe(0);
    expect(f.emit).not.toHaveBeenCalled();
  });
});
