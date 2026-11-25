import type { PrismaClient } from "@prisma/client";

import {
  PLATFORM_SUPER_ADMIN_PERMISSION_CODES,
  PLATFORM_SUPER_ADMIN_ROLE_NAME,
} from "../src/modules/users/domain/default-platform-roles";
import { DEFAULT_TENANT_ROLES } from "../src/modules/users/domain/default-tenant-roles";

export interface RoleSyncReport {
  rolesCreated: number;
  permissionLinksAdded: number;
}

/** Garantit l'existence des lignes `Permission` (idempotent, clé unique `code`) et retourne leurs ids. */
async function ensurePermissions(
  prisma: PrismaClient,
  codes: readonly string[],
  scope: "PLATFORM" | "TENANT",
): Promise<string[]> {
  const ids: string[] = [];
  for (const code of codes) {
    const permission = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, scope, description: code },
    });
    ids.push(permission.id);
  }
  return ids;
}

/** Ajoute uniquement les liens rôle -> permission manquants ; ne retire jamais rien (personnalisations préservées). */
async function addMissingLinks(prisma: PrismaClient, roleId: string, permissionIds: string[]): Promise<number> {
  const existing = await prisma.rolePermission.findMany({ where: { roleId }, select: { permissionId: true } });
  const have = new Set(existing.map((link) => link.permissionId));
  const missing = permissionIds.filter((id) => !have.has(id));
  if (missing.length > 0) {
    await prisma.rolePermission.createMany({
      data: missing.map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    });
  }
  return missing.length;
}

/** Rôle plateforme Super Administrateur : création si absent + permissions manquantes. */
export async function syncPlatformRoles(prisma: PrismaClient): Promise<RoleSyncReport> {
  const report: RoleSyncReport = { rolesCreated: 0, permissionLinksAdded: 0 };
  const permissionIds = await ensurePermissions(prisma, PLATFORM_SUPER_ADMIN_PERMISSION_CODES, "PLATFORM");

  let role = await prisma.role.findFirst({ where: { tenantId: null, name: PLATFORM_SUPER_ADMIN_ROLE_NAME } });
  if (!role) {
    role = await prisma.role.create({
      data: { tenantId: null, scope: "PLATFORM", name: PLATFORM_SUPER_ADMIN_ROLE_NAME, isDefault: true },
    });
    report.rolesCreated += 1;
  }
  report.permissionLinksAdded += await addMissingLinks(prisma, role.id, permissionIds);
  return report;
}

/** Rôles par défaut de chaque tenant existant : création si absents + permissions manquantes (jamais de retrait). */
export async function syncTenantRoles(prisma: PrismaClient): Promise<RoleSyncReport & { tenants: number }> {
  const report = { rolesCreated: 0, permissionLinksAdded: 0, tenants: 0 };
  const tenants = await prisma.tenant.findMany({ select: { id: true } });

  for (const tenant of tenants) {
    report.tenants += 1;
    for (const definition of DEFAULT_TENANT_ROLES) {
      const permissionIds = await ensurePermissions(prisma, definition.permissionCodes, "TENANT");
      let role = await prisma.role.findUnique({
        where: { tenantId_name: { tenantId: tenant.id, name: definition.name } },
      });
      if (!role) {
        role = await prisma.role.create({
          data: { tenantId: tenant.id, scope: "TENANT", name: definition.name, isDefault: true },
        });
        report.rolesCreated += 1;
      }
      report.permissionLinksAdded += await addMissingLinks(prisma, role.id, permissionIds);
    }
  }
  return report;
}
