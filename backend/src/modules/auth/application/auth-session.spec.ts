import { PasswordChangedEvent } from "@modules/users/users.events";
import * as argon2 from "argon2";

import type { AuthUserRecord } from "../domain/auth.repository.port";
import { AccountNotActiveError, InvalidCredentialsError } from "../domain/invalid-credentials.error";

import { LoginUseCase } from "./login.use-case";
import { RevokeSessionsOnPasswordChangeListener } from "./revoke-sessions-on-password-change.listener";
import { TokenService } from "./token.service";

jest.mock("argon2", () => ({ verify: jest.fn() }));

const verify = argon2.verify as jest.Mock;

function user(over: Partial<AuthUserRecord> = {}): AuthUserRecord {
  return {
    id: "u1",
    tenantId: "t1",
    type: "COMPANY_USER",
    email: "a@b.c",
    passwordHash: "hash",
    status: "ACTIVE",
    permissions: ["p"],
    roles: ["Formateur"],
    twoFactorEnabled: false,
    ...over,
  };
}

describe("LoginUseCase", () => {
  const originalMandatory = process.env.TWO_FACTOR_MANDATORY;
  afterEach(() => {
    if (originalMandatory === undefined) delete process.env.TWO_FACTOR_MANDATORY;
    else process.env.TWO_FACTOR_MANDATORY = originalMandatory;
    verify.mockReset();
  });

  function setup(found: AuthUserRecord | null) {
    const repo = { findByEmail: jest.fn().mockResolvedValue(found) };
    const tokens = { issueForUser: jest.fn().mockResolvedValue({ accessToken: "a", refreshToken: "r" }) };
    const challenges = { issue: jest.fn().mockResolvedValue({ twoFactor: "VERIFY", challengeToken: "c", expiresInSeconds: 300 }) };
    const useCase = new LoginUseCase(repo as never, tokens as never, challenges as never);
    return { useCase, repo, tokens, challenges };
  }
  const input = { tenantId: "t1", email: "a@b.c", password: "pw" };

  it("refuse un e-mail inconnu sans vérifier de mot de passe", async () => {
    const { useCase } = setup(null);
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(verify).not.toHaveBeenCalled();
  });

  it("refuse un compte sans mot de passe (invité)", async () => {
    const { useCase } = setup(user({ passwordHash: null }));
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("refuse un mauvais mot de passe avec le même message", async () => {
    verify.mockResolvedValue(false);
    const { useCase } = setup(user());
    await expect(useCase.execute(input)).rejects.toThrow("E-mail ou mot de passe incorrect.");
  });

  it("refuse un compte non actif", async () => {
    verify.mockResolvedValue(true);
    const { useCase, tokens } = setup(user({ status: "SUSPENDED" }));
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(AccountNotActiveError);
    expect(tokens.issueForUser).not.toHaveBeenCalled();
  });

  it("émet un défi VERIFY quand la 2FA est activée", async () => {
    verify.mockResolvedValue(true);
    const { useCase, challenges, tokens } = setup(user({ twoFactorEnabled: true }));
    await expect(useCase.execute(input)).resolves.toMatchObject({ twoFactor: "VERIFY" });
    expect(challenges.issue).toHaveBeenCalledWith("u1", "VERIFY");
    expect(tokens.issueForUser).not.toHaveBeenCalled();
  });

  it("émet un défi ENROLL pour un administrateur sans 2FA", async () => {
    verify.mockResolvedValue(true);
    delete process.env.TWO_FACTOR_MANDATORY;
    const { useCase, challenges } = setup(user({ type: "PLATFORM_ADMIN", tenantId: null }));
    await useCase.execute({ ...input, tenantId: null });
    expect(challenges.issue).toHaveBeenCalledWith("u1", "ENROLL");
  });

  it("émet les jetons quand la 2FA est facultative (TWO_FACTOR_MANDATORY=false)", async () => {
    verify.mockResolvedValue(true);
    process.env.TWO_FACTOR_MANDATORY = "false";
    const { useCase, tokens, challenges } = setup(user({ type: "PLATFORM_ADMIN", tenantId: null }));
    await expect(useCase.execute(input)).resolves.toEqual({ accessToken: "a", refreshToken: "r" });
    expect(tokens.issueForUser).toHaveBeenCalled();
    expect(challenges.issue).not.toHaveBeenCalled();
  });
});

describe("RevokeSessionsOnPasswordChangeListener", () => {
  it("révoque tous les jetons de rafraîchissement de l'utilisateur", async () => {
    const repo = { revokeAllRefreshTokens: jest.fn().mockResolvedValue(undefined) };
    await new RevokeSessionsOnPasswordChangeListener(repo as never).handle(new PasswordChangedEvent("u9"));
    expect(repo.revokeAllRefreshTokens).toHaveBeenCalledWith("u9");
  });
});

describe("TokenService - jetons", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  function setup() {
    const repo = {
      storeRefreshTokenHash: jest.fn().mockResolvedValue(undefined),
      isRefreshTokenValid: jest.fn(),
      revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
      findByValidRefreshTokenHash: jest.fn(),
    };
    const jwt = { sign: jest.fn().mockReturnValue("signed") };
    return { repo, jwt, service: new TokenService(jwt as never, repo as never) };
  }
  const payload = { sub: "u1", tenantId: "t1", type: "COMPANY_USER" as const, roles: [], permissions: [] };

  it("signe l'accès (TTL par défaut 15m) et ne stocke que le hash du refresh", async () => {
    delete process.env.JWT_ACCESS_TTL;
    process.env.JWT_ACCESS_SECRET = "s";
    const { service, jwt, repo } = setup();
    const pair = await service.issueTokenPair(payload);
    expect(jwt.sign).toHaveBeenCalledWith(payload, { secret: "s", expiresIn: "15m" });
    expect(pair).toEqual({ accessToken: "signed", refreshToken: expect.stringMatching(/^[0-9a-f]{96}$/) });
    const [userId, hash] = repo.storeRefreshTokenHash.mock.calls[0];
    expect(userId).toBe("u1");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe(pair.refreshToken);
  });

  it("respecte JWT_ACCESS_TTL et JWT_REFRESH_TTL (jours), avec repli sur 7 jours si illisible", async () => {
    process.env.JWT_ACCESS_TTL = "5m";
    process.env.JWT_REFRESH_TTL = "30d";
    const first = setup();
    const before = Date.now();
    await first.service.issueTokenPair(payload);
    expect(first.jwt.sign.mock.calls[0][1].expiresIn).toBe("5m");
    const days = (first.repo.storeRefreshTokenHash.mock.calls[0][2].getTime() - before) / 86_400_000;
    expect(Math.round(days)).toBe(30);

    process.env.JWT_REFRESH_TTL = "abc";
    const second = setup();
    const start = Date.now();
    await second.service.issueTokenPair(payload);
    const fallback = (second.repo.storeRefreshTokenHash.mock.calls[0][2].getTime() - start) / 86_400_000;
    expect(Math.round(fallback)).toBe(7);
  });

  it("issueForUser reprend identité, rôles et permissions du compte", async () => {
    const { service, jwt } = setup();
    await service.issueForUser(user());
    expect(jwt.sign.mock.calls[0][0]).toEqual({
      sub: "u1",
      tenantId: "t1",
      type: "COMPANY_USER",
      roles: ["Formateur"],
      permissions: ["p"],
    });
  });

  it("rotateRefreshToken révoque l'ancien jeton puis en émet un nouveau", async () => {
    const { service, repo } = setup();
    repo.isRefreshTokenValid.mockResolvedValue(true);
    const pair = await service.rotateRefreshToken("u1", "raw", payload);
    expect(repo.revokeRefreshToken).toHaveBeenCalledWith("u1", expect.stringMatching(/^[0-9a-f]{64}$/));
    expect(repo.storeRefreshTokenHash).toHaveBeenCalledTimes(1);
    expect(pair.accessToken).toBe("signed");
  });

  it("rotateRefreshToken refuse un jeton invalide sans rien émettre", async () => {
    const { service, repo } = setup();
    repo.isRefreshTokenValid.mockResolvedValue(false);
    await expect(service.rotateRefreshToken("u1", "raw", payload)).rejects.toThrow("INVALID_REFRESH_TOKEN");
    expect(repo.revokeRefreshToken).not.toHaveBeenCalled();
    expect(repo.storeRefreshTokenHash).not.toHaveBeenCalled();
  });

  it("revoke révoque un jeton connu et ignore silencieusement un jeton inconnu", async () => {
    const { service, repo } = setup();
    repo.findByValidRefreshTokenHash.mockResolvedValueOnce(user());
    await service.revoke("raw");
    expect(repo.revokeRefreshToken).toHaveBeenCalledWith("u1", expect.any(String));

    repo.revokeRefreshToken.mockClear();
    repo.findByValidRefreshTokenHash.mockResolvedValueOnce(null);
    await expect(service.revoke("raw")).resolves.toBeUndefined();
    expect(repo.revokeRefreshToken).not.toHaveBeenCalled();
  });
});
