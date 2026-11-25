import type { RequestSurface } from "@shared/middleware/tenant-resolution.middleware";

/**
 * Augmente Express.Request avec les champs résolus par TenantResolutionMiddleware
 * et TenantGuard. Centralisé ici (plutôt que dans le middleware lui-même) pour
 * que la déclaration globale soit chargée de façon fiable par tsc, quel que
 * soit l'ordre d'inclusion des fichiers.
 */
declare global {
  namespace Express {
    interface Request {
      tenantSlug?: string;
      requestSurface?: RequestSurface;
      tenantId?: string;
    }
  }
}

export {};
