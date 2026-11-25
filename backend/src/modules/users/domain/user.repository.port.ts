import type { UserType } from "@shared/domain/user-type";

import type { UserStatus } from "./user-status";
import type { User } from "./user.entity";

export interface CreateUserData {
  tenantId: string | null;
  type: UserType;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  locale: string;
  roleIds: string[];
  /** Si fourni (hash argon2), le compte est créé ACTIF avec e-mail vérifié (pas d'invitation). */
  passwordHash?: string;
}

export interface UpdateUserProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  locale?: string;
}

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  findByEmailInTenant(tenantId: string | null, email: string): Promise<User | null>;
  existsByEmailInTenant(tenantId: string | null, email: string): Promise<boolean>;
  create(data: CreateUserData): Promise<User>;
  updateStatus(id: string, status: UserStatus): Promise<void>;
  updateProfile(id: string, data: UpdateUserProfileData): Promise<void>;
  setPasswordHash(id: string, passwordHash: string): Promise<void>;
  assignRoles(id: string, roleIds: string[]): Promise<void>;
  listByTenant(tenantId: string | null): Promise<User[]>;
  /** Une seule requête pour N utilisateurs (ids inconnus simplement absents du résultat). */
  findManyByIds(ids: string[]): Promise<User[]>;
}

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");
