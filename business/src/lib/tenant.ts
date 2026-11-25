import "server-only";

import { headers } from "next/headers";

/**
 * Suffixe des sous-domaines back-office entreprise, ex. "acme-backoffice".
 * Doit rester synchronisé avec BACKOFFICE_SUFFIX côté backend
 * (backend/src/shared/constants/reserved-slugs.ts).
 */
export const BACKOFFICE_SUFFIX = "-backoffice";

/** Header interne (middleware -> reste de l'app) portant le slug résolu. */
export const TENANT_SLUG_HEADER = "x-tenant-slug";

/**
 * Domaine de base utilisé pour reconstruire le `Host` envoyé au backend
 * NestJS. Le backend résout le tenant depuis le `Host` de la requête HTTP
 * qu'il reçoit (TenantResolutionMiddleware) — pas depuis un paramètre
 * explicite. Ce proxy doit donc *simuler* le sous-domaine attendu par le
 * backend, même quand Next.js tourne derrière un `Host` différent (ex. appel
 * interne vers `localhost:3001`).
 *
 * En local, le backend et le frontend partagent le même APP_BASE_DOMAIN
 * (voir .env.example des deux apps: "votredomaine.local"), donc le header
 * reçu par ce proxy (ex. "acme-backoffice.votredomaine.local:3000") est déjà
 * dans un format que le backend accepte une fois le port retiré.
 */
export function getAppBaseDomain(): string {
  return process.env.NEXT_PUBLIC_APP_BASE_DOMAIN ?? "";
}

/**
 * Résout le slug tenant depuis le header interne posé par le middleware.
 * Renvoie `undefined` si aucun sous-domaine `{slug}-backoffice.*` n'a été
 * reconnu (ex. accès direct via "localhost:3000" en développement — voir le
 * README pour la configuration du fichier hosts nécessaire pour tester le
 * multi-tenant en local).
 */
export async function getResolvedTenantSlug(): Promise<string | undefined> {
  const headerList = await headers();
  return headerList.get(TENANT_SLUG_HEADER) ?? undefined;
}

/**
 * Reconstruit le `Host` à envoyer au backend pour qu'il résolve le même
 * tenant que celui résolu par le middleware Next.js, à partir du slug et du
 * domaine de base — indépendamment du host réel utilisé pour joindre l'API
 * (ex. "api.votredomaine.local" ou "localhost:3001").
 */
export function buildBackendHostHeader(tenantSlug: string): string {
  const baseDomain = getAppBaseDomain();
  return `${tenantSlug}${BACKOFFICE_SUFFIX}.${baseDomain}`;
}
