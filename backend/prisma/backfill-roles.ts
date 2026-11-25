import { PrismaClient } from "@prisma/client";

import { syncPlatformRoles, syncTenantRoles } from "./role-sync";

const prisma = new PrismaClient();

/**
 * Rattrapage idempotent des rôles par défaut : complète le Super Administrateur plateforme et
 * les rôles par défaut (Propriétaire, Gestionnaire, Formateur, Apprenant) de CHAQUE tenant existant.
 * N'ajoute que les rôles / liens de permission manquants, ne supprime ni ne modifie rien d'autre.
 * Usage: `pnpm db:backfill-roles`.
 */
async function main(): Promise<void> {
  const platform = await syncPlatformRoles(prisma);
  const tenants = await syncTenantRoles(prisma);
  // eslint-disable-next-line no-console
  console.log(
    `Backfill terminé. Plateforme: +${platform.rolesCreated} rôle(s), +${platform.permissionLinksAdded} lien(s). ` +
      `${tenants.tenants} tenant(s): +${tenants.rolesCreated} rôle(s), +${tenants.permissionLinksAdded} lien(s).`,
  );
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
