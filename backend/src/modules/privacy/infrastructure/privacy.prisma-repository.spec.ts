import { PrivacyPrismaRepository } from "./privacy.prisma-repository";

/** Prisma factice : enregistre chaque appel pour vérifier la portée (userId) et les champs sélectionnés. */
function fakePrisma(updateCount = 1) {
  const calls: Array<{ model: string; op: string; args: unknown }> = [];
  const model = (name: string, results: Record<string, unknown> = {}) =>
    new Proxy(
      {},
      {
        get:
          (_t, op: string) =>
          (args: unknown) => {
            calls.push({ model: name, op, args });
            return Promise.resolve(results[op] ?? (op === "findMany" ? [] : { count: 0 }));
          },
      },
    );
  const prisma = {
    user: model("user", {
      findUnique: {
        id: "u-1",
        email: "aya@example.com",
        firstName: "Aya",
        lastName: "Koné",
        phone: null,
        locale: "fr",
        status: "ACTIVE",
        createdAt: new Date("2025-01-01"),
        lastLoginAt: null,
        emailVerifiedAt: null,
      },
      updateMany: { count: updateCount },
    }),
    enrollment: model("enrollment"),
    legalAcceptance: model("legalAcceptance"),
    attendance: model("attendance"),
    notification: model("notification"),
    refreshToken: model("refreshToken"),
    invitationToken: model("invitationToken"),
    certificate: model("certificate"),
    payment: model("payment"),
    refund: model("refund"),
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  };
  return { prisma, calls };
}

describe("PrivacyPrismaRepository.collectLearnerData", () => {
  it("scopes every query to the requester and never selects secrets", async () => {
    const { prisma, calls } = fakePrisma();
    const repository = new PrivacyPrismaRepository(prisma as never);
    const data = await repository.collectLearnerData("u-1", new Date("2026-11-18"));

    expect(data?.profile.email).toBe("aya@example.com");
    const where = calls.map((c) => JSON.stringify((c.args as { where: unknown }).where));
    expect(where).toEqual(
      expect.arrayContaining([
        JSON.stringify({ id: "u-1" }),
        JSON.stringify({ userId: "u-1" }),
        JSON.stringify({ recipientUserId: "u-1" }),
      ]),
    );
    for (const call of calls) {
      expect(JSON.stringify((call.args as { where: unknown }).where)).toContain("u-1");
    }
    const everything = JSON.stringify(calls.map((c) => c.args));
    for (const secret of ["passwordHash", "twoFactorSecret", "rawPayload", "payload", "tokenHash"]) {
      expect(everything).not.toContain(`"${secret}"`);
    }
    expect(JSON.stringify(data)).not.toMatch(/passwordHash|twoFactorSecret|rawPayload/);
  });
});

describe("PrivacyPrismaRepository.anonymizeLearner", () => {
  it("anonymizes in one transaction: identity, secrets, sessions, tokens, notifications, certificate holder name", async () => {
    const { prisma, calls } = fakePrisma(1);
    const repository = new PrivacyPrismaRepository(prisma as never);
    await expect(repository.anonymizeLearner("u-1", new Date("2026-11-18"))).resolves.toBe(true);

    const userUpdate = calls.find((c) => c.model === "user" && c.op === "updateMany");
    expect(userUpdate?.args).toMatchObject({
      where: { id: "u-1", type: "LEARNER", anonymizedAt: null },
      data: {
        firstName: "Compte",
        lastName: "supprimé",
        email: "deleted-u-1@anonymized.invalid",
        phone: null,
        passwordHash: null,
        twoFactorSecret: null,
        status: "DEACTIVATED",
      },
    });
    expect(calls.find((c) => c.model === "refreshToken")?.args).toMatchObject({ where: { userId: "u-1" } });
    expect(calls.find((c) => c.model === "invitationToken")?.op).toBe("deleteMany");
    expect(calls.find((c) => c.model === "notification")?.op).toBe("deleteMany");
    expect(calls.find((c) => c.model === "certificate")?.args).toMatchObject({
      where: { enrollment: { userId: "u-1" } },
      data: { learnerNameSnapshot: "Compte supprimé" },
    });
  });

  it("touches nothing else when the account was already anonymized (double deletion)", async () => {
    const { prisma, calls } = fakePrisma(0);
    const repository = new PrivacyPrismaRepository(prisma as never);
    await expect(repository.anonymizeLearner("u-1", new Date())).resolves.toBe(false);
    expect(calls).toHaveLength(1);
  });
});
