import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { ChallengePurpose } from "../domain/two-factor.policy";
import type {
  ChallengeRecord,
  RecoveryCodeRecord,
  TwoFactorRepositoryPort,
  TwoFactorUserRecord,
} from "../domain/two-factor.repository.port";

import { toAuthUserRecord, USER_INCLUDE } from "./auth.prisma-repository";

@Injectable()
export class TwoFactorPrismaRepository implements TwoFactorRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findUser(userId: string): Promise<TwoFactorUserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: USER_INCLUDE });
    if (!user) return null;
    return {
      ...toAuthUserRecord(user),
      twoFactorSecretEncrypted: user.twoFactorSecret,
      lastStep: user.twoFactorLastStep,
      failedAttempts: user.twoFactorFailedAttempts,
      lockedUntil: user.twoFactorLockedUntil,
    };
  }

  async savePendingSecret(userId: string, encryptedSecret: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: encryptedSecret, twoFactorEnabled: false, twoFactorLastStep: null },
    });
  }

  async enable(userId: string, lastStep: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorEnabledAt: new Date(),
        twoFactorLastStep: lastStep,
        twoFactorFailedAttempts: 0,
        twoFactorLockedUntil: null,
      },
    });
  }

  async disable(userId: string): Promise<void> {
    await this.resetAll(userId);
  }

  async resetAll(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorSecret: null,
          twoFactorEnabled: false,
          twoFactorEnabledAt: null,
          twoFactorLastStep: null,
          twoFactorFailedAttempts: 0,
          twoFactorLockedUntil: null,
        },
      }),
      this.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
      this.prisma.twoFactorChallenge.deleteMany({ where: { userId } }),
    ]);
  }

  async replaceRecoveryCodes(userId: string, codeHashes: string[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
      this.prisma.twoFactorRecoveryCode.createMany({ data: codeHashes.map((codeHash) => ({ userId, codeHash })) }),
    ]);
  }

  async listUnusedRecoveryCodes(userId: string): Promise<RecoveryCodeRecord[]> {
    const rows = await this.prisma.twoFactorRecoveryCode.findMany({
      where: { userId, usedAt: null },
      select: { id: true, codeHash: true },
    });
    return rows;
  }

  async consumeRecoveryCode(codeId: string): Promise<boolean> {
    const result = await this.prisma.twoFactorRecoveryCode.updateMany({
      where: { id: codeId, usedAt: null },
      data: { usedAt: new Date() },
    });
    return result.count === 1;
  }

  async acceptStep(userId: string, step: number): Promise<boolean> {
    const result = await this.prisma.user.updateMany({
      where: { id: userId, OR: [{ twoFactorLastStep: null }, { twoFactorLastStep: { lt: step } }] },
      data: { twoFactorLastStep: step },
    });
    return result.count === 1;
  }

  async registerFailure(userId: string, maxAttempts: number, lockUntil: Date): Promise<Date | null> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorFailedAttempts: { increment: 1 } },
      select: { twoFactorFailedAttempts: true },
    });
    if (user.twoFactorFailedAttempts < maxAttempts) return null;
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorFailedAttempts: 0, twoFactorLockedUntil: lockUntil },
    });
    return lockUntil;
  }

  async resetFailures(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorFailedAttempts: 0, twoFactorLockedUntil: null },
    });
  }

  async createChallenge(
    userId: string,
    purpose: ChallengePurpose,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.twoFactorChallenge.create({ data: { userId, purpose, tokenHash, expiresAt } });
  }

  async findActiveChallenge(tokenHash: string, now: Date): Promise<ChallengeRecord | null> {
    const row = await this.prisma.twoFactorChallenge.findFirst({
      where: { tokenHash, consumedAt: null, expiresAt: { gt: now } },
    });
    if (!row) return null;
    return { id: row.id, userId: row.userId, purpose: row.purpose as ChallengePurpose };
  }

  async consumeChallenge(challengeId: string): Promise<boolean> {
    const result = await this.prisma.twoFactorChallenge.updateMany({
      where: { id: challengeId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return result.count === 1;
  }

  async deleteChallenges(userId: string): Promise<void> {
    await this.prisma.twoFactorChallenge.deleteMany({ where: { userId } });
  }
}
