import "server-only";

/**
 * Le backend détermine la surface (admin / api / business / learning) depuis `x-forwarded-host` puis `Host`
 * (TenantResolutionMiddleware). Le back-office Admin appelle l'API sous un autre hôte (ex. localhost:3001),
 * il doit donc annoncer explicitement `admin.<APP_BASE_DOMAIN>`. En production, un reverse proxy DOIT
 * écraser `X-Forwarded-Host` sur les requêtes entrantes : sinon un client pourrait forger une autre surface.
 */
export function adminSurfaceHeaders(): Record<string, string> {
  const baseDomain = process.env.NEXT_PUBLIC_APP_BASE_DOMAIN ?? "";
  if (!baseDomain) return {};
  const host = `admin.${baseDomain}`;
  return { Host: host, "X-Forwarded-Host": host };
}
