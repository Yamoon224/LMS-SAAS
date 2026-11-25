import { TenantsFacade } from "@modules/tenants/tenants.facade";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";
import { IS_PUBLIC_KEY } from "@shared/decorators/public.decorator";
import { TenantMismatchError, TenantNotResolvedError } from "@shared/errors";
import type { RequestSurface } from "@shared/middleware/tenant-resolution.middleware";

interface TenantAwareRequest {
  originalUrl?: string;
  url?: string;
  tenantSlug?: string;
  requestSurface?: RequestSurface;
  tenantId?: string;
  user?: AuthenticatedUser;
}

/** Premier segment de la route (après le préfixe global `/v1`): `business`, `public`, `admin`, `auth`... */
export function resolveRouteArea(requestUrl: string | undefined, apiPrefix: string): string {
  const path = (requestUrl ?? "").split("?")[0] ?? "";
  const segments = path.split("/").filter((segment) => segment.length > 0);
  if (segments[0] === apiPrefix) segments.shift();
  return (segments[0] ?? "").toLowerCase();
}

/** Zones de routes qui n'ont de sens que dans le contexte d'une entreprise résolue. */
const TENANT_SCOPED_AREAS = new Set(["business", "public"]);

/**
 * Enforces tenant isolation (BE-01): resolves the tenant from the sub-domain,
 * rejects the request if it is unknown, and rejects if the authenticated
 * user's JWT tenant claim does not match — making cross-tenant access
 * impossible regardless of what a caller puts in the URL or payload.
 *
 * Applied globally; routes under `admin`/`api` surfaces (no tenant slug)
 * skip tenant resolution, as do routes marked `@Public()` without a slug.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantsFacade: TenantsFacade,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantAwareRequest>();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const area = resolveRouteArea(request.originalUrl ?? request.url, process.env.API_PREFIX ?? "v1");

    if (request.requestSurface === "admin" || request.requestSurface === "api") {
      this.assertAllowedWithoutTenant(request, area, isPublic === true);
      return true;
    }

    if (!request.tenantSlug) {
      if (isPublic) return true;
      throw new TenantNotResolvedError("Impossible de résoudre l'entreprise depuis le sous-domaine.");
    }

    const tenant = await this.tenantsFacade.findActiveBySlug(request.tenantSlug);
    if (!tenant) {
      throw new TenantNotResolvedError(`Entreprise inconnue ou inactive: ${request.tenantSlug}`);
    }

    // Routes d'administration plateforme servies depuis un sous-domaine d'entreprise: refusées.
    if (area === "admin") {
      throw new TenantMismatchError("Les routes d'administration ne sont pas disponibles ici.");
    }

    this.assertTokenMatchesTenant(request.user, tenant.id);

    request.tenantId = tenant.id;
    return true;
  }

  /** Surfaces `admin`/`api`: aucune entreprise n'est résolue, seules les routes sans contexte tenant sont servies. */
  private assertAllowedWithoutTenant(request: TenantAwareRequest, area: string, isPublic: boolean): void {
    // Sans entreprise résolue, `request.tenantId` est indéfini: une route entreprise/apprenant
    // authentifiée exécuterait ses requêtes SANS filtre de tenant (le Host est choisi par le
    // client). On la refuse donc ici (les routes @Public gèrent elles-mêmes l'absence de tenant).
    if (TENANT_SCOPED_AREAS.has(area) && !isPublic) {
      throw new TenantNotResolvedError(
        "Cette route nécessite une entreprise: appelez-la depuis le sous-domaine de l'entreprise.",
      );
    }
    // Un jeton lié à une entreprise ne doit jamais servir sur les routes d'administration plateforme.
    if (area === "admin" && request.user?.tenantId) {
      throw new TenantMismatchError("Ce jeton n'est pas autorisé sur les routes d'administration.");
    }
  }

  /**
   * Jeton plateforme (tenantId nul) sur une route d'entreprise: refusé par défaut (comportement
   * conservateur, pas d'usurpation implicite de tenant). Sinon le tenant du jeton doit correspondre.
   */
  private assertTokenMatchesTenant(user: AuthenticatedUser | undefined, tenantId: string): void {
    if (user && (!user.tenantId || user.tenantId !== tenantId)) {
      throw new TenantMismatchError("Le jeton d'authentification ne correspond pas à l'entreprise appelée.");
    }
  }
}
