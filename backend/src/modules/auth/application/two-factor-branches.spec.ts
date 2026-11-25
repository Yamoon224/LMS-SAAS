import { NotFoundDomainError } from "@shared/errors";
import * as argon2 from "argon2";

import { TwoFactorRecoveryCodeUsedEvent } from "../auth.events";
import type { AuthUserRecord } from "../domain/auth.repository.port";
import { AccountNotActiveError, InvalidCredentialsError } from "../domain/invalid-credentials.error";
import {
  InvalidChallengeError,
  InvalidTwoFactorCodeError,
  TwoFactorAlreadyEnabledError,
  TwoFactorLockedError,
  TwoFactorMandatoryError,
  TwoFactorNotEnabledError,
  TwoFactorSetupMissingError,
} from "../domain/two-factor.errors";
import type { TwoFactorUserRecord } from "../domain/two-factor.repository.port";

import { TwoFactorChallengeService } from "./two-factor-challenge.service";
import { TwoFactorCodeVerifier } from "./two-factor-code-verifier.service";
import { EnrollmentTwoFactorUseCases, VerifyTwoFactorLoginUseCase } from "./two-factor-login.use-cases";
import {
  DisableTwoFactorUseCase,
  EnableTwoFactorUseCase,
  GetTwoFactorStatusUseCase,
  RegenerateRecoveryCodesUseCase,
  ResetTwoFactorUseCase,
} from "./two-factor-settings.use-cases";

jest.mock("argon2", () => ({ verify: jest.fn(), hash: jest.fn(async (value: string) => `h:${value}`) }));
jest.mock("@shared/crypto/secrets-cipher", () => ({
  decryptSecret: jest.fn(() => "JBSWY3DPEHPK3PXP"),
  encryptSecret: jest.fn((value: string) => `enc:${value}`),
}));
jest.mock("../domain/totp", () => ({
  ...jest.requireActual("../domain/totp"),
  verifyTotp: jest.fn(),
}));

import { verifyTotp } from "../domain/totp";

const argonVerify = argon2.verify as jest.Mock;
const totp = verifyTotp as jest.Mock;

function tfUser(over: Partial<TwoFactorUserRecord> = {}): TwoFactorUserRecord {
  const base: AuthUserRecord = {
    id: "u1",
    tenantId: "t1",
    type: "LEARNER",
    email: "a@b.c",
    passwordHash: "hash",
    status: "ACTIVE",
    permissions: [],
    roles: [],
    twoFactorEnabled: true,
  };
  return { ...base, twoFactorSecretEncrypted: "secret", lastStep: null, failedAttempts: 0, lockedUntil: null, ...over };
}

function repoMock(user: TwoFactorUserRecord | null = tfUser()) {
  return {
    findUser: jest.fn().mockResolvedValue(user),
    savePendingSecret: jest.fn(),
    enable: jest.fn().mockResolvedValue(undefined),
    disable: jest.fn().mockResolvedValue(undefined),
    resetAll: jest.fn().mockResolvedValue(undefined),
    replaceRecoveryCodes: jest.fn().mockResolvedValue(undefined),
    listUnusedRecoveryCodes: jest.fn().mockResolvedValue([]),
    consumeRecoveryCode: jest.fn().mockResolvedValue(true),
    acceptStep: jest.fn().mockResolvedValue(true),
    registerFailure: jest.fn().mockResolvedValue(null),
    resetFailures: jest.fn().mockResolvedValue(undefined),
    createChallenge: jest.fn().mockResolvedValue(undefined),
    findActiveChallenge: jest.fn(),
    consumeChallenge: jest.fn(),
    deleteChallenges: jest.fn(),
  };
}

beforeEach(() => {
  delete process.env.TWO_FACTOR_MANDATORY;
  argonVerify.mockReset();
  totp.mockReset();
});

describe("TwoFactorChallengeService", () => {
  it("émet un jeton opaque dont seul le hash est stocké, valable 5 minutes", async () => {
    const repo = repoMock();
    const now = new Date("2026-01-01T00:00:00Z");
    const issued = await new TwoFactorChallengeService(repo as never).issue("u1", "VERIFY", now);
    expect(issued).toEqual({ twoFactor: "VERIFY", challengeToken: expect.stringMatching(/^[0-9a-f]{64}$/), expiresInSeconds: 300 });
    const [userId, purpose, hash, expiresAt] = repo.createChallenge.mock.calls[0];
    expect([userId, purpose]).toEqual(["u1", "VERIFY"]);
    expect(hash).not.toBe(issued.challengeToken);
    expect(expiresAt.getTime() - now.getTime()).toBe(300_000);
  });

  it("resolve refuse un défi absent ou d'une autre finalité", async () => {
    const repo = repoMock();
    const service = new TwoFactorChallengeService(repo as never);
    repo.findActiveChallenge.mockResolvedValueOnce(null);
    await expect(service.resolve("t", "VERIFY")).rejects.toBeInstanceOf(InvalidChallengeError);
    repo.findActiveChallenge.mockResolvedValueOnce({ id: "c", userId: "u1", purpose: "ENROLL" });
    await expect(service.resolve("t", "VERIFY")).rejects.toBeInstanceOf(InvalidChallengeError);
    const challenge = { id: "c", userId: "u1", purpose: "VERIFY" };
    repo.findActiveChallenge.mockResolvedValueOnce(challenge);
    await expect(service.resolve("t", "VERIFY")).resolves.toBe(challenge);
  });

  it("consume refuse un défi déjà consommé", async () => {
    const repo = repoMock();
    const service = new TwoFactorChallengeService(repo as never);
    repo.consumeChallenge.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(service.consume({ id: "c", userId: "u1", purpose: "VERIFY" })).resolves.toBeUndefined();
    await expect(service.consume({ id: "c", userId: "u1", purpose: "VERIFY" })).rejects.toBeInstanceOf(InvalidChallengeError);
  });
});

describe("TwoFactorCodeVerifier", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("refuse même un bon code tant que le verrou dure, puis l'accepte une fois expiré", async () => {
    const repo = repoMock();
    const verifier = new TwoFactorCodeVerifier(repo as never);
    totp.mockReturnValue({ valid: true, step: 5 });
    const locked = tfUser({ lockedUntil: new Date(now.getTime() + 1000) });
    await expect(verifier.verify(locked, "123456", now)).rejects.toBeInstanceOf(TwoFactorLockedError);
    await expect(verifier.verifyTotpOnly(locked, "123456", now)).rejects.toBeInstanceOf(TwoFactorLockedError);
    expect(repo.acceptStep).not.toHaveBeenCalled();
    const expired = tfUser({ lockedUntil: new Date(now.getTime() - 1000) });
    await expect(verifier.verify(expired, "123 456", now)).resolves.toBe("TOTP");
    expect(repo.acceptStep).toHaveBeenCalledWith("u1", 5);
    expect(repo.resetFailures).toHaveBeenCalledWith("u1");
  });

  it("compte un échec quand le TOTP est invalide ou rejoué (acceptStep faux)", async () => {
    const repo = repoMock();
    const verifier = new TwoFactorCodeVerifier(repo as never);
    totp.mockReturnValue({ valid: false });
    await expect(verifier.verify(tfUser(), "000000", now)).rejects.toBeInstanceOf(InvalidTwoFactorCodeError);
    totp.mockReturnValue({ valid: true, step: 9 });
    repo.acceptStep.mockResolvedValue(false);
    await expect(verifier.verify(tfUser(), "000000", now)).rejects.toBeInstanceOf(InvalidTwoFactorCodeError);
    expect(repo.registerFailure).toHaveBeenCalledTimes(2);
    expect(repo.registerFailure).toHaveBeenCalledWith("u1", 5, new Date(now.getTime() + 15 * 60_000));
    expect(repo.resetFailures).not.toHaveBeenCalled();
  });

  it("verrouille quand registerFailure pose un verrou", async () => {
    const repo = repoMock();
    repo.registerFailure.mockResolvedValue(new Date());
    totp.mockReturnValue({ valid: false });
    await expect(new TwoFactorCodeVerifier(repo as never).verify(tfUser(), "000000", now)).rejects.toBeInstanceOf(TwoFactorLockedError);
  });

  it("refuse un TOTP quand aucun secret n'est enregistré", async () => {
    const repo = repoMock();
    const verifier = new TwoFactorCodeVerifier(repo as never);
    await expect(verifier.verify(tfUser({ twoFactorSecretEncrypted: null }), "123456", now)).rejects.toBeInstanceOf(
      InvalidTwoFactorCodeError,
    );
    expect(totp).not.toHaveBeenCalled();
  });

  it("refuse un code de forme inconnue", async () => {
    const repo = repoMock();
    await expect(new TwoFactorCodeVerifier(repo as never).verify(tfUser(), "hello", now)).rejects.toBeInstanceOf(
      InvalidTwoFactorCodeError,
    );
    expect(repo.listUnusedRecoveryCodes).not.toHaveBeenCalled();
  });

  it("accepte un code de récupération non utilisé et le consomme", async () => {
    const repo = repoMock();
    repo.listUnusedRecoveryCodes.mockResolvedValue([
      { id: "r1", codeHash: "bad" },
      { id: "r2", codeHash: "good" },
    ]);
    argonVerify.mockImplementation(async (hash: string) => hash === "good");
    await expect(new TwoFactorCodeVerifier(repo as never).verify(tfUser(), "abcde-fghjk", now)).resolves.toBe("RECOVERY");
    expect(argonVerify).toHaveBeenCalledWith("good", "ABCDEFGHJK");
    expect(repo.consumeRecoveryCode).toHaveBeenCalledWith("r2");
  });

  it("refuse un code de récupération inconnu", async () => {
    const repo = repoMock();
    repo.listUnusedRecoveryCodes.mockResolvedValue([{ id: "r1", codeHash: "bad" }]);
    argonVerify.mockResolvedValue(false);
    await expect(new TwoFactorCodeVerifier(repo as never).verify(tfUser(), "ABCDE-FGHJK", now)).rejects.toBeInstanceOf(
      InvalidTwoFactorCodeError,
    );
    expect(repo.consumeRecoveryCode).not.toHaveBeenCalled();
  });

  it("verifyTotpOnly retourne le pas, refuse un code non numérique", async () => {
    const repo = repoMock();
    const verifier = new TwoFactorCodeVerifier(repo as never);
    totp.mockReturnValue({ valid: true, step: 3 });
    await expect(verifier.verifyTotpOnly(tfUser(), "123456", now)).resolves.toBe(3);
    await expect(verifier.verifyTotpOnly(tfUser(), "ABCDE-FGHJK", now)).rejects.toBeInstanceOf(InvalidTwoFactorCodeError);
  });
});

describe("VerifyTwoFactorLoginUseCase", () => {
  function setup(user: TwoFactorUserRecord | null, method: "TOTP" | "RECOVERY" = "TOTP") {
    const repo = repoMock(user);
    const challenges = { resolve: jest.fn().mockResolvedValue({ id: "c", userId: "u1", purpose: "VERIFY" }), consume: jest.fn() };
    const verifier = { verify: jest.fn().mockResolvedValue(method) };
    const tokens = { issueForUser: jest.fn().mockResolvedValue({ accessToken: "a", refreshToken: "r" }) };
    const events = { emit: jest.fn() };
    const useCase = new VerifyTwoFactorLoginUseCase(repo as never, challenges as never, verifier as never, tokens as never, events as never);
    return { useCase, challenges, verifier, tokens, events };
  }

  it("consomme le défi, délivre les jetons et n'émet rien pour un code TOTP", async () => {
    const { useCase, challenges, tokens, events } = setup(tfUser());
    await expect(useCase.execute({ challengeToken: "t", code: "123456" })).resolves.toEqual({ accessToken: "a", refreshToken: "r" });
    expect(challenges.resolve).toHaveBeenCalledWith("t", "VERIFY");
    expect(challenges.consume).toHaveBeenCalled();
    expect(tokens.issueForUser).toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it("trace l'usage d'un code de récupération", async () => {
    const { useCase, events } = setup(tfUser(), "RECOVERY");
    await useCase.execute({ challengeToken: "t", code: "ABCDE-FGHJK" });
    expect(events.emit).toHaveBeenCalledWith("auth.two-factor-recovery-used", expect.any(TwoFactorRecoveryCodeUsedEvent));
    expect(events.emit.mock.calls[0][1]).toMatchObject({ userId: "u1", tenantId: "t1" });
  });

  it("refuse un compte inconnu, non actif, ou sans 2FA activée", async () => {
    await expect(setup(null).useCase.execute({ challengeToken: "t", code: "1" })).rejects.toBeInstanceOf(InvalidChallengeError);
    await expect(setup(tfUser({ status: "SUSPENDED" })).useCase.execute({ challengeToken: "t", code: "1" })).rejects.toBeInstanceOf(
      AccountNotActiveError,
    );
    const off = setup(tfUser({ twoFactorEnabled: false }));
    await expect(off.useCase.execute({ challengeToken: "t", code: "1" })).rejects.toBeInstanceOf(InvalidChallengeError);
    expect(off.tokens.issueForUser).not.toHaveBeenCalled();
  });
});

describe("EnrollmentTwoFactorUseCases", () => {
  function setup() {
    const repo = repoMock(tfUser({ twoFactorEnabled: false }));
    const challenges = { resolve: jest.fn().mockResolvedValue({ id: "c", userId: "u1", purpose: "ENROLL" }), consume: jest.fn() };
    const begin = { execute: jest.fn().mockResolvedValue({ secret: "S", otpauthUri: "o", qrCodeDataUrl: "q" }) };
    const enable = { execute: jest.fn().mockResolvedValue({ recoveryCodes: ["A"] }) };
    const tokens = { issueForUser: jest.fn().mockResolvedValue({ accessToken: "a", refreshToken: "r" }) };
    return {
      repo,
      challenges,
      begin,
      enable,
      useCase: new EnrollmentTwoFactorUseCases(repo as never, challenges as never, begin as never, enable as never, tokens as never),
    };
  }

  it("setup résout le défi ENROLL et délègue", async () => {
    const { useCase, challenges, begin } = setup();
    await expect(useCase.setup("t")).resolves.toEqual({ secret: "S", otpauthUri: "o", qrCodeDataUrl: "q" });
    expect(challenges.resolve).toHaveBeenCalledWith("t", "ENROLL");
    expect(begin.execute).toHaveBeenCalledWith("u1");
  });

  it("complete active, consomme le défi et renvoie jetons + codes de récupération", async () => {
    const { useCase, enable, challenges } = setup();
    await expect(useCase.complete({ challengeToken: "t", code: "123456" })).resolves.toEqual({
      accessToken: "a",
      refreshToken: "r",
      recoveryCodes: ["A"],
    });
    expect(enable.execute).toHaveBeenCalledWith("u1", "123456");
    expect(challenges.consume).toHaveBeenCalled();
  });

  it("complete ne consomme pas le défi si l'activation échoue", async () => {
    const { useCase, enable, challenges } = setup();
    enable.execute.mockRejectedValue(new InvalidTwoFactorCodeError("x"));
    await expect(useCase.complete({ challengeToken: "t", code: "1" })).rejects.toBeInstanceOf(InvalidTwoFactorCodeError);
    expect(challenges.consume).not.toHaveBeenCalled();
  });
});

describe("EnableTwoFactorUseCase", () => {
  const build = (user: TwoFactorUserRecord | null) => {
    const repo = repoMock(user);
    const verifier = { verifyTotpOnly: jest.fn().mockResolvedValue(7) };
    const events = { emit: jest.fn() };
    return { repo, verifier, events, useCase: new EnableTwoFactorUseCase(repo as never, verifier as never, events as never) };
  };

  it("refuse un compte inconnu ou non actif (404), déjà activé, ou sans secret en attente", async () => {
    await expect(build(null).useCase.execute("u1", "1")).rejects.toBeInstanceOf(NotFoundDomainError);
    await expect(build(tfUser({ status: "SUSPENDED" })).useCase.execute("u1", "1")).rejects.toBeInstanceOf(NotFoundDomainError);
    await expect(build(tfUser()).useCase.execute("u1", "1")).rejects.toBeInstanceOf(TwoFactorAlreadyEnabledError);
    await expect(
      build(tfUser({ twoFactorEnabled: false, twoFactorSecretEncrypted: null })).useCase.execute("u1", "1"),
    ).rejects.toBeInstanceOf(TwoFactorSetupMissingError);
  });

  it("active, enregistre 8 hashs de codes de récupération et publie l'événement", async () => {
    const { useCase, repo, events } = build(tfUser({ twoFactorEnabled: false }));
    const { recoveryCodes } = await useCase.execute("u1", "123456");
    expect(recoveryCodes).toHaveLength(8);
    expect(repo.enable).toHaveBeenCalledWith("u1", 7);
    const hashes = repo.replaceRecoveryCodes.mock.calls[0][1] as string[];
    expect(hashes).toHaveLength(8);
    expect(hashes.every((hash) => hash.startsWith("h:"))).toBe(true);
    expect(events.emit).toHaveBeenCalledWith("auth.two-factor-enabled", expect.objectContaining({ userId: "u1", tenantId: "t1" }));
  });
});

describe("DisableTwoFactorUseCase / RegenerateRecoveryCodesUseCase", () => {
  const verifier = () => ({ verify: jest.fn().mockResolvedValue("TOTP") });

  it("désactivation : refus obligatoire, non activée, mot de passe absent ou faux", async () => {
    const events = { emit: jest.fn() };
    const run = (user: TwoFactorUserRecord) =>
      new DisableTwoFactorUseCase(repoMock(user) as never, verifier() as never, events as never).execute({
        userId: "u1",
        password: "pw",
        code: "123456",
      });
    await expect(run(tfUser({ type: "PLATFORM_ADMIN" }))).rejects.toBeInstanceOf(TwoFactorMandatoryError);
    await expect(run(tfUser({ twoFactorEnabled: false }))).rejects.toBeInstanceOf(TwoFactorNotEnabledError);
    await expect(run(tfUser({ passwordHash: null }))).rejects.toBeInstanceOf(InvalidCredentialsError);
    argonVerify.mockResolvedValue(false);
    await expect(run(tfUser())).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(events.emit).not.toHaveBeenCalled();
  });

  it("désactivation réussie : efface et publie l'événement", async () => {
    argonVerify.mockResolvedValue(true);
    const repo = repoMock(tfUser());
    const events = { emit: jest.fn() };
    const v = verifier();
    await new DisableTwoFactorUseCase(repo as never, v as never, events as never).execute({ userId: "u1", password: "pw", code: "123456" });
    expect(v.verify).toHaveBeenCalled();
    expect(repo.disable).toHaveBeenCalledWith("u1");
    expect(events.emit).toHaveBeenCalledWith("auth.two-factor-disabled", expect.objectContaining({ userId: "u1" }));
  });

  it("régénération : refus si 2FA non activée ; sinon nouveaux hashs", async () => {
    const input = { userId: "u1", password: "pw", code: "123456" };
    await expect(
      new RegenerateRecoveryCodesUseCase(repoMock(tfUser({ twoFactorEnabled: false })) as never, verifier() as never).execute(input),
    ).rejects.toBeInstanceOf(TwoFactorNotEnabledError);
    argonVerify.mockResolvedValue(true);
    const repo = repoMock(tfUser());
    const { recoveryCodes } = await new RegenerateRecoveryCodesUseCase(repo as never, verifier() as never).execute(input);
    expect(recoveryCodes).toHaveLength(8);
    expect(repo.replaceRecoveryCodes).toHaveBeenCalledWith("u1", expect.any(Array));
  });
});

describe("GetTwoFactorStatusUseCase", () => {
  it("compte les codes restants seulement si la 2FA est activée", async () => {
    const on = repoMock(tfUser({ type: "PLATFORM_ADMIN" }));
    on.listUnusedRecoveryCodes.mockResolvedValue([{ id: "a", codeHash: "x" }]);
    await expect(new GetTwoFactorStatusUseCase(on as never).execute("u1")).resolves.toEqual({
      enabled: true,
      required: true,
      recoveryCodesRemaining: 1,
    });
    const off = repoMock(tfUser({ twoFactorEnabled: false }));
    await expect(new GetTwoFactorStatusUseCase(off as never).execute("u1")).resolves.toEqual({
      enabled: false,
      required: false,
      recoveryCodesRemaining: 0,
    });
    expect(off.listUnusedRecoveryCodes).not.toHaveBeenCalled();
  });
});

describe("ResetTwoFactorUseCase - périmètre", () => {
  const run = (target: TwoFactorUserRecord | null, input: { targetUserId: string; actorUserId: string; scopeTenantId?: string }) => {
    const repo = repoMock(target);
    const auth = { revokeAllRefreshTokens: jest.fn().mockResolvedValue(undefined) };
    const events = { emit: jest.fn() };
    return { repo, auth, events, promise: new ResetTwoFactorUseCase(repo as never, auth as never, events as never).execute(input) };
  };

  it("refuse une cible COMPANY_USER d'un autre tenant ou un admin quand un périmètre est donné", async () => {
    const other = run(tfUser({ type: "COMPANY_USER", tenantId: "t2" }), { targetUserId: "u1", actorUserId: "a", scopeTenantId: "t1" });
    await expect(other.promise).rejects.toBeInstanceOf(NotFoundDomainError);
    const admin = run(tfUser({ type: "PLATFORM_ADMIN", tenantId: null }), { targetUserId: "u1", actorUserId: "a", scopeTenantId: "t1" });
    await expect(admin.promise).rejects.toBeInstanceOf(NotFoundDomainError);
    expect(other.repo.resetAll).not.toHaveBeenCalled();
  });

  it("accepte un compte interne du tenant visé", async () => {
    const ok = run(tfUser({ type: "COMPANY_USER", tenantId: "t1" }), { targetUserId: "u1", actorUserId: "a", scopeTenantId: "t1" });
    await ok.promise;
    expect(ok.repo.resetAll).toHaveBeenCalledWith("u1");
    expect(ok.auth.revokeAllRefreshTokens).toHaveBeenCalledWith("u1");
    expect(ok.events.emit).toHaveBeenCalledWith("auth.two-factor-reset", expect.objectContaining({ targetUserId: "u1", actorId: "a" }));
  });

  it("refuse une cible introuvable", async () => {
    await expect(run(null, { targetUserId: "u1", actorUserId: "a" }).promise).rejects.toBeInstanceOf(NotFoundDomainError);
  });
});
