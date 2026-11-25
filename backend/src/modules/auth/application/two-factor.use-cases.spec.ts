/* eslint-disable @typescript-eslint/no-non-null-assertion, max-lines-per-function -- tests : valeurs construites par le test, blocs describe longs */
import type { EventEmitter2 } from "@nestjs/event-emitter";
import { decryptSecret } from "@shared/crypto/secrets-cipher";
import * as argon2 from "argon2";

import type { AuthRepositoryPort } from "../domain/auth.repository.port";
import { base32Decode } from "../domain/base32";
import { totpAtStep, totpStepAt } from "../domain/totp";
import type { ChallengePurpose } from "../domain/two-factor.policy";
import type {
  ChallengeRecord,
  QrCodeGeneratorPort,
  RecoveryCodeRecord,
  TwoFactorRepositoryPort,
  TwoFactorUserRecord,
} from "../domain/two-factor.repository.port";

import { LoginUseCase } from "./login.use-case";
import type { TokenService } from "./token.service";
import { TwoFactorChallengeService } from "./two-factor-challenge.service";
import { TwoFactorCodeVerifier } from "./two-factor-code-verifier.service";
import { EnrollmentTwoFactorUseCases, VerifyTwoFactorLoginUseCase } from "./two-factor-login.use-cases";
import {
  BeginTwoFactorSetupUseCase,
  DisableTwoFactorUseCase,
  EnableTwoFactorUseCase,
  GetTwoFactorStatusUseCase,
  RegenerateRecoveryCodesUseCase,
  ResetTwoFactorUseCase,
} from "./two-factor-settings.use-cases";

// argon2 (64 Mo / calcul) est lent sur une machine chargée : 8 codes hachés à chaque activation.
jest.setTimeout(120_000);

process.env.SECRETS_ENCRYPTION_KEY = "test-master-key";

const PASSWORD = "S3cret-password!";

/** Dépôt en mémoire qui reproduit la sémantique (conditionnelle) des écritures du dépôt Prisma. */
class FakeRepository implements TwoFactorRepositoryPort {
  users = new Map<string, TwoFactorUserRecord>();
  codes = new Map<string, { userId: string; codeHash: string; used: boolean }>();
  challenges = new Map<string, ChallengeRecord & { tokenHash: string; expiresAt: Date; consumed: boolean }>();
  private seq = 0;

  async findUser(userId: string) {
    const user = this.users.get(userId);
    return user ? { ...user } : null;
  }
  async savePendingSecret(userId: string, encryptedSecret: string) {
    Object.assign(this.users.get(userId)!, { twoFactorSecretEncrypted: encryptedSecret, twoFactorEnabled: false, lastStep: null });
  }
  async enable(userId: string, lastStep: number) {
    Object.assign(this.users.get(userId)!, { twoFactorEnabled: true, lastStep, failedAttempts: 0, lockedUntil: null });
  }
  async disable(userId: string) {
    await this.resetAll(userId);
  }
  async resetAll(userId: string) {
    Object.assign(this.users.get(userId)!, {
      twoFactorSecretEncrypted: null,
      twoFactorEnabled: false,
      lastStep: null,
      failedAttempts: 0,
      lockedUntil: null,
    });
    for (const [id, code] of this.codes) if (code.userId === userId) this.codes.delete(id);
    for (const [id, c] of this.challenges) if (c.userId === userId) this.challenges.delete(id);
  }
  async replaceRecoveryCodes(userId: string, codeHashes: string[]) {
    for (const [id, code] of this.codes) if (code.userId === userId) this.codes.delete(id);
    for (const codeHash of codeHashes) this.codes.set(`c${(this.seq += 1)}`, { userId, codeHash, used: false });
  }
  async listUnusedRecoveryCodes(userId: string): Promise<RecoveryCodeRecord[]> {
    return [...this.codes.entries()]
      .filter(([, c]) => c.userId === userId && !c.used)
      .map(([id, c]) => ({ id, codeHash: c.codeHash }));
  }
  async consumeRecoveryCode(codeId: string) {
    const code = this.codes.get(codeId);
    if (!code || code.used) return false;
    code.used = true;
    return true;
  }
  async acceptStep(userId: string, step: number) {
    const user = this.users.get(userId)!;
    if (user.lastStep !== null && user.lastStep >= step) return false;
    user.lastStep = step;
    return true;
  }
  async registerFailure(userId: string, maxAttempts: number, lockUntil: Date) {
    const user = this.users.get(userId)!;
    user.failedAttempts += 1;
    if (user.failedAttempts < maxAttempts) return null;
    user.failedAttempts = 0;
    user.lockedUntil = lockUntil;
    return lockUntil;
  }
  async resetFailures(userId: string) {
    Object.assign(this.users.get(userId)!, { failedAttempts: 0, lockedUntil: null });
  }
  async createChallenge(userId: string, purpose: ChallengePurpose, tokenHash: string, expiresAt: Date) {
    this.challenges.set(`ch${(this.seq += 1)}`, { id: `ch${this.seq}`, userId, purpose, tokenHash, expiresAt, consumed: false });
  }
  async findActiveChallenge(tokenHash: string, now: Date) {
    const found = [...this.challenges.values()].find(
      (c) => c.tokenHash === tokenHash && !c.consumed && c.expiresAt.getTime() > now.getTime(),
    );
    return found ? { id: found.id, userId: found.userId, purpose: found.purpose } : null;
  }
  async consumeChallenge(challengeId: string) {
    const challenge = this.challenges.get(challengeId);
    if (!challenge || challenge.consumed) return false;
    challenge.consumed = true;
    return true;
  }
  async deleteChallenges(userId: string) {
    for (const [id, c] of this.challenges) if (c.userId === userId) this.challenges.delete(id);
  }
}

interface UserOverrides extends Partial<TwoFactorUserRecord> {
  id: string;
}

async function setup() {
  const repository = new FakeRepository();
  const passwordHash = await argon2.hash(PASSWORD);
  const addUser = (overrides: UserOverrides) =>
    repository.users.set(overrides.id, {
      tenantId: null,
      type: "PLATFORM_ADMIN",
      email: `${overrides.id}@example.com`,
      passwordHash,
      status: "ACTIVE",
      permissions: [],
      roles: [],
      twoFactorEnabled: false,
      twoFactorSecretEncrypted: null,
      lastStep: null,
      failedAttempts: 0,
      lockedUntil: null,
      ...overrides,
    });

  const events: Array<{ name: string; payload: unknown }> = [];
  const eventEmitter = { emit: jest.fn((name: string, payload: unknown) => events.push({ name, payload })) } as unknown as EventEmitter2;
  const revokeAllRefreshTokens = jest.fn();
  const authRepository = {
    findByEmail: jest.fn(async (_tenant: string | null, email: string) => {
      const user = [...repository.users.values()].find((u) => u.email === email);
      return user ? { ...user } : null;
    }),
    revokeAllRefreshTokens,
  } as unknown as AuthRepositoryPort;
  const tokenService = {
    issueForUser: jest.fn(async (user: { id: string }) => ({ accessToken: `access-${user.id}`, refreshToken: "refresh" })),
  } as unknown as TokenService;
  const qr = { toDataUrl: jest.fn(async () => "data:image/png;base64,AAA") } as unknown as QrCodeGeneratorPort;

  const challenges = new TwoFactorChallengeService(repository);
  const verifier = new TwoFactorCodeVerifier(repository);
  const beginSetup = new BeginTwoFactorSetupUseCase(repository, qr);
  const enable = new EnableTwoFactorUseCase(repository, verifier, eventEmitter);

  return {
    repository,
    addUser,
    events,
    revokeAllRefreshTokens,
    challenges,
    verifier,
    beginSetup,
    enable,
    login: new LoginUseCase(authRepository, tokenService, challenges),
    verifyLogin: new VerifyTwoFactorLoginUseCase(repository, challenges, verifier, tokenService, eventEmitter),
    enrollment: new EnrollmentTwoFactorUseCases(repository, challenges, beginSetup, enable, tokenService),
    disable: new DisableTwoFactorUseCase(repository, verifier, eventEmitter),
    regenerate: new RegenerateRecoveryCodesUseCase(repository, verifier),
    status: new GetTwoFactorStatusUseCase(repository),
    reset: new ResetTwoFactorUseCase(repository, authRepository, eventEmitter),
    qr,
  };
}

/** Code TOTP valide « maintenant » (+ delta pas) pour l'utilisateur, d'après son secret chiffré stocké. */
function currentCode(repository: FakeRepository, userId: string, delta = 0): string {
  const secret = base32Decode(decryptSecret(repository.users.get(userId)!.twoFactorSecretEncrypted!));
  return totpAtStep(secret, totpStepAt(Date.now()) + delta);
}

/** Active la 2FA pour un utilisateur existant et rend ses codes de récupération. */
async function enrollUser(ctx: Awaited<ReturnType<typeof setup>>, userId: string): Promise<string[]> {
  await ctx.beginSetup.execute(userId);
  const { recoveryCodes } = await ctx.enable.execute(userId, currentCode(ctx.repository, userId));
  return recoveryCodes;
}

describe("connexion : défis 2FA", () => {
  it("garde la réponse d'avant (jetons) pour un compte non soumis à l'obligation sans 2FA", async () => {
    const ctx = await setup();
    ctx.addUser({ id: "learner", type: "LEARNER", tenantId: "t1", roles: ["Apprenant"] });
    await expect(ctx.login.execute({ tenantId: "t1", email: "learner@example.com", password: PASSWORD })).resolves.toEqual({
      accessToken: "access-learner",
      refreshToken: "refresh",
    });
  });

  it("n'émet aucun jeton mais un défi d'enrôlement pour un admin sans 2FA", async () => {
    const ctx = await setup();
    ctx.addUser({ id: "adm" });
    const result = await ctx.login.execute({ tenantId: null, email: "adm@example.com", password: PASSWORD });
    expect(result).toEqual({ twoFactor: "ENROLL", challengeToken: expect.stringMatching(/^[0-9a-f]{64}$/), expiresInSeconds: 300 });
    expect(result).not.toHaveProperty("accessToken");
  });

  it("exige l'enrôlement du propriétaire d'entreprise, pas celui d'un gestionnaire", async () => {
    const ctx = await setup();
    ctx.addUser({ id: "own", type: "COMPANY_USER", tenantId: "t1", roles: ["Propriétaire d'entreprise"] });
    ctx.addUser({ id: "mgr", type: "COMPANY_USER", tenantId: "t1", roles: ["Gestionnaire"] });
    expect(await ctx.login.execute({ tenantId: "t1", email: "own@example.com", password: PASSWORD })).toMatchObject({ twoFactor: "ENROLL" });
    expect(await ctx.login.execute({ tenantId: "t1", email: "mgr@example.com", password: PASSWORD })).toHaveProperty("accessToken");
  });

  it("émet un défi VERIFY (pas de jeton) quand la 2FA est activée, même volontairement", async () => {
    const ctx = await setup();
    ctx.addUser({ id: "learner", type: "LEARNER", tenantId: "t1", roles: ["Apprenant"] });
    await enrollUser(ctx, "learner");
    const result = await ctx.login.execute({ tenantId: "t1", email: "learner@example.com", password: PASSWORD });
    expect(result).toMatchObject({ twoFactor: "VERIFY" });
    expect(result).not.toHaveProperty("accessToken");
  });

  it("ne délivre aucun défi avec un mauvais mot de passe", async () => {
    const ctx = await setup();
    ctx.addUser({ id: "adm" });
    await expect(ctx.login.execute({ tenantId: null, email: "adm@example.com", password: "wrong-password" })).rejects.toThrow();
    expect(ctx.repository.challenges.size).toBe(0);
  });
});

describe("enrôlement obligatoire", () => {
  async function challengeFor(ctx: Awaited<ReturnType<typeof setup>>) {
    const result = await ctx.login.execute({ tenantId: null, email: "adm@example.com", password: PASSWORD });
    return (result as { challengeToken: string }).challengeToken;
  }

  it("setup puis confirmation : renvoie secret/QR, 8 codes de récupération et la session, et consomme le défi", async () => {
    const ctx = await setup();
    ctx.addUser({ id: "adm" });
    const token = await challengeFor(ctx);

    const setupResult = await ctx.enrollment.setup(token);
    expect(setupResult.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(setupResult.otpauthUri).toContain("otpauth://totp/");
    expect(setupResult.qrCodeDataUrl).toMatch(/^data:image\/png/);
    // Le secret stocké est chiffré : jamais le Base32 en clair.
    expect(ctx.repository.users.get("adm")!.twoFactorSecretEncrypted).not.toContain(setupResult.secret);

    const done = await ctx.enrollment.complete({ challengeToken: token, code: currentCode(ctx.repository, "adm") });
    expect(done.accessToken).toBe("access-adm");
    expect(done.recoveryCodes).toHaveLength(8);
    expect(ctx.repository.users.get("adm")!.twoFactorEnabled).toBe(true);
    expect([...ctx.repository.codes.values()].every((c) => c.codeHash.startsWith("$argon2"))).toBe(true);
    expect(ctx.events.map((e) => e.name)).toContain("auth.two-factor-enabled");

    // Défi consommé : un rejeu est refusé.
    await expect(ctx.enrollment.setup(token)).rejects.toMatchObject({ code: "DEFI_2FA_INVALIDE" });
  });

  it("refuse la confirmation sans setup préalable et avec un mauvais code", async () => {
    const ctx = await setup();
    ctx.addUser({ id: "adm" });
    const token = await challengeFor(ctx);
    await expect(ctx.enrollment.complete({ challengeToken: token, code: "123456" })).rejects.toMatchObject({
      code: "2FA_CONFIGURATION_ABSENTE",
    });
    await ctx.enrollment.setup(token);
    await expect(ctx.enrollment.complete({ challengeToken: token, code: "000000" })).rejects.toMatchObject({ code: "CODE_2FA_INVALIDE" });
    expect(ctx.repository.users.get("adm")!.twoFactorEnabled).toBe(false);
  });

  it("n'accepte pas un défi VERIFY pour l'enrôlement, ni un défi ENROLL pour la vérification", async () => {
    const ctx = await setup();
    ctx.addUser({ id: "adm" });
    ctx.addUser({ id: "learner", type: "LEARNER", roles: ["Apprenant"] });
    await enrollUser(ctx, "learner");
    const verifyToken = ((await ctx.challenges.issue("learner", "VERIFY")) as { challengeToken: string }).challengeToken;
    await expect(ctx.enrollment.setup(verifyToken)).rejects.toMatchObject({ code: "DEFI_2FA_INVALIDE" });

    const enrollToken = await challengeFor(ctx);
    await expect(ctx.verifyLogin.execute({ challengeToken: enrollToken, code: "123456" })).rejects.toMatchObject({
      code: "DEFI_2FA_INVALIDE",
    });
  });

  it("refuse un défi expiré (5 minutes) et un jeton inconnu", async () => {
    const ctx = await setup();
    ctx.addUser({ id: "adm" });
    const issued = await ctx.challenges.issue("adm", "ENROLL", new Date(Date.now() - 6 * 60_000));
    await expect(ctx.enrollment.setup(issued.challengeToken)).rejects.toMatchObject({ code: "DEFI_2FA_INVALIDE" });
    await expect(ctx.enrollment.setup("a".repeat(64))).rejects.toMatchObject({ code: "DEFI_2FA_INVALIDE" });
  });

  it("refuse le setup/enable d'un compte qui a déjà la 2FA (le secret ne peut pas être écrasé)", async () => {
    const ctx = await setup();
    ctx.addUser({ id: "adm" });
    await enrollUser(ctx, "adm");
    await expect(ctx.beginSetup.execute("adm")).rejects.toMatchObject({ code: "2FA_DEJA_ACTIVEE" });
    await expect(ctx.enable.execute("adm", "123456")).rejects.toMatchObject({ code: "2FA_DEJA_ACTIVEE" });
  });

  it("refuse l'enrôlement d'un compte suspendu", async () => {
    const ctx = await setup();
    ctx.addUser({ id: "adm" });
    const token = await challengeFor(ctx);
    ctx.repository.users.get("adm")!.status = "SUSPENDED";
    await expect(ctx.enrollment.setup(token)).rejects.toThrow();
  });
});

describe("vérification à la connexion", () => {
  async function enrolledAdmin() {
    const ctx = await setup();
    ctx.addUser({ id: "adm" });
    const recoveryCodes = await enrollUser(ctx, "adm");
    // Le premier code a été accepté au pas courant : on avance l'horloge de pas pour les connexions suivantes.
    ctx.repository.users.get("adm")!.lastStep = totpStepAt(Date.now()) - 2;
    const challenge = async () =>
      ((await ctx.login.execute({ tenantId: null, email: "adm@example.com", password: PASSWORD })) as { challengeToken: string })
        .challengeToken;
    return { ctx, recoveryCodes, challenge };
  }

  it("délivre les jetons avec un code TOTP valide, et refuse le défi réutilisé", async () => {
    const { ctx, challenge } = await enrolledAdmin();
    const token = await challenge();
    await expect(ctx.verifyLogin.execute({ challengeToken: token, code: currentCode(ctx.repository, "adm") })).resolves.toEqual({
      accessToken: "access-adm",
      refreshToken: "refresh",
    });
    await expect(ctx.verifyLogin.execute({ challengeToken: token, code: currentCode(ctx.repository, "adm", 1) })).rejects.toMatchObject({
      code: "DEFI_2FA_INVALIDE",
    });
  });

  it("refuse un code rejoué sur un nouveau défi (même pas de temps)", async () => {
    const { ctx, challenge } = await enrolledAdmin();
    const code = currentCode(ctx.repository, "adm");
    await ctx.verifyLogin.execute({ challengeToken: await challenge(), code });
    await expect(ctx.verifyLogin.execute({ challengeToken: await challenge(), code })).rejects.toMatchObject({
      code: "CODE_2FA_INVALIDE",
    });
  });

  it("accepte la dérive de ±1 pas et refuse ±2", async () => {
    const { ctx, challenge } = await enrolledAdmin();
    await expect(
      ctx.verifyLogin.execute({ challengeToken: await challenge(), code: currentCode(ctx.repository, "adm", -1) }),
    ).resolves.toHaveProperty("accessToken");
    ctx.repository.users.get("adm")!.lastStep = totpStepAt(Date.now()) - 5;
    await expect(
      ctx.verifyLogin.execute({ challengeToken: await challenge(), code: currentCode(ctx.repository, "adm", 2) }),
    ).rejects.toMatchObject({ code: "CODE_2FA_INVALIDE" });
    await expect(
      ctx.verifyLogin.execute({ challengeToken: await challenge(), code: currentCode(ctx.repository, "adm", -2) }),
    ).rejects.toMatchObject({ code: "CODE_2FA_INVALIDE" });
  });

  it("verrouille après 5 mauvais codes : même le bon code est refusé, puis le verrou expire", async () => {
    const { ctx, challenge } = await enrolledAdmin();
    const token = await challenge();
    for (let i = 0; i < 4; i += 1) {
      await expect(ctx.verifyLogin.execute({ challengeToken: token, code: "000000" })).rejects.toMatchObject({ code: "CODE_2FA_INVALIDE" });
    }
    await expect(ctx.verifyLogin.execute({ challengeToken: token, code: "000000" })).rejects.toMatchObject({
      code: "VERIFICATION_2FA_VERROUILLEE",
    });
    const good = currentCode(ctx.repository, "adm");
    await expect(ctx.verifyLogin.execute({ challengeToken: token, code: good })).rejects.toMatchObject({
      code: "VERIFICATION_2FA_VERROUILLEE",
    });

    // 16 minutes plus tard : le verrou est levé (le compteur est reparti de zéro).
    const user = ctx.repository.users.get("adm")!;
    user.lockedUntil = new Date(Date.now() - 1000);
    await expect(ctx.verifyLogin.execute({ challengeToken: token, code: good })).resolves.toHaveProperty("accessToken");
    expect(user.failedAttempts).toBe(0);
  });

  it("un succès remet le compteur d'échecs à zéro", async () => {
    const { ctx, challenge } = await enrolledAdmin();
    const token = await challenge();
    await expect(ctx.verifyLogin.execute({ challengeToken: token, code: "000000" })).rejects.toThrow();
    expect(ctx.repository.users.get("adm")!.failedAttempts).toBe(1);
    await ctx.verifyLogin.execute({ challengeToken: token, code: currentCode(ctx.repository, "adm") });
    expect(ctx.repository.users.get("adm")!.failedAttempts).toBe(0);
  });

  it("un code de récupération fonctionne UNE fois (insensible à la casse et au tiret) et est tracé", async () => {
    const { ctx, recoveryCodes, challenge } = await enrolledAdmin();
    const code = recoveryCodes[0]!;
    await expect(
      ctx.verifyLogin.execute({ challengeToken: await challenge(), code: code.toLowerCase().replace("-", " ") }),
    ).resolves.toHaveProperty("accessToken");
    expect(ctx.events.map((e) => e.name)).toContain("auth.two-factor-recovery-used");
    await expect(ctx.verifyLogin.execute({ challengeToken: await challenge(), code })).rejects.toMatchObject({
      code: "CODE_2FA_INVALIDE",
    });
    // Un autre code reste valable.
    await expect(ctx.verifyLogin.execute({ challengeToken: await challenge(), code: recoveryCodes[1]! })).resolves.toHaveProperty("accessToken");
  });

  it("refuse un code de récupération inventé et compte l'échec", async () => {
    const { ctx, challenge } = await enrolledAdmin();
    await expect(ctx.verifyLogin.execute({ challengeToken: await challenge(), code: "ABCDE-FGH23" })).rejects.toMatchObject({
      code: "CODE_2FA_INVALIDE",
    });
    expect(ctx.repository.users.get("adm")!.failedAttempts).toBe(1);
  });

  it("refuse si le compte a été suspendu entre le mot de passe et le code", async () => {
    const { ctx, challenge } = await enrolledAdmin();
    const token = await challenge();
    ctx.repository.users.get("adm")!.status = "SUSPENDED";
    await expect(ctx.verifyLogin.execute({ challengeToken: token, code: currentCode(ctx.repository, "adm") })).rejects.toThrow();
  });
});

describe("désactivation, régénération, état", () => {
  it("refuse la désactivation d'un compte soumis à l'obligation (admin et propriétaire)", async () => {
    const ctx = await setup();
    ctx.addUser({ id: "adm" });
    ctx.addUser({ id: "own", type: "COMPANY_USER", tenantId: "t1", roles: ["Propriétaire d'entreprise"] });
    for (const id of ["adm", "own"]) {
      await enrollUser(ctx, id);
      ctx.repository.users.get(id)!.lastStep = totpStepAt(Date.now()) - 2;
      await expect(ctx.disable.execute({ userId: id, password: PASSWORD, code: currentCode(ctx.repository, id) })).rejects.toMatchObject({
        code: "2FA_OBLIGATOIRE",
      });
      expect(ctx.repository.users.get(id)!.twoFactorEnabled).toBe(true);
    }
  });

  it("permet à un apprenant de désactiver (mot de passe + code), puis efface secret et codes", async () => {
    const ctx = await setup();
    ctx.addUser({ id: "l", type: "LEARNER", tenantId: "t1", roles: ["Apprenant"] });
    await enrollUser(ctx, "l");
    ctx.repository.users.get("l")!.lastStep = totpStepAt(Date.now()) - 2;
    await expect(ctx.disable.execute({ userId: "l", password: "wrong-password", code: currentCode(ctx.repository, "l") })).rejects.toMatchObject({
      code: "IDENTIFIANTS_INVALIDES",
    });
    await expect(ctx.disable.execute({ userId: "l", password: PASSWORD, code: "000000" })).rejects.toMatchObject({ code: "CODE_2FA_INVALIDE" });
    await ctx.disable.execute({ userId: "l", password: PASSWORD, code: currentCode(ctx.repository, "l") });
    const user = ctx.repository.users.get("l")!;
    expect(user.twoFactorEnabled).toBe(false);
    expect(user.twoFactorSecretEncrypted).toBeNull();
    expect(ctx.repository.codes.size).toBe(0);
    expect(ctx.events.map((e) => e.name)).toContain("auth.two-factor-disabled");
    await expect(ctx.disable.execute({ userId: "l", password: PASSWORD, code: "123456" })).rejects.toMatchObject({ code: "2FA_NON_ACTIVEE" });
  });

  it("régénère les codes : les anciens sont invalidés, mot de passe et code requis", async () => {
    const ctx = await setup();
    ctx.addUser({ id: "adm" });
    const oldCodes = await enrollUser(ctx, "adm");
    ctx.repository.users.get("adm")!.lastStep = totpStepAt(Date.now()) - 2;

    await expect(ctx.regenerate.execute({ userId: "adm", password: "wrong-password", code: currentCode(ctx.repository, "adm") })).rejects.toMatchObject({
      code: "IDENTIFIANTS_INVALIDES",
    });
    const { recoveryCodes } = await ctx.regenerate.execute({ userId: "adm", password: PASSWORD, code: currentCode(ctx.repository, "adm") });
    expect(recoveryCodes).toHaveLength(8);
    expect(recoveryCodes.some((c) => oldCodes.includes(c))).toBe(false);

    const challenge = (await ctx.challenges.issue("adm", "VERIFY")).challengeToken;
    await expect(ctx.verifyLogin.execute({ challengeToken: challenge, code: oldCodes[0]! })).rejects.toMatchObject({ code: "CODE_2FA_INVALIDE" });
    await expect(ctx.verifyLogin.execute({ challengeToken: challenge, code: recoveryCodes[0]! })).resolves.toHaveProperty("accessToken");
  });

  it("rapporte l'état : activé, obligatoire, codes restants", async () => {
    const ctx = await setup();
    ctx.addUser({ id: "adm" });
    expect(await ctx.status.execute("adm")).toEqual({ enabled: false, required: true, recoveryCodesRemaining: 0 });
    await enrollUser(ctx, "adm");
    expect(await ctx.status.execute("adm")).toEqual({ enabled: true, required: true, recoveryCodesRemaining: 8 });
  });
});

describe("réinitialisation par un administrateur", () => {
  it("efface la 2FA de la cible, révoque ses sessions et journalise l'acteur", async () => {
    const ctx = await setup();
    ctx.addUser({ id: "actor" });
    ctx.addUser({ id: "target" });
    await enrollUser(ctx, "target");
    await ctx.reset.execute({ targetUserId: "target", actorUserId: "actor" });
    const target = ctx.repository.users.get("target")!;
    expect(target.twoFactorEnabled).toBe(false);
    expect(target.twoFactorSecretEncrypted).toBeNull();
    expect(ctx.repository.codes.size).toBe(0);
    expect(ctx.revokeAllRefreshTokens).toHaveBeenCalledWith("target");
    expect(ctx.events.find((e) => e.name === "auth.two-factor-reset")?.payload).toMatchObject({ targetUserId: "target", actorId: "actor" });
    // À la prochaine connexion, l'enrôlement est de nouveau exigé.
    expect(await ctx.login.execute({ tenantId: null, email: "target@example.com", password: PASSWORD })).toMatchObject({ twoFactor: "ENROLL" });
  });

  it("refuse de se réinitialiser soi-même et de cibler un compte non plateforme ou inconnu", async () => {
    const ctx = await setup();
    ctx.addUser({ id: "actor" });
    ctx.addUser({ id: "own", type: "COMPANY_USER", tenantId: "t1" });
    await expect(ctx.reset.execute({ targetUserId: "actor", actorUserId: "actor" })).rejects.toMatchObject({
      code: "REINITIALISATION_2FA_INTERDITE",
    });
    await expect(ctx.reset.execute({ targetUserId: "own", actorUserId: "actor" })).rejects.toThrow();
    await expect(ctx.reset.execute({ targetUserId: "ghost", actorUserId: "actor" })).rejects.toThrow();
    expect(ctx.revokeAllRefreshTokens).not.toHaveBeenCalled();
  });

  it("ADM-06 : avec un périmètre entreprise, ne réinitialise que les comptes internes de ce tenant", async () => {
    const ctx = await setup();
    ctx.addUser({ id: "actor" });
    ctx.addUser({ id: "own", type: "COMPANY_USER", tenantId: "t1", roles: ["Propriétaire d'entreprise"] });
    ctx.addUser({ id: "other", type: "COMPANY_USER", tenantId: "t2" });
    ctx.addUser({ id: "adm2" });
    await enrollUser(ctx, "own");

    await expect(ctx.reset.execute({ targetUserId: "other", actorUserId: "actor", scopeTenantId: "t1" })).rejects.toThrow();
    await expect(ctx.reset.execute({ targetUserId: "adm2", actorUserId: "actor", scopeTenantId: "t1" })).rejects.toThrow();
    expect(ctx.revokeAllRefreshTokens).not.toHaveBeenCalled();

    await ctx.reset.execute({ targetUserId: "own", actorUserId: "actor", scopeTenantId: "t1" });
    expect(ctx.repository.users.get("own")!.twoFactorEnabled).toBe(false);
    expect(ctx.revokeAllRefreshTokens).toHaveBeenCalledWith("own");
  });
});
