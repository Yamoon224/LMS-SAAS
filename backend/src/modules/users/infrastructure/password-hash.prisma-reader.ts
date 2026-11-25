import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { PasswordHashReaderPort } from "../domain/password-hash-reader.port";

@Injectable()
export class PasswordHashPrismaReader implements PasswordHashReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async getPasswordHash(userId: string): Promise<string | null> {
    const record = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    return record?.passwordHash ?? null;
  }
}
