import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

import { PLATFORM_SUPER_ADMIN_ROLE_NAME } from "../src/modules/users/domain/default-platform-roles";
import {
  TENANT_LEARNER_ROLE_NAME,
  TENANT_OWNER_ROLE_NAME,
} from "../src/modules/users/domain/default-tenant-roles";

import { syncPlatformRoles, syncTenantRoles } from "./role-sync";

const prisma = new PrismaClient();

/**
 * Jeu de données minimal pour démarrer en développement :
 * un rôle super admin plateforme + un compte Super Administrateur (section 2).
 */
async function main(): Promise<void> {
  // Rôle Super Administrateur + TOUTES ses permissions (idempotent, voir role-sync.ts).
  await syncPlatformRoles(prisma);
  const superAdminRole = await prisma.role.findFirstOrThrow({
    where: { tenantId: null, name: PLATFORM_SUPER_ADMIN_ROLE_NAME },
  });

  const passwordHash = await argon2.hash("ChangeMe123!");

  const existingAdmin = await prisma.user.findFirst({
    where: { tenantId: null, email: "admin@votredomaine.local" },
  });
  const superAdmin =
    existingAdmin ??
    (await prisma.user.create({
      data: {
        tenantId: null,
        type: "PLATFORM_ADMIN",
        email: "admin@votredomaine.local",
        passwordHash,
        firstName: "Super",
        lastName: "Admin",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        roles: { create: [{ roleId: superAdminRole.id }] },
      },
    }));

  // --- Entreprise de démo + un compte par interface (business, learning) ---
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Entreprise Démo", slug: "demo", status: "ACTIVE", contactEmail: "business@votredomaine.local" },
  });
  await syncTenantRoles(prisma);

  // Abonnement actif pour l'entreprise de démo (sans lui, les API tenant répondent 402 ABONNEMENT_REQUIS).
  const activeSub = await prisma.subscription.findFirst({ where: { tenantId: tenant.id, status: "ACTIVE" } });
  if (!activeSub) {
    const plan =
      (await prisma.plan.findFirst({ where: { name: "Démo" } })) ??
      (await prisma.plan.create({
        data: {
          name: "Démo",
          quotas: { maxCourses: 100, maxActiveLearners: 1000, maxManagers: 20, storageGb: 50, liveSessionsPerMonth: 50 },
          features: { aiTranslation: true, customCertificates: true, customDomain: false },
        },
      }));
    const price = await prisma.planPrice.create({ data: { planId: plan.id, period: "YEARLY", amount: 0 } });
    await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planPriceId: price.id,
        status: "ACTIVE",
        startedAt: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });
  }

  const ensureTenantUser = async (
    email: string,
    type: "COMPANY_USER" | "LEARNER",
    roleName: string,
    firstName: string,
    lastName: string,
  ): Promise<void> => {
    const exists = await prisma.user.findFirst({ where: { tenantId: tenant.id, email } });
    if (exists) return;
    const role = await prisma.role.findUniqueOrThrow({
      where: { tenantId_name: { tenantId: tenant.id, name: roleName } },
    });
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        type,
        email,
        passwordHash,
        firstName,
        lastName,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        roles: { create: [{ roleId: role.id }] },
      },
    });
  };
  await ensureTenantUser("business@votredomaine.local", "COMPANY_USER", TENANT_OWNER_ROLE_NAME, "Marie", "Entreprise");
  await ensureTenantUser("learner@votredomaine.local", "LEARNER", TENANT_LEARNER_ROLE_NAME, "Paul", "Apprenant");

  // eslint-disable-next-line no-console
  console.log(`Seed terminé. Compte admin: ${superAdmin.email} / mot de passe: ChangeMe123!
business@votredomaine.local, learner@votredomaine.local (tenant "demo", même mot de passe)`);
}

main()
  .catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
