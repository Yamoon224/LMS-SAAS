import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import type {
  InvitationTokenRecord,
  InvitationTokenRepositoryPort,
} from "../domain/invitation-token.repository.port";

@Injectable()
export class InvitationTokenPrismaRepository implements InvitationTokenRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.prisma.invitationToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  async findValidByHash(tokenHash: string): Promise<InvitationTokenRecord | null> {
    const record = await this.prisma.invitationToken.findUnique({ where: { tokenHash } });
    if (!record) return null;

    return {
      userId: record.userId,
      tokenHash: record.tokenHash,
      expiresAt: record.expiresAt,
      consumedAt: record.consumedAt,
    };
  }

  async consume(tokenHash: string): Promise<void> {
    await this.prisma.invitationToken.update({
      where: { tokenHash },
      data: { consumedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.invitationToken.deleteMany({
      where: { userId, consumedAt: null },
    });
  }
}
