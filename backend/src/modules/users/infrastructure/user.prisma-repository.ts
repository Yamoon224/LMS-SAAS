import { Injectable } from "@nestjs/common";
import type { User as PrismaUser } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { UserStatus } from "../domain/user-status";
import { User } from "../domain/user.entity";
import type {
  CreateUserData,
  UpdateUserProfileData,
  UserRepositoryPort,
} from "../domain/user.repository.port";

type PrismaUserWithRoles = PrismaUser & { roles: { roleId: string }[] };

@Injectable()
export class UserPrismaRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { select: { roleId: true } } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByEmailInTenant(tenantId: string | null, email: string): Promise<User | null> {
    const record = await this.prisma.user.findFirst({
      where: { tenantId, email },
      include: { roles: { select: { roleId: true } } },
    });
    return record ? this.toDomain(record) : null;
  }

  async existsByEmailInTenant(tenantId: string | null, email: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { tenantId, email } });
    return count > 0;
  }

  async create(data: CreateUserData): Promise<User> {
    const record = await this.prisma.user.create({
      data: {
        tenantId: data.tenantId,
        type: data.type,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        locale: data.locale,
        ...(data.passwordHash
          ? { status: "ACTIVE" as const, passwordHash: data.passwordHash, emailVerifiedAt: new Date() }
          : { status: "INVITED" as const }),
        roles: { create: data.roleIds.map((roleId) => ({ roleId })) },
      },
      include: { roles: { select: { roleId: true } } },
    });
    return this.toDomain(record);
  }

  async updateStatus(id: string, status: UserStatus): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { status } });
  }

  async updateProfile(id: string, data: UpdateUserProfileData): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        locale: data.locale,
      },
    });
  }

  async setPasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async assignRoles(id: string, roleIds: string[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: id, roleId })),
      }),
    ]);
  }

  async listByTenant(tenantId: string | null): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: { tenantId },
      include: { roles: { select: { roleId: true } } },
      orderBy: { createdAt: "desc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async findManyByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const records = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(ids)] } },
      include: { roles: { select: { roleId: true } } },
    });
    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: PrismaUserWithRoles): User {
    return User.fromPersistence({
      id: record.id,
      tenantId: record.tenantId,
      type: record.type,
      email: record.email,
      firstName: record.firstName,
      lastName: record.lastName,
      phone: record.phone,
      locale: record.locale,
      status: record.status as UserStatus,
      roleIds: record.roles.map((role) => role.roleId),
      createdAt: record.createdAt,
    });
  }
}
