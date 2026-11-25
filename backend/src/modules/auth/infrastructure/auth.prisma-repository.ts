import { createHash } from "node:crypto";

import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import type { AuthRepositoryPort, AuthUserRecord } from "../domain/auth.repository.port";

export const USER_INCLUDE = {
  roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
} satisfies Prisma.UserInclude;

export function toAuthUserRecord(user: Prisma.UserGetPayload<{ include: typeof USER_INCLUDE }>): AuthUserRecord {
  const permissions = user.roles.flatMap((userRole) =>
    userRole.role.permissions.map((rolePermission) => rolePermission.permission.code),
  );
  return {
    id: user.id,
    tenantId: user.tenantId,
    type: user.type,
    email: user.email,
    passwordHash: user.passwordHash,
    status: user.status,
    roles: user.roles.map((userRole) => userRole.role.name),
    permissions: [...new Set(permissions)],
    twoFactorEnabled: user.twoFactorEnabled,
  };
}

@Injectable()
export class AuthPrismaRepository implements AuthRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(tenantId: string | null, email: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, email },
      include: USER_INCLUDE,
    });

    return user ? toAuthUserRecord(user) : null;
  }

  async findById(userId: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: USER_INCLUDE });
    return user ? toAuthUserRecord(user) : null;
  }

  /**
   * ADM: rafraîchissement silencieux du jeton d'accès (POST /auth/refresh).
   * On ne fait jamais confiance à un jeton d'accès potentiellement expiré
   * pour reconstruire le payload JWT ; on repart du jeton de rafraîchissement
   * (valide, non révoqué, non expiré) pour retrouver l'utilisateur et ses
   * permissions à jour.
   */
  async findByValidRefreshTokenHash(tokenHash: string): Promise<AuthUserRecord | null> {
    const token = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: {
        user: { include: USER_INCLUDE },
      },
    });

    return token ? toAuthUserRecord(token.user) : null;
  }

  async storeRefreshTokenHash(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  async isRefreshTokenValid(userId: string, tokenHash: string): Promise<boolean> {
    const token = await this.prisma.refreshToken.findFirst({
      where: { userId, tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    return token !== null;
  }

  async revokeRefreshToken(userId: string, tokenHash: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  static hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }
}
